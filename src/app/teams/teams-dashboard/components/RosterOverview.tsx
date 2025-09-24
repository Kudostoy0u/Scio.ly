import React from 'react';

export default function RosterOverview({
  darkMode,
  isLeader,
  mergedMemberNames,
  nameToEvents,
  selection: _selection,
  teams,
  activeTeamIdx,
  extraUnlinkedNames: _extraUnlinkedNames,
  topAddOpen,
  setTopAddOpen,
  topAddName,
  setTopAddName,
  topInviteOpen,
  setTopInviteOpen,
  topInviteUsername,
  setTopInviteUsername,
  nameAddingEvent,
  setNameAddingEvent,
  selectedEventForName,
  setSelectedEventForName,
  nameInviting: _nameInviting,
  setNameInviting,
  invitingUsername: _invitingUsername,
  setInvitingUsername,
  removePersonFromEvent,
  addPersonToEvent,
}: {
  darkMode: boolean;
  isLeader: boolean;
  mergedMemberNames: string[];
  nameToEvents: Record<string, string[]>;
  selection: { division: 'B' | 'C' } | null;
  teams: Array<{ id: string; name: string; roster: Record<string, string[]> }>;
  activeTeamIdx: number;
  extraUnlinkedNames: string[];
  topAddOpen: boolean;
  setTopAddOpen: (v: boolean) => void;
  topAddName: string;
  setTopAddName: (v: string) => void;
  topInviteOpen: boolean;
  setTopInviteOpen: (v: boolean) => void;
  topInviteUsername: string;
  setTopInviteUsername: (v: string) => void;
  nameAddingEvent: string | null;
  setNameAddingEvent: (v: string | null) => void;
  selectedEventForName: string;
  setSelectedEventForName: (v: string) => void;
  nameInviting: string | null;
  setNameInviting: (v: string | null) => void;
  invitingUsername: string;
  setInvitingUsername: (v: string) => void;
  removePersonFromEvent: (personName: string, eventName: string) => void;
  addPersonToEvent: (personName: string, eventName: string) => void;
}) {
  const activeTeam = teams[activeTeamIdx] || teams[0];
  const allEvents = Object.keys(activeTeam?.roster || {});

  return (
    <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 lg:col-span-2`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Members</h2>
        <div className="flex items-center gap-2 text-sm">
          {isLeader && (
            <>
              {topAddOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    value={topAddName}
                    onChange={(e) => setTopAddName(e.target.value)}
                    placeholder="Member name"
                    className={`${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-2 h-8 text-sm`}
                  />
                  <button
                    onClick={() => {
                      const nm = (topAddName || '').trim();
                      if (!nm) return;
                      // parent is responsible for updating extraUnlinkedNames; just fire event here
                      setTopAddName('');
                      setTopAddOpen(false);
                    }}
                    className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-3 h-8 text-sm`}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setTopAddOpen(false); setTopAddName(''); }}
                    className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-3 h-8 text-sm`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setTopAddOpen(true); setTopInviteOpen(false); }}
                  className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-2 h-8 text-xs`}
                >
                  + Add
                </button>
              )}
              {topInviteOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    value={topInviteUsername}
                    onChange={(e) => setTopInviteUsername(e.target.value)}
                    placeholder="Username"
                    className={`${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-2 h-8 text-sm`}
                  />
                  <button
                    onClick={() => setTopInviteOpen(false)}
                    className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-3 h-8 text-sm`}
                  >
                    Invite
                  </button>
                  <button
                    onClick={() => { setTopInviteOpen(false); setTopInviteUsername(''); }}
                    className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-3 h-8 text-sm`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setTopInviteOpen(true); setTopAddOpen(false); }}
                  className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-2 h-8 text-xs`}
                >
                  + Invite
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {mergedMemberNames.length === 0 ? (
        <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>No members yet.</div>
      ) : (
        <div className="space-y-3">
          {mergedMemberNames.map((name) => {
            const personEvents = nameToEvents[name] || [];
            const availableToAdd = allEvents.filter((evt) => !personEvents.includes(evt));
            return (
              <div key={name} className={`${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200'} rounded-md p-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xs`}>{personEvents.length} event(s)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLeader && (
                      <>
                        {nameAddingEvent === name ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedEventForName}
                              onChange={(e) => setSelectedEventForName(e.target.value)}
                              className={`${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-2 h-8 text-sm`}
                            >
                              <option value="">Select event</option>
                              {availableToAdd.map((evt) => (
                                <option key={evt} value={evt}>{evt}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                if (!selectedEventForName) return;
                                addPersonToEvent(name, selectedEventForName);
                                setSelectedEventForName('');
                                setNameAddingEvent(null);
                              }}
                              className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-3 h-8 text-sm`}
                            >
                              Add
                            </button>
                            <button
                              onClick={() => { setNameAddingEvent(null); setSelectedEventForName(''); }}
                              className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-3 h-8 text-sm`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setNameAddingEvent(name); setSelectedEventForName(''); setNameInviting(null); setInvitingUsername(''); }}
                            className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-2 h-8 text-xs`}
                            title="Add to event"
                          >
                            + Add
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {personEvents.map((evt) => (
                    <span key={evt} className={`${darkMode ? 'bg-blue-900/30 text-blue-200 border border-blue-800/60' : 'bg-blue-100 text-blue-800 border border-blue-200'} inline-flex items-center px-2 py-0.5 rounded-full text-xs`}>
                      {evt}
                      {isLeader && (
                        <button
                          onClick={() => removePersonFromEvent(name, evt)}
                          className={`ml-2 ${darkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-700 hover:text-blue-900'}`}
                          title="Remove from event"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
