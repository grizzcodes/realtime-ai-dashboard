                        {/* FIXED: Always show event title */}
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">
                          {event.title || event.summary || 'Untitled Event'}
                        </h4>
                        <div className="text-xs text-gray-600 mb-2">📍 {event.location || 'No location'}</div>
                        <div className="text-xs text-gray-600 mb-3">🕒 {formatTimeOnly(event.start)} - {formatTimeOnly(event.end)}</div>
                        
                        {/* Enhanced Attendees with Hover Tooltips */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">👥</span>
                            <div className="flex -space-x-1">
                              {(event.attendees || []).slice(0, 4).map((attendee, index) => (
                                <div key={index} className="relative group">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm ${
                                    attendee.responseStatus === 'accepted' ? 'bg-green-100 text-green-700' :
                                    attendee.responseStatus === 'declined' ? 'bg-red-100 text-red-700' :
                                    attendee.responseStatus === 'tentative' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {getResponseStatusIcon(attendee.responseStatus)}
                                  </div>
                                  
                                  {/* Hover Tooltip */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    <div className="font-medium">{attendee.displayName || attendee.email?.split('@')[0]}</div>
                                    <div className="text-gray-300">{attendee.email}</div>
                                    <div className={`text-xs mt-1 ${getResponseStatusColor(attendee.responseStatus)}`}>
                                      {attendee.responseStatus || 'unknown'}
                                    </div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                                  </div>
                                </div>
                              ))}
                              {(event.attendees || []).length > 4 && (
                                <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm relative group">
                                  +{(event.attendees || []).length - 4}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    <div className="font-medium">More attendees:</div>
                                    {(event.attendees || []).slice(4, 8).map((attendee, idx) => (
                                      <div key={idx} className="text-gray-300">{attendee.displayName || attendee.email}</div>
                                    ))}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>