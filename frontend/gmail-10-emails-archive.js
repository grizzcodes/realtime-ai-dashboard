              {/* Gmail Latest - Bigger with 10 emails and archive buttons */}
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
                    {emails.slice(0, 10).map((email, index) => (
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