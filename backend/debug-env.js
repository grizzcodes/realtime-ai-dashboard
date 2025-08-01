// backend/debug-env.js - Environment Variable Debug Script
require('dotenv').config();

console.log('🔍 Environment Variable Debug Report');
console.log('=====================================');

// Check if .env file is being loaded
console.log('📁 Current working directory:', process.cwd());
console.log('📁 Node environment:', process.env.NODE_ENV || 'not set');

// Check for .env file existence (without revealing secrets)
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);
console.log('📄 .env file exists:', envExists);

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log('📋 .env file has', envLines.length, 'configuration lines');
  
  // Show which keys are present (without values)
  const envKeys = envLines.map(line => line.split('=')[0]).filter(key => key);
  console.log('🔑 Environment keys found in .env:', envKeys);
}

console.log('\n🔍 Environment Variable Check:');
console.log('==============================');

// Check each required environment variable (without revealing values)
const requiredVars = [
  'NOTION_API_KEY',
  'NOTION_DATABASE_ID',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FIREFLIES_API_KEY',
  'SLACK_BOT_TOKEN'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isSet = !!value;
  const length = value ? value.length : 0;
  const preview = value ? `${value.substring(0, 10)}...` : 'not set';
  
  console.log(`${isSet ? '✅' : '❌'} ${varName}: ${isSet ? `set (${length} chars)` : 'NOT SET'}`);
});

console.log('\n🧪 Testing Notion API Connection:');
console.log('=================================');

// Test Notion API specifically
const notionApiKey = process.env.NOTION_API_KEY;
const notionDbId = process.env.NOTION_DATABASE_ID;

if (!notionApiKey) {
  console.log('❌ NOTION_API_KEY is missing or empty');
  console.log('💡 Make sure your .env file contains: NOTION_API_KEY=ntn_...');
} else {
  console.log('✅ NOTION_API_KEY is present');
  
  if (!notionDbId) {
    console.log('❌ NOTION_DATABASE_ID is missing or empty');
    console.log('💡 Make sure your .env file contains: NOTION_DATABASE_ID=4edf1722-ef48-4cbc-988d-ed770d281f9b');
  } else {
    console.log('✅ NOTION_DATABASE_ID is present');
    
    // Test actual Notion connection
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: notionApiKey });
    
    (async () => {
      try {
        console.log('🔄 Testing Notion API connection...');
        const user = await notion.users.me();
        console.log('✅ Notion API connection successful!');
        console.log('👤 Connected as:', user.name || 'Unknown User');
        console.log('🆔 User ID:', user.id);
        
        // Test database access
        try {
          console.log('🔄 Testing database access...');
          const database = await notion.databases.retrieve({
            database_id: notionDbId
          });
          console.log('✅ Database access successful!');
          console.log('📋 Database name:', database.title[0]?.plain_text || 'Untitled');
          
          // Test query
          try {
            console.log('🔄 Testing database query...');
            const queryResult = await notion.databases.query({
              database_id: notionDbId,
              page_size: 1
            });
            console.log('✅ Database query successful!');
            console.log('📊 Found', queryResult.results.length, 'items in database');
          } catch (queryError) {
            console.log('❌ Database query failed:', queryError.message);
          }
          
        } catch (dbError) {
          console.log('❌ Database access failed:', dbError.message);
          if (dbError.code === 'object_not_found') {
            console.log('💡 Database not found. Check:');
            console.log('   1. Database ID is correct: 4edf1722-ef48-4cbc-988d-ed770d281f9b');
            console.log('   2. Integration has access to the database');
            console.log('   3. Visit https://www.notion.so/my-integrations to manage connections');
          }
        }
        
      } catch (apiError) {
        console.log('❌ Notion API connection failed:', apiError.message);
        if (apiError.code === 'unauthorized') {
          console.log('💡 API key is invalid. Check:');
          console.log('   1. Copy the key correctly from https://www.notion.so/my-integrations');
          console.log('   2. Make sure integration is active');
          console.log('   3. Key should start with "secret_" or "ntn_"');
        }
      }
    })();
  }
}

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Fix any missing environment variables shown above');
console.log('2. Restart your server: npm run dev');
console.log('3. Test the connection at: http://localhost:3002/api/health');
console.log('4. If still failing, check Notion integration permissions');
