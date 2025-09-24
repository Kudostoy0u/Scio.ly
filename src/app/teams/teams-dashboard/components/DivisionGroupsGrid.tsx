import React from 'react';

type Team = { id: string; name: string; roster: Record<string, string[]> };

type GroupDef = { label: string; events: string[]; colorKey: string };

export default function DivisionGroupsGrid({
  darkMode,
  division,
  teams,
  activeTeamIdx,
  isLeader,
  setName,
  getGroupColors,
  groups,
  setAssignEvent,
  setAssignSettings,
  setAssignModal,
}: {
  darkMode: boolean;
  division: 'B' | 'C';
  teams: Team[];
  activeTeamIdx: number;
  isLeader: boolean;
  setName: (division: 'B' | 'C', eventName: string, idx: number, value: string) => void;
  getGroupColors: (colorKey: string) => { bg: string; border: string; text: string };
  groups: GroupDef[];
  setAssignEvent: (v: any) => void;
  setAssignSettings: (updater: (prev: any) => any) => void;
  setAssignModal: (v: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {groups.map((group, index) => {
        const colors = getGroupColors(group.colorKey);
        const isLastGroup = index === groups.length - 1;
        if (isLastGroup) {
          return (
            <div key={group.label} className={`rounded-lg border-2 p-4 lg:col-span-2 ${colors.bg} ${colors.border}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {group.events.slice(0, Math.ceil(group.events.length / 2)).map((evt) => {
                    const max = evt.toLowerCase().includes('codebusters') || evt.toLowerCase().includes('experimental design') ? 3 : 2;
                    const team = teams[activeTeamIdx] || teams[0];
                    const base = team?.roster[evt] || [];
                    const slots = [...base, ...new Array(Math.max(0, max - base.length)).fill('')].slice(0, max);
                    return (
                      <div key={evt} className="space-y-2">
                        <div className={`text-sm font-medium ${colors.text} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <span>{evt}</span>
                            {isLeader && false && (
                              <div className="relative inline-block text-left">
                                <details className="group">
                                  <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                                  <div className={`absolute left-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                    <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: division ? [division] : ['B','C'] }); setAssignSettings((prev:any)=> ({ ...prev, division })); setAssignModal({ open: true, eventName: evt, scope: 'all' });}}>Assign to All</button>
                                    {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                      <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: division ? [division] : ['B','C'] }); setAssignSettings((prev:any)=> ({ ...prev, division })); setAssignModal({ open: true, eventName: evt, scope: (n||'').trim() });}}>Assign to {n}</button>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{slots.filter((n) => (n || '').trim()).length}/{max}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[...Array(max)].map((_, i) => (
                            <input
                              key={i}
                              value={slots[i] || ''}
                              onChange={(e) => setName(division, evt, i, e.target.value)}
                              disabled={!isLeader}
                              placeholder="Name"
                              className={`w-full rounded px-2 py-1 text-sm ${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  {group.events.slice(Math.ceil(group.events.length / 2)).map((evt) => {
                    const max = evt.toLowerCase().includes('codebusters') || evt.toLowerCase().includes('experimental design') ? 3 : 2;
                    const team = teams[activeTeamIdx] || teams[0];
                    const base = team?.roster[evt] || [];
                    const slots = [...base, ...new Array(Math.max(0, max - base.length)).fill('')].slice(0, max);
                    return (
                      <div key={evt} className="space-y-2">
                        <div className={`text-sm font-medium ${colors.text} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <span>{evt}</span>
                            {isLeader && false && (
                              <div className="relative inline-block text-left">
                                <details className="group">
                                  <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                                  <div className={`absolute left-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                    <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: division ? [division] : ['B','C'] }); setAssignSettings((prev:any)=> ({ ...prev, division })); setAssignModal({ open: true, eventName: evt, scope: 'all' });}}>Assign to All</button>
                                    {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                      <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: division ? [division] : ['B','C'] }); setAssignSettings((prev:any)=> ({ ...prev, division })); setAssignModal({ open: true, eventName: evt, scope: (n||'').trim() });}}>Assign to {n}</button>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{slots.filter((n) => (n || '').trim()).length}/{max}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[...Array(max)].map((_, i) => (
                            <input
                              key={i}
                              value={slots[i] || ''}
                              onChange={(e) => setName(division, evt, i, e.target.value)}
                              disabled={!isLeader}
                              placeholder="Name"
                              className={`w-full rounded px-2 py-1 text-sm ${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div key={group.label} className={`rounded-lg border-2 p-4 ${colors.bg} ${colors.border}`}>
            <div className="space-y-3">
              {group.events.map((evt) => {
                const max = evt.toLowerCase().includes('codebusters') || evt.toLowerCase().includes('experimental design') ? 3 : 2;
                const team = teams[activeTeamIdx] || teams[0];
                const base = team?.roster[evt] || [];
                const slots = [...base, ...new Array(Math.max(0, max - base.length)).fill('')].slice(0, max);
                return (
                  <div key={evt} className="space-y-2">
                    <div className={`text-sm font-medium ${colors.text} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span>{evt}</span>
                        {isLeader && !/engineering cad|experimental design/i.test(evt) && (
                          <div className="relative inline-block text-left">
                            <details className="group">
                              <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                              <div className={`absolute left-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: division ? [division] : ['B','C'] }); setAssignSettings((prev:any)=> ({ ...prev, division })); setAssignModal({ open: true, eventName: evt, scope: 'all' });}}>Assign to All</button>
                                {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                  <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: division ? [division] : ['B','C'] }); setAssignSettings((prev:any)=> ({ ...prev, division })); setAssignModal({ open: true, eventName: evt, scope: (n||'').trim() });}}>Assign to {n}</button>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{slots.filter((n) => (n || '').trim()).length}/{max}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(max)].map((_, i) => (
                        <input
                          key={i}
                          value={slots[i] || ''}
                          onChange={(e) => setName(division, evt, i, e.target.value)}
                          disabled={!isLeader}
                          placeholder="Name"
                          className={`w-full rounded px-2 py-1 text-sm ${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


