'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import { ExternalLink, X } from 'lucide-react';
import { useEffect } from 'react';

interface HylasBannerProps {
  onClose: () => void;
}

export default function HylasBanner({ onClose }: HylasBannerProps) {
  const { darkMode } = useTheme();

  // Banner background is fully opaque at all times; no scroll-based effects
  useEffect(() => {}, []);

  const backgroundColor = darkMode
    ? 'rgb(17, 24, 39)'
    : 'rgb(255, 255, 255)';
  const borderColor = darkMode
    ? 'rgb(31, 41, 55)'
    : 'rgb(229, 231, 235)';

  const handleClose = () => {
    localStorage.setItem('hylas-banner-closed', 'true');

    window.dispatchEvent(new CustomEvent('banner-closed'));
    onClose();
  };

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-40 shadow-lg transition-colors duration-300`}
      style={{ backgroundColor }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-8 px-4 sm:px-6">
          <div className={`text-xs sm:text-sm text-center ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <span className="block sm:hidden">
              Check out{' '}
              <a 
                href="https://www.hylas-so.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`font-medium underline hover:no-underline transition-all duration-200 ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Hylas SO
                <ExternalLink className="inline w-3 h-3 ml-1" />
              </a>
              , a satellite tourney by LAHS!
            </span>
            <span className="hidden sm:block">
              Check out{' '}
              <a 
                href="https://www.hylas-so.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`font-medium underline hover:no-underline transition-all duration-200 ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Hylas SO
                <ExternalLink className="inline w-3 h-3 ml-1" />
              </a>
              , a satellite tournament hosted by part of our team @ Los Altos High School, CA!
            </span>
          </div>
        </div>
      </div>
      
      {/* Close button - positioned at screen edge */}
      <button
        onClick={handleClose}
        className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-md transition-colors duration-200 ${
          darkMode 
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Close banner"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Bottom separator line - full width, matches Header border color */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: borderColor }}></div>
    </div>
  );
}
