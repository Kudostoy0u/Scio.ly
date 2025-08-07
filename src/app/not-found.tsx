'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';
import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  const { darkMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Add effect for scrollbar theme
  useEffect(() => {
    // Apply scrollbar styles based on theme
    document.documentElement.classList.toggle('dark-scrollbar', darkMode);
    document.documentElement.classList.toggle('light-scrollbar', !darkMode);
  }, [darkMode]);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background */}
      <div
        className={`fixed inset-0 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      ></div>

      <Header />

      {/* Main Content */}
      <main className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8 w-full">
        <div
          className={`p-8 rounded-xl ${
            darkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/90 shadow-lg backdrop-blur-sm'
          }`}
        >
          {/* Logo and 404 Content */}
          <div className="text-center mb-8">
            {/* Site Logo */}
            <div className="flex justify-center mb-6">
              <Image
                src="/site-logo.png"
                alt="Scio.ly Logo"
                width={120}
                height={120}
                className="rounded-lg"
              />
            </div>

            {/* 404 Number */}
            <h1 className={`text-8xl font-bold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              404
            </h1>

            {/* Hylas the Cat Message */}
            <div className="mb-6">
              <h2 className={`text-2xl font-semibold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Oops! Hylas the Cat couldn&apos;t find this page
              </h2>
              <p className={`text-lg ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                The page you&apos;re looking for seems to have wandered off...
              </p>
            </div>

            {/* Cat ASCII Art */}
            <div className={`font-mono text-sm mb-6 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <pre className="whitespace-pre">
{`  /\\_/\\
 ( o.o )
  > ^ <
  /   \\
 /     \\
|       |
 \\_____/`}
              </pre>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-blue-500' : 'hover:bg-blue-700'
                }`}
              >
                Go Home
              </Link>
              <Link
                href="/practice"
                className={`px-6 py-3 ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                } font-semibold rounded-lg transition-colors`}
              >
                Lock in
              </Link>
            </div>

            {/* Fun Message */}
            <div className={`mt-8 p-4 rounded-lg ${
              darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
            }`}>
              <p className={`text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                💡 <strong>Tip:</strong> Hylas the Cat suggests checking the URL or using the navigation above to find what you&apos;re looking for!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
