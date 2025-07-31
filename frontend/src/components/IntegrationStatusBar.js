import React, { useState, useEffect } from 'react';

const IntegrationStatusBar = ({ apiStatus, onRefresh }) => {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    setLastUpdate(new Date());
  }, [apiStatus]);

  const integrations = [
    { name: 'OpenAI', icon: '🤖', key: 'openai' },
    { name: 'Claude', icon: '🧠', key: 'claude' },
    { name: 'Notion', icon: '📝', key: 'notion' },
    { name: 'Gmail', icon: '📧', key: 'gmail' },
    { name: 'Slack', icon: '💬', key: 'slack' },
    { name: 'Calendar', icon: '📅', key: 'calendar' },
    { name: 'Fireflies', icon: '🎙️', key: 'fireflies' },
    { name: 'Supabase', icon: '💾', key: 'supabase' },
    { name: 'Linear', icon: '📊', key: 'linear' },
    { name: 'GitHub', icon: '⚡', key: 'github' },
    { name: 'Runway', icon: '🎬', key: 'runway' }
  ];

  const connectedCount = integrations.filter(integration => 
    apiStatus[integration.key]?.success
  ).length;

  const getStatusColor = (isConnected) => {
    return isConnected ? 'bg-green-500' : 'bg-red-500';
  };

  const refreshStatus = async () => {
    if (onRefresh) {
      await onRefresh();
      setLastUpdate(new Date());
    }
  };

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-800">
              Integration Status
            </span>
          </div>
          <button
            onClick={refreshStatus}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Refresh status"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div className="text-xs text-gray-600 mb-3">
          {connectedCount}/{integrations.length} Connected
        </div>

        <div className="grid grid-cols-3 gap-2">
          {integrations.map(integration => {
            const isConnected = apiStatus[integration.key]?.success;
            return (
              <div
                key={integration.key}
                className={`flex items-center gap-2 p-2 rounded-lg backdrop-blur-md border transition-all ${
                  isConnected 
                    ? 'bg-green-500/10 border-green-400/20 text-green-800' 
                    : 'bg-red-500/10 border-red-400/20 text-red-800'
                }`}
                title={`${integration.name}: ${isConnected ? 'Connected' : 'Disconnected'}`}
              >
                <span className="text-sm">{integration.icon}</span>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(isConnected)}`}></div>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-gray-500 mt-3 text-center">
          Updated: {lastUpdate.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
};

export default IntegrationStatusBar;