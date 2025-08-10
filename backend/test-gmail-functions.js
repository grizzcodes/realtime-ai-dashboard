// backend/test-gmail-functions.js
// Test Gmail archive and draft reply functionality

require('dotenv').config();
const fetch = require('node-fetch');

async function testGmailFunctions() {
  console.log('📧 Testing Gmail Functions\n');
  console.log('=====================================\n');
  
  const baseUrl = 'http://localhost:3001';
  
  // Test 1: Get emails
  console.log('1️⃣ Testing email fetch...');
  try {
    const response = await fetch(`${baseUrl}/api/gmail/latest?limit=5`);
    const data = await response.json();
    
    if (data.emails && data.emails.length > 0) {
      console.log(`✅ Found ${data.emails.length} emails`);
      
      const testEmail = data.emails[0];
      console.log(`\nTest email:`);
      console.log(`  ID: ${testEmail.id}`);
      console.log(`  Subject: ${testEmail.subject}`);
      console.log(`  From: ${testEmail.from}`);
      
      // Test 2: Archive function
      console.log('\n2️⃣ Testing archive function...');
      console.log(`  Attempting to archive email: ${testEmail.id}`);
      
      try {
        const archiveResponse = await fetch(`${baseUrl}/api/gmail/archive/${testEmail.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`  Response status: ${archiveResponse.status}`);
        const archiveResult = await archiveResponse.json();
        
        if (archiveResult.success) {
          console.log('  ✅ Archive successful!');
        } else {
          console.log(`  ❌ Archive failed: ${archiveResult.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Archive request failed: ${error.message}`);
      }
      
      // Test 3: Draft reply function
      console.log('\n3️⃣ Testing draft reply function...');
      console.log(`  Generating draft for: ${testEmail.subject}`);
      
      try {
        const draftResponse = await fetch(`${baseUrl}/api/gmail/draft-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailId: testEmail.id,
            subject: testEmail.subject,
            from: testEmail.from,
            snippet: testEmail.snippet || 'Test email content'
          })
        });
        
        console.log(`  Response status: ${draftResponse.status}`);
        const draftResult = await draftResponse.json();
        
        if (draftResult.success) {
          console.log('  ✅ Draft generated successfully!');
          console.log('  Draft content:');
          console.log('  ' + draftResult.draftContent.split('\n').join('\n  '));
        } else {
          console.log(`  ❌ Draft generation failed: ${draftResult.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Draft request failed: ${error.message}`);
      }
      
    } else {
      console.log('❌ No emails found');
      console.log('  Check your Gmail integration settings');
    }
  } catch (error) {
    console.log(`❌ Failed to fetch emails: ${error.message}`);
    console.log('  Make sure the backend server is running: npm run dev');
  }
  
  // Test 4: Check API endpoints exist
  console.log('\n4️⃣ Checking API endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/gmail/latest' },
    { method: 'POST', path: '/api/gmail/archive/test-id' },
    { method: 'POST', path: '/api/gmail/draft-reply' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.method === 'POST' && endpoint.path.includes('draft') ? 
          JSON.stringify({ emailId: 'test', subject: 'test', from: 'test', snippet: 'test' }) : 
          undefined
      });
      
      console.log(`  ${endpoint.method} ${endpoint.path}: ${response.status} ${response.status < 500 ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`  ${endpoint.method} ${endpoint.path}: ❌ Failed to connect`);
    }
  }
  
  console.log('\n=====================================');
  console.log('📌 Summary:\n');
  
  console.log('If archive/draft buttons don\'t work:');
  console.log('1. Check browser console for errors (F12)');
  console.log('2. Ensure Gmail OAuth is configured');
  console.log('3. Check backend console for error messages');
  console.log('4. Verify GOOGLE_REFRESH_TOKEN in .env');
}

// Run the test
testGmailFunctions().catch(console.error);
