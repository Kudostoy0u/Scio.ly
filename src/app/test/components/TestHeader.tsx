'use client';
import React from 'react';
import { formatTime } from '@/app/utils/questionUtils';

interface TestHeaderProps {
  eventName: string;
  timeLeft: number | null;
  darkMode: boolean;
  isFromBookmarks: boolean;
}

export default function TestHeader({ 
  eventName, 
  timeLeft, 
  darkMode, 
  isFromBookmarks
}: TestHeaderProps) {
  return (
    <>
      <header className="w-full max-w-3xl flex justify-between items-center pt-3">
        <div className="flex items-center">
          <h1 className={`text-3xl font-extrabold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {eventName || 'Loading...'}
            {isFromBookmarks && (
              <span className={`ml-2 text-sm font-normal ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                (Bookmarked)
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-4">
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
        </div>
      </header>
    </>
  );
}
