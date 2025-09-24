'use client';

import React from 'react';
import type { Event, Settings } from '../types';

export default function DivisionToggle({
  darkMode,
  selectedEvent,
  settings,
  onSettingsChange,
  forceBothDivision = false,
}: {
  darkMode: boolean;
  selectedEvent: Event | null;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  forceBothDivision?: boolean;
}) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Division
      </label>
      <div className={`flex rounded-md border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
        {(() => {
          const availableDivisions = selectedEvent?.divisions || ['B', 'C'];
          const canShowB = forceBothDivision ? true : availableDivisions.includes('B');
          const canShowC = forceBothDivision ? true : availableDivisions.includes('C');

          return (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!canShowB) return;
                  onSettingsChange({ ...settings, division: 'B' });
                  if (!selectedEvent || selectedEvent.name !== 'Codebusters') {
                    localStorage.setItem('defaultDivision', 'B');
                  }
                }}
                disabled={!canShowB}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-l-md border ${
                  !canShowB
                    ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
                    : settings.division === 'B'
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : darkMode
                        ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                        : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                Division B
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!(canShowB && canShowC)) return;
                  onSettingsChange({ ...settings, division: 'any' });
                  if (!selectedEvent || selectedEvent.name !== 'Codebusters') {
                    localStorage.setItem('defaultDivision', 'any');
                  }
                }}
                disabled={!(canShowB && canShowC)}
                className={`px-3 py-2 text-sm font-medium border-t border-b border-l border-r ${
                  !(canShowB && canShowC)
                    ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
                    : settings.division === 'any'
                      ? 'border-green-500 bg-green-500 text-white'
                      : darkMode
                        ? 'border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400'
                        : 'border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600'
                }`}
              >
                Both
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canShowC) return;
                  onSettingsChange({ ...settings, division: 'C' });
                  if (!selectedEvent || selectedEvent.name !== 'Codebusters') {
                    localStorage.setItem('defaultDivision', 'C');
                  }
                }}
                disabled={!canShowC}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-r-md border ${
                  !canShowC
                    ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
                    : settings.division === 'C'
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : darkMode
                        ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                        : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                Division C
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );
}


