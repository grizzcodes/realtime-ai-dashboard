        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* AI Services Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">🤖 AI Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {integrations.filter(i => i.category === 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{integration.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-sm mb-3 font-medium ${
                      integration.status === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
                    </div>
                    
                    <button 
                      onClick={() => testIntegration(integration.name)}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                    >
                      Test Connection
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Services */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">🔗 Other Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.filter(i => i.category !== 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{integration.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-sm mb-3 ${
                      integration.status === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
                    </div>
                    
                    <div className="space-y-2">
                      <button 
                        onClick={() => testIntegration(integration.name)}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                      >
                        Test Connection
                      </button>
                      
                      {(integration.name === 'Gmail' || integration.name === 'Calendar') && (
                        <button 
                          onClick={() => window.open('http://localhost:3002/auth/google', '_blank')}
                          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                        >
                          Setup OAuth
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-3">⚙️ Quick Setup Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold">🤖 AI Services</h4>
                  <p>Add API keys to your .env file</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold">📧 Gmail/Calendar</h4>
                  <p>Click "Setup OAuth" button above</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <h4 className="font-semibold">💬 Slack</h4>
                  <p>Get bot token from api.slack.com</p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <h4 className="font-semibold">🎙️ Fireflies</h4>
                  <p>Get API key from fireflies.ai</p>
                </div>
              </div>
            </div>
          </div>
        )}