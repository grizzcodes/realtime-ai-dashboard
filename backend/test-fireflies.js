#!/usr/bin/env node
// Test Fireflies API connection
require('dotenv').config();

const API_KEY = process.env.FIREFLIES_API_KEY || '3a4ccfdb-d221-493c-bb75-36447b54c4dd';

console.log('🎙️ Testing Fireflies API Connection...');
console.log('API Key:', API_KEY ? `${API_KEY.slice(0, 8)}...` : 'MISSING');

async function testFireflies() {
  try {
    // Test 1: Basic user info
    console.log('\n📝 Test 1: Getting user info...');
    const query = `
      query {
        user {
          user_id
          name
          email
        }
      }
    `;

    const response = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ GraphQL Error:', data.errors[0].message);
      return;
    }

    if (data.data && data.data.user) {
      console.log('✅ Connected to Fireflies!');
      console.log('User:', data.data.user.name);
      console.log('Email:', data.data.user.email);
      
      // Test 2: Get recent transcripts
      console.log('\n📝 Test 2: Getting recent transcripts...');
      const transcriptsQuery = `
        query {
          transcripts(limit: 5) {
            id
            title
            date
            duration
            meeting_url
            summary {
              overview
              keywords
              action_items
            }
          }
        }
      `;

      const transcriptsResponse = await fetch('https://api.fireflies.ai/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: transcriptsQuery })
      });

      const transcriptsData = await transcriptsResponse.json();
      
      if (transcriptsData.data && transcriptsData.data.transcripts) {
        console.log(`✅ Found ${transcriptsData.data.transcripts.length} transcripts`);
        
        if (transcriptsData.data.transcripts.length > 0) {
          console.log('\nRecent meetings:');
          transcriptsData.data.transcripts.forEach((t, i) => {
            console.log(`${i + 1}. ${t.title} (${new Date(t.date).toLocaleDateString()})`);
            if (t.summary && t.summary.action_items && t.summary.action_items.length > 0) {
              console.log(`   Action Items: ${t.summary.action_items.length}`);
            }
          });
        }
      }
    } else {
      console.error('❌ No user data received');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your API key is correct');
    console.log('2. Check if the key has proper permissions');
    console.log('3. Ensure Fireflies account is active');
  }
}

testFireflies();
