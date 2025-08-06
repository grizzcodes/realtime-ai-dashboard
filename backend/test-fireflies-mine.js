// backend/test-fireflies-mine.js
#!/usr/bin/env node
require('dotenv').config();

const API_KEY = process.env.FIREFLIES_API_KEY || '3a4ccfdb-d221-493c-bb75-36447b54c4dd';

console.log('🎙️ Testing Fireflies API with mine:true parameter...');
console.log('API Key:', API_KEY ? `${API_KEY.slice(0, 8)}...` : 'MISSING');

async function testMineParameter() {
  try {
    // Test 1: Get user info first
    console.log('\n📝 Test 1: Getting user info...');
    const userQuery = `
      query {
        user {
          user_id
          name
          email
          num_transcripts
          recent_transcript
        }
      }
    `;

    const userResponse = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: userQuery })
    });

    const userData = await userResponse.json();
    
    if (userData.data && userData.data.user) {
      console.log('✅ User:', userData.data.user.name);
      console.log('Email:', userData.data.user.email);
      console.log('Total transcripts:', userData.data.user.num_transcripts);
      console.log('Recent transcript ID:', userData.data.user.recent_transcript);
    }

    // Test 2: Try mine:true
    console.log('\n📝 Test 2: Fetching transcripts with mine:true...');
    const mineQuery = `
      query {
        transcripts(mine: true, limit: 5) {
          id
          title
          date
        }
      }
    `;

    const mineResponse = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mineQuery })
    });

    const mineData = await mineResponse.json();
    
    if (mineData.errors) {
      console.error('❌ Error with mine:true:', mineData.errors);
    } else if (mineData.data && mineData.data.transcripts) {
      console.log(`✅ Found ${mineData.data.transcripts.length} transcripts with mine:true`);
      mineData.data.transcripts.forEach((t, i) => {
        console.log(`${i + 1}. ${t.title || 'Untitled'} (ID: ${t.id})`);
      });
    } else {
      console.log('⚠️ No transcripts returned with mine:true');
    }

    // Test 3: Try without any filter
    console.log('\n📝 Test 3: Fetching transcripts without filter...');
    const noFilterQuery = `
      query {
        transcripts(limit: 5) {
          id
          title
          date
        }
      }
    `;

    const noFilterResponse = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: noFilterQuery })
    });

    const noFilterData = await noFilterResponse.json();
    
    if (noFilterData.errors) {
      console.error('❌ Error without filter:', noFilterData.errors);
    } else if (noFilterData.data && noFilterData.data.transcripts) {
      console.log(`✅ Found ${noFilterData.data.transcripts.length} transcripts without filter`);
      noFilterData.data.transcripts.forEach((t, i) => {
        console.log(`${i + 1}. ${t.title || 'Untitled'} (ID: ${t.id})`);
      });
    } else {
      console.log('⚠️ No transcripts returned without filter');
    }

    // Test 4: Try fetching specific transcript by ID
    if (userData.data?.user?.recent_transcript) {
      console.log('\n📝 Test 4: Fetching specific transcript by ID...');
      const transcriptQuery = `
        query GetTranscript($id: String!) {
          transcript(id: $id) {
            id
            title
            date
            duration
            participants
          }
        }
      `;

      const transcriptResponse = await fetch('https://api.fireflies.ai/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: transcriptQuery,
          variables: { id: userData.data.user.recent_transcript }
        })
      });

      const transcriptData = await transcriptResponse.json();
      
      if (transcriptData.errors) {
        console.error('❌ Error fetching transcript:', transcriptData.errors);
      } else if (transcriptData.data && transcriptData.data.transcript) {
        console.log('✅ Successfully fetched transcript:');
        console.log('Title:', transcriptData.data.transcript.title);
        console.log('Duration:', Math.round(transcriptData.data.transcript.duration / 60), 'minutes');
        console.log('Participants:', transcriptData.data.transcript.participants);
      } else {
        console.log('⚠️ No transcript data returned');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMineParameter();
