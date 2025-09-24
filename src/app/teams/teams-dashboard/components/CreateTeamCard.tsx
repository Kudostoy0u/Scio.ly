import React, { RefObject } from 'react';

export default function CreateTeamCard({
  darkMode,
  schoolQuery,
  setSchoolQuery,
  pendingDivision,
  setPendingDivision,
  chosenSchool,
  setChosenSchool,
  onCreateTeam,
  onJoinTeam,
  createError,
  joinError,
  filteredSchools,
  visibleCount,
  loadMoreRef,
}: {
  darkMode: boolean;
  schoolQuery: string;
  setSchoolQuery: (v: string) => void;
  pendingDivision: 'B' | 'C';
  setPendingDivision: (v: 'B' | 'C') => void;
  chosenSchool: string | null;
  setChosenSchool: (v: string | null) => void;
  onCreateTeam: () => void | Promise<void>;
  onJoinTeam: (code: string) => void | Promise<void>;
  createError: string;
  joinError: string;
  filteredSchools: string[];
  visibleCount: number;
  loadMoreRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={`rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} p-4 mb-6`}>
      <h2 className="font-semibold mb-3">Create a Team</h2>
      <div className="flex flex-col md:flex-row items-stretch gap-3">
        <div className="flex-1">
          <input
            placeholder="Search schools"
            value={schoolQuery}
            onChange={(e) => setSchoolQuery(e.target.value)}
            className={`w-full rounded-md px-3 py-2 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'}`}
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={pendingDivision}
            onChange={(e) => setPendingDivision(e.target.value as 'B' | 'C')}
            className={`${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded px-2 py-1 text-sm`}
          >
            <option value="B">Division B</option>
            <option value="C">Division C</option>
          </select>
          <button
            onClick={onCreateTeam}
            disabled={!chosenSchool}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${chosenSchool ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
          >
            Create Team
          </button>
        </div>
      </div>
      {!!createError && (
        <div className={`${darkMode ? 'text-red-300' : 'text-red-600'} text-sm mt-2`} role="alert">{createError}</div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <input
          id="team-join-code"
          placeholder="Enter team code..."
          className={`flex-1 rounded-md px-3 py-2 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'}`}
        />
        <button
          onClick={() => {
            const el = document.getElementById('team-join-code') as HTMLInputElement | null;
            const code = (el?.value || '').trim();
            if (!code) return;
            onJoinTeam(code);
          }}
          className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-3 py-2 rounded-md`}
        >
          Join Team
        </button>
      </div>
      {!!joinError && (
        <div className={`${darkMode ? 'text-red-300' : 'text-red-600'} text-sm mt-2`} role="alert">{joinError}</div>
      )}
      {filteredSchools.length > 0 && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-auto text-sm p-2">
          {filteredSchools.slice(0, visibleCount).map((s) => (
            <button
              key={s}
              onClick={() => setChosenSchool(s)}
              className={`${chosenSchool === s ? 'ring-2 ring-blue-500' : ''} ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} px-3 py-1.5 rounded-md hover:opacity-90 text-left`}
            >
              {s}
            </button>
          ))}
          <div ref={loadMoreRef as any} className="col-span-full h-1" />
        </div>
      )}
    </div>
  );
}


