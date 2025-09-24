import React from 'react';
import { formatDayAndDate, getCountdownParts, getTopThreeUnits } from '../utils/tracker';

export type Tournament = { id: string; name: string; dateTime: string };

export function TournamentTracker({
  darkMode,
  isLeader,
  tournaments,
  newTournamentName,
  newTournamentDateTime,
  isTrackerOpen,
  setIsTrackerOpen,
  setNewTournamentName,
  setNewTournamentDateTime,
  addTournament,
  removeTournament,
}: {
  darkMode: boolean;
  isLeader: boolean;
  tournaments: Tournament[];
  newTournamentName: string;
  newTournamentDateTime: string;
  isTrackerOpen: boolean;
  setIsTrackerOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  setNewTournamentName: (v: string) => void;
  setNewTournamentDateTime: (v: string) => void;
  addTournament: () => void;
  removeTournament: (id: string) => void;
}) {
  return (
    <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tournament Tracker</h2>
        {isLeader && (
          <button
            onClick={() => setIsTrackerOpen((o: boolean) => !o)}
            className={`text-sm px-3 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
          >
            {isTrackerOpen ? 'Hide Add' : 'Add Tournament'}
          </button>
        )}
      </div>

      {isLeader && isTrackerOpen && (
        <div className="mt-4 mb-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch">
            <input
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              placeholder="Tournament name"
              className={`flex-1 rounded px-3 py-2 ${darkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-300'}`}
            />
            <input
              type="datetime-local"
              value={newTournamentDateTime}
              onChange={(e) => setNewTournamentDateTime(e.target.value)}
              className={`${darkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-300'} rounded px-3 py-2`}
            />
            <button
              onClick={addTournament}
              className={`px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {tournaments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tournaments.map((t) => {
            const target = new Date(t.dateTime);
            const p = getCountdownParts(t.dateTime);
            return (
              <div key={t.id} className={`${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'} rounded-lg p-4`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold">{t.name}</div>
                    <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{formatDayAndDate(target)}</div>
                  </div>
                  {isLeader && (
                    <button
                      onClick={() => removeTournament(t.id)}
                      className={`${darkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-500 hover:text-red-600'} text-sm`}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {getTopThreeUnits(p).map((u) => (
                    <div key={u.key} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded p-2`}>
                      <div className="text-xl font-bold">{u.value}</div>
                      <div className="text-xs opacity-70">{u.label}</div>
                    </div>
                  ))}
                </div>
                <div className={`mt-2 text-sm ${p.past ? 'text-red-500' : darkMode ? 'text-green-4 00' : 'text-green-600'}`}>
                  {p.past ? 'Started' : 'Upcoming'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TournamentTracker;


