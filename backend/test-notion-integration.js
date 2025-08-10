// backend/test-notion-integration.js
// Test Notion integration and debug issues

require('dotenv').config();
const { Client } = require('@notionhq/client');

async function testNotionIntegration() {
  console.log('🔍 Testing Notion Integration\n');
  console.log('=====================================\n');
  
  // Check environment variables
  console.log('1️⃣ Checking environment variables...');
  const hasApiKey = !!process.env.NOTION_API_KEY;
  const hasDatabaseId = !!process.env.NOTION_DATABASE_ID;
  
  console.log(`  NOTION_API_KEY: ${hasApiKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`  NOTION_DATABASE_ID: ${hasDatabaseId ? '✅ Present' : '❌ Missing'}`);
  
  if (hasApiKey) {
    console.log(`    Key format: ${process.env.NOTION_API_KEY.substring(0, 10)}...`);
  }
  if (hasDatabaseId) {
    console.log(`    Database ID: ${process.env.NOTION_DATABASE_ID}`);
  }
  
  if (!hasApiKey || !hasDatabaseId) {
    console.log('\n❌ Missing required environment variables!');
    console.log('Add to your .env file:');
    console.log('  NOTION_API_KEY=ntn_...');
    console.log('  NOTION_DATABASE_ID=4edf1722-ef48-4cbc-988d-ed770d281f9b');
    return;
  }
  
  // Test Notion API connection
  console.log('\n2️⃣ Testing Notion API connection...');
  
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    // Test 1: Check if we can authenticate
    const user = await notion.users.me();
    console.log('  ✅ API authentication successful!');
    console.log(`    Bot type: ${user.type}`);
    console.log(`    Bot ID: ${user.id}`);
    
    // Test 2: Try to access the database
    console.log('\n3️⃣ Testing database access...');
    
    try {
      const database = await notion.databases.retrieve({
        database_id: process.env.NOTION_DATABASE_ID
      });
      
      console.log('  ✅ Database access successful!');
      console.log(`    Database title: ${database.title[0]?.plain_text || 'Untitled'}`);
      console.log(`    Properties: ${Object.keys(database.properties).join(', ')}`);
      
      // Check for required properties
      const requiredProps = ['Name', 'Status', 'Priority', 'Assigned'];
      const hasRequiredProps = requiredProps.filter(prop => 
        Object.keys(database.properties).some(p => p.toLowerCase() === prop.toLowerCase())
      );
      
      console.log(`\n  Required properties check:`);
      requiredProps.forEach(prop => {
        const exists = hasRequiredProps.includes(prop);
        console.log(`    ${prop}: ${exists ? '✅' : '⚠️  Missing'}`);
      });
      
    } catch (dbError) {
      console.log('  ❌ Database access failed!');
      console.log(`    Error: ${dbError.message}`);
      
      if (dbError.code === 'object_not_found') {
        console.log('\n  🔧 Fix: Database not shared with integration');
        console.log('    1. Open your Notion database');
        console.log('    2. Click "..." menu → "Add connections"');
        console.log('    3. Search and select your integration');
        console.log('    4. Click "Confirm"');
      } else if (dbError.code === 'validation_error') {
        console.log('\n  🔧 Fix: Invalid database ID format');
        console.log('    Current ID:', process.env.NOTION_DATABASE_ID);
        console.log('    Should be UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      }
      return;
    }
    
    // Test 3: Query tasks from database
    console.log('\n4️⃣ Testing task retrieval...');
    
    try {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        page_size: 5
      });
      
      console.log(`  ✅ Query successful! Found ${response.results.length} tasks`);
      
      if (response.results.length > 0) {
        console.log('\n  Sample task:');
        const task = response.results[0];
        const title = task.properties.Name?.title?.[0]?.plain_text || 
                     task.properties.Task?.title?.[0]?.plain_text || 
                     'No title';
        const status = task.properties.Status?.status?.name || 'No status';
        const assignee = task.properties.Assigned?.people?.[0]?.name || 
                        task.properties.Assignee?.people?.[0]?.name || 
                        'Unassigned';
        
        console.log(`    Title: ${title}`);
        console.log(`    Status: ${status}`);
        console.log(`    Assignee: ${assignee}`);
      } else {
        console.log('  ℹ️  Database is empty - add some tasks to test');
      }
      
    } catch (queryError) {
      console.log('  ❌ Query failed!');
      console.log(`    Error: ${queryError.message}`);
    }
    
    // Test 4: Test the API endpoints
    console.log('\n5️⃣ Testing API endpoints...');
    
    const fetch = require('node-fetch');
    
    // Test GET tasks
    try {
      const getResponse = await fetch('http://localhost:3001/api/notion/tasks');
      const getTasks = await getResponse.json();
      
      if (getTasks.success) {
        console.log(`  ✅ GET /api/notion/tasks: Working (${getTasks.tasks?.length || 0} tasks)`);
      } else {
        console.log(`  ❌ GET /api/notion/tasks: Failed - ${getTasks.error}`);
      }
    } catch (error) {
      console.log('  ⚠️  GET /api/notion/tasks: Server not running');
    }
    
    // Test POST task
    try {
      const testTask = {
        title: 'Test Task from Debug Script',
        assignee: 'Team',
        priority: 'Medium',
        dueDate: new Date().toISOString().split('T')[0]
      };
      
      const postResponse = await fetch('http://localhost:3001/api/notion/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testTask)
      });
      
      const result = await postResponse.json();
      
      if (result.success) {
        console.log(`  ✅ POST /api/notion/tasks: Working`);
        console.log(`    Created task with ID: ${result.task.id}`);
      } else {
        console.log(`  ❌ POST /api/notion/tasks: Failed - ${result.error}`);
      }
    } catch (error) {
      console.log('  ⚠️  POST /api/notion/tasks: Server not running');
    }
    
  } catch (error) {
    console.log('  ❌ Notion API connection failed!');
    console.log(`    Error: ${error.message}`);
    
    if (error.code === 'unauthorized') {
      console.log('\n  🔧 Fix: Invalid API key');
      console.log('    1. Go to https://www.notion.so/my-integrations');
      console.log('    2. Create or find your integration');
      console.log('    3. Copy the "Internal Integration Token"');
      console.log('    4. Update NOTION_API_KEY in .env');
    }
  }
  
  console.log('\n=====================================');
  console.log('📌 Summary:\n');
  
  console.log('If Notion tasks are not showing:');
  console.log('1. Ensure the database is shared with your integration');
  console.log('2. Check that Status property exists and has "Done" option');
  console.log('3. Verify the backend server is running');
  console.log('4. Check browser console for errors');
  console.log('\nIf pushing to Notion fails:');
  console.log('1. Check that all required properties exist in your database');
  console.log('2. Ensure the integration has write permissions');
  console.log('3. Check backend console for detailed error messages');
}

// Run the test
testNotionIntegration().catch(console.error);
