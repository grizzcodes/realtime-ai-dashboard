                  </h3>
                  <div className={`mb-2 ${apiStatus.gmail?.success ? 'text-green-600' : 'text-red-600'}`}>
                    Gmail Status: {apiStatus.gmail?.success ? '✅ Connected' : '❌ Not Connected'}
                  </div>
                  <div className={`mb-2 ${apiStatus.calendar?.success ? 'text-green-600' : 'text-red-600'}`}>
                    Calendar Status: {apiStatus.calendar?.success ? '✅ Connected' : '❌ Not Connected'}
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p><strong>Setup Steps:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 mt-2">
                      <li>Click "Setup OAuth" button below</li>
                      <li>Authorize Gmail and Calendar access</li>
                      <li>Copy the refresh token to your .env file as GOOGLE_REFRESH_TOKEN</li>
                      <li>Restart your backend server</li>
                      <li>Test connections in the Integrations tab</li>
                    </ol>
                    <button 
                      onClick={() => window.open('http://localhost:3002/auth/google', '_blank')}
                      className="mt-3 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      🔐 Setup Google OAuth
                    </button>
                  </div>
                </div>

                {/* Slack Setup */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">💬 Slack Integration</h3>
                  <div className={`mb-2 ${apiStatus.slack?.success ? 'text-green-600' : 'text-red-600'}`}>
                    Status: {apiStatus.slack?.success ? '✅ Connected' : '❌ Not Connected'}
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p><strong>Setup Steps:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 mt-2">
                      <li>Go to <a href="https://api.slack.com/apps" className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a></li>
                      <li>Create a new Slack app for your workspace</li>
                      <li>Go to "OAuth & Permissions" and get the Bot User OAuth Token</li>
                      <li>Add <code>SLACK_BOT_TOKEN=xoxb-your_token</code> to your .env file</li>
                      <li>Restart backend and test connection</li>
                    </ol>
                  </div>
                </div>

                {/* Fireflies Setup */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">🎙️ Fireflies Integration</h3>
                  <div className={`mb-2 ${apiStatus.fireflies?.success ? 'text-green-600' : 'text-red-600'}`}>
                    Status: {apiStatus.fireflies?.success ? '✅ Connected' : '❌ Not Connected'}
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p><strong>Setup Steps:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 mt-2">
                      <li>Log into your Fireflies.ai account</li>
                      <li>Go to Settings → API</li>
                      <li>Generate an API key</li>
                      <li>Add <code>FIREFLIES_API_KEY=your_api_key</code> to your .env file</li>
                      <li>Restart backend and test connection</li>
                    </ol>
                  </div>
                </div>

                {/* Environment Variables */}
                <div className="border-l-4 border-gray-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">⚙️ Environment Variables</h3>
                  <div className="bg-gray-900 text-green-400 p-4 rounded text-sm font-mono">
                    <div># Required for Google services</div>
                    <div>GOOGLE_CLIENT_ID=your_google_client_id</div>
                    <div>GOOGLE_CLIENT_SECRET=your_google_client_secret</div>
                    <div>GOOGLE_REFRESH_TOKEN=your_refresh_token</div>
                    <div className="mt-2"># Communication platforms</div>
                    <div>SLACK_BOT_TOKEN=xoxb-your_slack_token</div>
                    <div>FIREFLIES_API_KEY=your_fireflies_api_key</div>
                    <div className="mt-2"># AI Services</div>
                    <div>OPENAI_API_KEY=sk-your_openai_key</div>
                    <div>ANTHROPIC_API_KEY=sk-ant-your_claude_key</div>
                    <div className="mt-2"># Task Management</div>
                    <div>NOTION_API_KEY=secret_your_notion_token</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
