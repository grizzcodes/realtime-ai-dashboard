                            {index + 1}
                          </span>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMeeting.transcript_url && (
                  <div className="pt-4 border-t border-white/20">
                    <button
                      onClick={() => window.open(selectedMeeting.transcript_url, '_blank')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                    >
                      📄 View Full Transcript
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Glass Chatbox - Always visible and focused */}
      <GlassChatbox 
        socket={socket} 
        apiStatus={apiStatus}
        onFocus={handleChatFocus}
      />
    </div>
  );
};

export default App;