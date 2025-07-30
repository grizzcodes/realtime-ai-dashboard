              <div className="space-y-3">
                {integrations.map(integration => (
                  <div key={integration.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{integration.icon}</span>
                      <span className="font-medium">{integration.name}</span>
                      {integration.category === 'ai' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">AI</span>
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(integration.status)}`}></div>
                  </div>
                ))}
              </div>