// backend/debug-notion.js - Quick debug script
require('dotenv').config();

console.log('🔍 DEBUGGING NOTION SETUP');
console.log('========================');
console.log('NOTION_API_KEY present:', !!process.env.NOTION_API_KEY);
console.log('NOTION_API_KEY length:', process.env.NOTION_API_KEY?.length || 0);
console.log('NOTION_DATABASE_ID:', process.env.NOTION_DATABASE_ID);
console.log('');

if (!process.env.NOTION_API_KEY) {
  console.log('❌ NOTION_API_KEY is missing from .env file');
  console.log('Add: NOTION_API_KEY=secret_your_integration_token');
  process.exit(1);
}

if (!process.env.NOTION_DATABASE_ID) {
  console.log('❌ NOTION_DATABASE_ID is missing from .env file');
  console.log('Add: NOTION_DATABASE_ID=4edf1722-ef48-4cbc-988d-ed77-0d281f9b');
  process.exit(1);
}

// Test Notion connection
const { Client } = require('@notionhq/client');

async function testNotion() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    console.log('🧪 Testing Notion API connection...');
    const user = await notion.users.me();
    console.log('✅ API connection successful!');
    console.log('User:', user.name || user.id);

    console.log('');
    console.log('🧪 Testing database access...');
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    console.log('✅ Database access successful!');
    console.log('Database name:', database.title[0]?.plain_text || 'Untitled');
    console.log('Properties:', Object.keys(database.properties).join(', '));

    console.log('');
    console.log('🧪 Testing database query...');
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID
    });
    console.log('✅ Database query successful!');
    console.log('Found', response.results.length, 'pages');

    if (response.results.length > 0) {
      const firstPage = response.results[0];
      console.log('First page properties:', Object.keys(firstPage.properties).join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'unauthorized') {
      console.log('');
      console.log('🔧 FIX: Your API key is invalid');
      console.log('1. Go to https://www.notion.so/my-integrations');
      console.log('2. Create/find your integration');
      console.log('3. Copy the Internal Integration Token');
      console.log('4. Update NOTION_API_KEY in .env');
    }
    
    if (error.code === 'object_not_found') {
      console.log('');
      console.log('🔧 FIX: Database not found or not shared');
      console.log('1. Check Database ID:', process.env.NOTION_DATABASE_ID);
      console.log('2. Open your Notion database');
      console.log('3. Click "..." → "Add connections"');
      console.log('4. Select your integration');
    }
  }
}

testNotion();
