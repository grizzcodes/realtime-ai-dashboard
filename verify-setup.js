#!/usr/bin/env node

// Quick verification script to check if all services are properly set up
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying realtime-ai-dashboard setup...\n');

// Check backend files
const backendFiles = [
  'backend/main.js',
  'backend/server.js',
  'backend/package.json',
  'backend/.env.example',
  'backend/src/services/notionService.js',
  'backend/src/services/integrationService.js',
  'backend/src/services/supabaseService.js',
  'backend/src/services/firefliesService.js',
  'backend/src/services/openAIService.js',
  'backend/src/services/claudeService.js'
];

// Check frontend files
const frontendFiles = [
  'frontend/src/App.js',
  'frontend/src/index.js',
  'frontend/src/components/IntegrationStatusBar.js',
  'frontend/src/components/FloatingChatbox.js',
  'frontend/package.json',
  'frontend/public/index.html'
];

console.log('📁 Backend Files:');
backendFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n📁 Frontend Files:');
frontendFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n🚀 Setup Instructions:');
console.log('1. Backend: cd backend && npm install && npm run dev');
console.log('2. Frontend: cd frontend && npm install && npm start');
console.log('3. Configure .env file with your API keys');
console.log('4. Open http://localhost:3000 to view dashboard');

console.log('\n✅ Verification complete!');