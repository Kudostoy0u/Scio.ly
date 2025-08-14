'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { WelcomeMessageProps } from '../types';

export default function WelcomeMessage({ darkMode, currentUser: _currentUser, setDarkMode, greetingName: greetingNameProp }: WelcomeMessageProps) {
  const [greetingName, setGreetingName] = useState<string>(() => {
    // Depend on localStorage primarily; avoid deriving from email/username
    try {
      const cachedFirst = typeof window !== 'undefined' ? localStorage.getItem('scio_display_name') : null;
      if (cachedFirst && cachedFirst.trim()) return cachedFirst.trim();
    } catch {}
    return '';
  });

  // If a prop is provided from DashboardMain, prefer it and sync to localStorage
  useEffect(() => {
    if (greetingNameProp && greetingNameProp.trim()) {
      setGreetingName(prev => prev || greetingNameProp.trim());
      try { localStorage.setItem('scio_display_name', greetingNameProp.trim()); } catch {}
    }
  }, [greetingNameProp]);

  useEffect(() => {
    // On mount, prefer local cache
    try {
      const cached = localStorage.getItem('scio_display_name');
      if (cached && cached.trim()) setGreetingName(cached.trim());
    } catch {}

    // Listen for explicit updates from login/profile flows
    const onNameUpdated = (e: Event) => {
      const ce = e as CustomEvent<string>;
      const next = (typeof ce.detail === 'string' ? ce.detail : null) || (() => {
        try { return localStorage.getItem('scio_display_name'); } catch { return null; }
      })();
      if (next && next.trim()) setGreetingName(next.trim());
    };
    window.addEventListener('scio-display-name-updated' as any, onNameUpdated as any);

    // Multiple short retries to catch SSR/CSR seeding sequence
    const attempts = [0, 60, 120, 240];
    const timers: any[] = [];
    attempts.forEach(ms => {
      const t = setTimeout(() => {
        try {
          const cached = localStorage.getItem('scio_display_name');
          if (cached && cached.trim()) setGreetingName(prev => prev || cached.trim());
        } catch {}
      }, ms);
      timers.push(t);
    });

    return () => {
      window.removeEventListener('scio-display-name-updated' as any, onNameUpdated as any);
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  // Keep cache fresh when name is set
  useEffect(() => {
    if (greetingName) {
      try { localStorage.setItem('scio_display_name', greetingName); } catch {}
    }
  }, [greetingName]);

  // Update on window focus
  useEffect(() => {
    const onFocus = () => {
      try {
        const cached = localStorage.getItem('scio_display_name');
        if (cached && cached.trim()) setGreetingName((prev) => prev || cached.trim());
      } catch {}
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  const resolvedName = (greetingNameProp && greetingNameProp.trim()) || (greetingName && greetingName.trim()) || '';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`rounded-lg p-6 pt-5 md:pt-6 h-32 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {/* Mobile: show "Hi," only when a name is present; otherwise keep default */}
            <span className="md:hidden">
              {resolvedName
                ? (
                  <>
                    Hi, <span key={resolvedName}>{resolvedName}</span>! 👋
                  </>
                )
                : (
                  <>Welcome back! 👋</>
                )}
            </span>
            {/* Desktop and up: keep original phrasing */}
            <span className="hidden md:inline">
              Welcome back
              <span key={resolvedName}>{resolvedName ? `, ${resolvedName}` : ''}</span>
              ! 👋
            </span>
          </h1>
          <p className={`md:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Ready to tackle some Science Olympiad questions?
          </p>
        </div>
        
        {/* Desktop-only theme toggle button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setDarkMode(!darkMode)}
          className={`hidden md:block p-3 rounded-lg transition-colors ${
            darkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
} 