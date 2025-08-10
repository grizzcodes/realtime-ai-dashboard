// backend/test-action-items.js
// Debug script specifically for parsing action items from Fireflies
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function debugActionItems() {
  try {
    console.log('🔍 Debugging Fireflies Action Items Parsing...\n');
    
    // Get the fireflies-ai channel
    const privateChannels = await slack.conversations.list({
      exclude_archived: true,
      types: 'private_channel',
      limit: 200
    });
    
    const channel = privateChannels.channels.find(c => c.name === 'fireflies-ai');
    
    if (!channel) {
      console.log('❌ Channel fireflies-ai not found');
      return;
    }
    
    console.log(`✅ Found channel: #fireflies-ai\n`);
    
    // Get recent messages
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 10
    });
    
    // Find a message with action items
    for (const message of messagesResult.messages) {
      if (message.bot_id && message.blocks) {
        let hasActionItems = false;
        
        // Check if message has action items
        for (const block of message.blocks) {
          if (block.type === 'section' && block.text?.text?.includes('*Action Items:*')) {
            hasActionItems = true;
            break;
          }
        }
        
        if (hasActionItems) {
          console.log('=' .repeat(80));
          console.log('FOUND MESSAGE WITH ACTION ITEMS');
          console.log('=' .repeat(80));
          
          // Extract meeting title
          const titleBlock = message.blocks.find(b => 
            b.type === 'section' && b.text?.text?.includes('*Title:')
          );
          if (titleBlock) {
            const titleMatch = titleBlock.text.text.match(/\|([^>]+)>/);
            console.log(`\n📅 Meeting: ${titleMatch ? titleMatch[1] : 'Unknown'}`);
          }
          
          console.log('\n🎯 ACTION ITEMS BLOCKS:');
          console.log('-'.repeat(40));
          
          let isInActionSection = false;
          let currentPerson = null;
          const actionItems = [];
          
          // Process blocks sequentially
          for (let i = 0; i < message.blocks.length; i++) {
            const block = message.blocks[i];
            
            // Check if we're entering action items section
            if (block.type === 'section' && block.text?.text?.includes('*Action Items:*')) {
              isInActionSection = true;
              console.log('\n✓ Found Action Items header');
              continue;
            }
            
            // If we're in action section
            if (isInActionSection) {
              // Check for divider (end of action section)
              if (block.type === 'divider') {
                console.log('\n✓ Found divider - end of action items');
                break;
              }
              
              // Check for person name (section block with name pattern)
              if (block.type === 'section' && block.text?.text) {
                // Try to match person name pattern
                const text = block.text.text.trim();
                
                // Various patterns for names
                const patterns = [
                  /^\*([^:*]+):\*$/,           // *Name:*
                  /^\*([^:*]+):\*\s*$/,        // *Name:* with trailing space
                  /^([^:]+):$/,                // Name:
                ];
                
                let nameMatch = null;
                for (const pattern of patterns) {
                  nameMatch = text.match(pattern);
                  if (nameMatch) break;
                }
                
                if (nameMatch || (text.includes(':') && !text.includes('*Action Items'))) {
                  currentPerson = nameMatch ? nameMatch[1].trim() : text.replace(/[*:]/g, '').trim();
                  console.log(`\n👤 Person: ${currentPerson}`);
                  console.log(`   Raw text: "${text}"`);
                }
              }
              
              // Check for actions block (contains the actual tasks)
              if (block.type === 'actions' && block.elements) {
                console.log(`   Actions block found with ${block.elements.length} elements`);
                
                const tasks = [];
                block.elements.forEach((element, idx) => {
                  console.log(`   Element ${idx}: type=${element.type}`);
                  
                  if (element.type === 'button' && element.text) {
                    const taskText = element.text.text || element.text.value || '';
                    console.log(`     - Button text: "${taskText}"`);
                    
                    if (taskText.trim()) {
                      tasks.push(taskText.trim());
                    }
                  } else if (element.text) {
                    console.log(`     - Other element text: "${element.text}"`);
                  }
                });
                
                if (currentPerson && tasks.length > 0) {
                  actionItems.push({
                    assignee: currentPerson,
                    tasks: tasks
                  });
                }
              }
            }
          }
          
          // Display parsed action items
          console.log('\n' + '=' .repeat(80));
          console.log('PARSED ACTION ITEMS:');
          console.log('=' .repeat(80));
          
          if (actionItems.length > 0) {
            actionItems.forEach(item => {
              console.log(`\n${item.assignee}:`);
              item.tasks.forEach(task => {
                console.log(`  ✓ ${task}`);
              });
            });
            
            const totalTasks = actionItems.reduce((sum, item) => sum + item.tasks.length, 0);
            console.log(`\n📊 Total: ${totalTasks} tasks for ${actionItems.length} people`);
          } else {
            console.log('❌ No action items could be parsed');
            
            // Show all blocks for debugging
            console.log('\nDEBUG - All blocks in action section:');
            let inAction = false;
            message.blocks.forEach((block, i) => {
              if (block.text?.text?.includes('*Action Items:*')) {
                inAction = true;
              }
              if (inAction) {
                console.log(`\nBlock ${i} (${block.type}):`);
                if (block.text) {
                  console.log(`  Text: "${block.text.text?.substring(0, 100)}"`);
                }
                if (block.elements) {
                  console.log(`  Elements: ${block.elements.length}`);
                  block.elements.forEach((el, j) => {
                    console.log(`    ${j}: ${el.type} - ${el.text?.text || el.text || 'no text'}`);
                  });
                }
              }
              if (inAction && block.type === 'divider') {
                inAction = false;
              }
            });
          }
          
          console.log('\n' + '=' .repeat(80));
          
          // Only process first message with action items
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
debugActionItems().then(() => {
  console.log('\n✨ Debug complete');
});
