'use client';
import React from 'react';

interface TestLayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
}

export default function TestLayout({ children, darkMode }: TestLayoutProps) {
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className={`absolute inset-0 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      ></div>

      {/* Add styled scrollbar */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
          transition: background 1s ease;
          ${darkMode
            ? 'background: black;'
            : 'background: white;'
          }
        }

        ::-webkit-scrollbar-thumb {
          background: ${darkMode
            ? '#374151'
            : '#3b82f6'};
          border-radius: 4px;
          transition: background 1s ease;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${darkMode
            ? '#1f2937'
            : '#2563eb'};
        }
      `}</style>

      {/* Page Content */}
      <div className="relative flex flex-col items-center p-6">
        {children}
      </div>
    </div>
  );
}
