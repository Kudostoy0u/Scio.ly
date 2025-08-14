import React from 'react';
import { formatTime } from '../cipher-utils';

interface HeaderProps {
  darkMode: boolean;
  timeLeft: number | null;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, timeLeft }) => {
  return (
    <>
      <header className="w-full max-w-3xl flex justify-between items-center pt-3 pb-0">
        <div className="flex items-center">
          <h1 className={`text-2xl font-extrabold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            Scio.ly: Codebusters
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
};
