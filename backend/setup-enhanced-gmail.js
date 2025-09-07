// backend/setup-enhanced-gmail.js
// Run this file to verify and set up the enhanced Gmail features

const fs = require('fs');
const path = require('path');

console.log('🚀 Enhanced Gmail Setup Verification\n');

// Check for required files
const requiredFiles = [
  { path: 'src/services/gmailServiceEnhanced.js', name: 'Enhanced Gmail Service' },
  { path: 'src/routes/gmailEnhancedRoutes.js', name: 'Enhanced Gmail Routes' },
  { path: '../frontend/src/components/GmailBoxEnhanced.js', name: 'Enhanced Gmail Component' }
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file.name} - Found`);
  } else {
    console.log(`❌ ${file.name} - Missing at ${file.path}`);
    allFilesExist = false;
  }
});

console.log('\n📦 Checking dependencies:');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const requiredDeps = ['openai', 'googleapis', 'socket.io'];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} - Installed (${packageJson.dependencies[dep]})`);
  } else {
    console.log(`❌ ${dep} - Not found`);
  }
});

console.log('\n🔑 Checking environment variables:');
require('dotenv').config();

const envVars = [
  { key: 'GOOGLE_CLIENT_ID', name: 'Google OAuth Client ID', required: true },
  { key: 'GOOGLE_CLIENT_SECRET', name: 'Google OAuth Secret', required: true },
  { key: 'GOOGLE_REFRESH_TOKEN', name: 'Google Refresh Token', required: true },
  { key: 'OPENAI_API_KEY', name: 'OpenAI API Key', required: false }
];

let hasRequiredEnv = true;
envVars.forEach(env => {
  if (process.env[env.key]) {
    console.log(`✅ ${env.name} - Configured`);
  } else {
    console.log(`${env.required ? '❌' : '⚠️'} ${env.name} - ${env.required ? 'Missing (REQUIRED)' : 'Missing (optional for smart replies)'}`);
    if (env.required) hasRequiredEnv = false;
  }
});

console.log('\n📋 Setup Summary:');
if (allFilesExist && hasRequiredEnv) {
  console.log('✅ All required files and configurations are in place!');
  console.log('\n🎉 Enhanced Gmail features are ready to use!');
  console.log('\n📝 Next steps:');
  console.log('1. Start your backend: npm start');
  console.log('2. Import GmailBoxEnhanced in your React app');
  console.log('3. Replace <GmailBox /> with <GmailBoxEnhanced />');
  console.log('\n✨ New features available:');
  console.log('   - Expandable email view with full content');
  console.log('   - Smart AI-powered replies (if OpenAI configured)');
  console.log('   - Delete emails with confirmation');
  console.log('   - Thread view for conversations');
  console.log('   - Archive functionality');
} else {
  console.log('⚠️ Some configurations are missing.');
  console.log('\n🔧 To fix:');
  
  if (!allFilesExist) {
    console.log('1. Ensure all enhanced Gmail files are in place');
  }
  
  if (!hasRequiredEnv) {
    console.log('2. Add missing environment variables to .env file');
    console.log('\n   Example .env configuration:');
    console.log('   GOOGLE_CLIENT_ID=your_client_id_here');
    console.log('   GOOGLE_CLIENT_SECRET=your_secret_here');
    console.log('   GOOGLE_REFRESH_TOKEN=your_refresh_token_here');
    console.log('   OPENAI_API_KEY=sk-your_openai_key_here');
  }
}

console.log('\n📚 API Endpoints added:');
console.log('   POST /api/gmail/smart-reply - Generate AI reply');
console.log('   DELETE /api/gmail/trash/:emailId - Move to trash');
console.log('   POST /api/gmail/send-reply - Send threaded reply');
console.log('   GET /api/gmail/email/:emailId - Get full email with thread');

console.log('\n🌐 Frontend usage:');
console.log(`
// In your React component:
import GmailBoxEnhanced from './components/GmailBoxEnhanced';

// In your render:
<GmailBoxEnhanced />
`);

console.log('\n💡 Testing the features:');
console.log('1. Click any email to expand and see full content');
console.log('2. Click "Smart Reply" to generate AI response');
console.log('3. Edit the generated reply before sending');
console.log('4. Use Delete button to remove emails');
console.log('5. Archive emails to clean up inbox');

console.log('\n-------------------');
console.log('Setup check complete!');
