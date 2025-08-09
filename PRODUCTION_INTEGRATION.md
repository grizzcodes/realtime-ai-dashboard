// Add this to the imports at the top of App.js
import Production from './components/Production';

// Add 'production' to the tabs array (around line 503)
{['dashboard', 'magic-inbox', 'supa', 'production', 'integrations'].map(tab => (

// Change the tab label rendering (around line 511)
{tab === 'magic-inbox' ? '✨ Magic Inbox' : 
 tab === 'supa' ? '🗄️ SUPA' :
 tab === 'production' ? '🎬 Production' :
 tab.charAt(0).toUpperCase() + tab.slice(1)}

// Add the Production component rendering (after line 927, before integrations)
{activeTab === 'production' && <Production />}
