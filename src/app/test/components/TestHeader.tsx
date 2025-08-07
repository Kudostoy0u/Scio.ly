'use client';
import React from 'react';
import { formatTime } from '@/app/utils/questionUtils';

interface TestHeaderProps {
  eventName: string;
  timeLeft: number | null;
  darkMode: boolean;
  isFromBookmarks: boolean;
  onReset: () => void;
}

export default function TestHeader({ 
  eventName, 
  timeLeft, 
  darkMode, 
  isFromBookmarks, 
  onReset 
}: TestHeaderProps) {
  return (
    <>
      <button
        onClick={onReset}
        className={`absolute top-4 right-4 p-2 rounded-full transition-transform duration-300 hover:scale-110 ${
          darkMode ? 'bg-gray-700 text-white shadow-lg' : 'bg-white text-gray-900 shadow-md'
        }`}
        title="Reset Test"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-refresh">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
          <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
        </svg>
      </button>
      
      <header className="w-full max-w-3xl flex justify-between items-center py-4">
        <div className="flex items-center">
          <h1 className={`text-2xl font-extrabold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            Scio.ly: {eventName || 'Loading...'}
            {isFromBookmarks && (
              <span className={`ml-2 text-sm font-normal ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                (Bookmarked)
              </span>
            )}
          </h1>
        </div>
        {timeLeft !== null && (
          <div
            className={`text-xl font-semibold ${
              timeLeft <= 300
                ? 'text-red-600'
                : darkMode
                ? 'text-white'
                : 'text-blue-600'
            }`}
          >
            {formatTime(timeLeft)}
          </div>
        )}
      </header>
    </>
  );
}
