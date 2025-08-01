        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Notion Tasks with Checkboxes - Takes 2/3 width */}
            <div className="xl:col-span-2 bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">📋 Notion Tasks</h2>
                <button
                  onClick={loadTasks}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                >
                  🔄 Refresh
                </button>
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No tasks found. Check your Notion integration.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tasks.slice(0, 15).map((task, index) => (
                    <div key={task.id || index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-start gap-3">
                        {/* Checkbox for task completion */}
                        <input 
                          type="checkbox" 
                          checked={task.status === 'completed' || task.rawStatus === 'Done'}
                          onChange={() => completeTask(task.id, task.status === 'completed' || task.rawStatus === 'Done')}
                          className="mt-1 w-4 h-4 text-green-600 bg-transparent border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className={`font-medium text-sm ${
                              task.status === 'completed' || task.rawStatus === 'Done' 
                                ? 'text-gray-400 line-through' 
                                : 'text-white'
                            }`}>
                              {task.title || task.name}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${
                              task.status === 'Completed' || task.rawStatus === 'Done' ? 'bg-green-500/20 text-green-400' :
                              task.status === 'In progress' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {task.rawStatus || task.status || 'Not started'}
                            </span>
                          </div>
                          
                          {task.assignee && task.assignee !== 'Unassigned' && (
                            <p className="text-blue-300 text-xs mb-1">👤 {task.assignee}</p>
                          )}
                          
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>Source: {task.source || 'Unknown'}</span>
                            {task.urgency && (
                              <span className="flex items-center">
                                Priority: {task.urgency}/5
                                <div className="ml-1 flex">
                                  {[...Array(5)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-1 h-2 mx-0.5 rounded ${
                                        i < (task.urgency || 1) ? 'bg-red-500' : 'bg-gray-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Sidebar - Stats and Gmail */}
            <div className="space-y-6">
              {/* Connection Status */}
              <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">🔗 Connection Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">WebSocket:</span>
                    <span className={`font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Total Tasks:</span>
                    <span className="text-white font-medium">{tasks.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Completed:</span>
                    <span className="text-green-400 font-medium">
                      {tasks.filter(t => t.status === 'completed' || t.rawStatus === 'Done').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">In Progress:</span>
                    <span className="text-yellow-400 font-medium">
                      {tasks.filter(t => t.status === 'in_progress' || t.rawStatus === 'In progress').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">API Services:</span>
                    <span className="text-blue-400 font-medium">
                      {Object.values(apiStatus).filter(s => s?.success).length} / {Object.keys(apiStatus).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gmail Latest - 10 emails with archive buttons */}
              <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">📧 Latest Gmail</h3>
                  <button
                    onClick={loadEmails}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    🔄
                  </button>
                </div>
                {emails.length === 0 ? (
                  <p className="text-gray-400 text-sm">No emails or Gmail not configured</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {emails.map((email, index) => (
                      <div key={email.id || index} className="border-b border-white/10 pb-3 last:border-b-0 group">
                        <div className="flex items-start gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${email.isUnread ? 'bg-blue-400' : 'bg-gray-500'}`}></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-white text-sm font-medium truncate pr-2">
                                {email.subject || 'No Subject'}
                              </p>
                              <button
                                onClick={() => archiveEmail(email.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs p-1 rounded"
                                title="Archive email"
                              >
                                🗑️
                              </button>
                            </div>
                            <p className="text-gray-300 text-xs truncate">
                              From: {email.from || 'Unknown'}
                            </p>
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                              {email.snippet}
                            </p>
                            {email.date && (
                              <p className="text-gray-500 text-xs mt-1">
                                {new Date(email.date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}