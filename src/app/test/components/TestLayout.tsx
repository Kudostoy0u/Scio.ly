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

      {/* Global scrollbar theme is centralized in globals.css */}

      {/* Page Content */}
      <div className="relative flex flex-col items-center p-6">
        {children}
      </div>
    </div>
  );
}
