'use client';

import React from 'react';
import type { Event } from '../types';

export default function TestActions({
  darkMode,
  selectedEvent,
  generateLabel,
  hideUnlimited,
  onGenerateTest,
  onUnlimited,
}: {
  darkMode: boolean;
  selectedEvent: Event | null;
  generateLabel: string;
  hideUnlimited?: boolean;
  onGenerateTest: () => void;
  onUnlimited: () => void;
}) {
  return (
    <div className="flex gap-3 mt-6 lg:mt-auto">
      <button
        onClick={onGenerateTest}
        disabled={!selectedEvent}
        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 border-2 ${
          !selectedEvent
            ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500')
            : darkMode
              ? 'border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white'
              : 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white'
        }`}
      >
        {generateLabel}
      </button>
      {hideUnlimited ? null : (
        <button
          onClick={onUnlimited}
          disabled={!selectedEvent}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 border-2 ${
            !selectedEvent
              ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500')
              : darkMode
                ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                : 'border-indigo-500 text-indigo-600 hover:bg-indigo-500 hover:text-white'
          }`}
        >
          Unlimited
        </button>
      )}
    </div>
  );
}


