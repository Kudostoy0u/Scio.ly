'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WelcomeMessageProps } from '../types';

export default function WelcomeMessage({ darkMode, currentUser, setDarkMode }: WelcomeMessageProps) {
  const [greetingName, setGreetingName] = useState<string>(() => {
    try {
      const cachedFirst = typeof window !== 'undefined' ? localStorage.getItem('scio_display_name') : null;
      if (cachedFirst && cachedFirst.trim()) return cachedFirst.trim();
      // Avoid using username/email; we will resolve asynchronously to a first name if available
    } catch {}
    return '';
  });

  useEffect(() => {
    const resolveName = async () => {
      // 1) Try users table: first_name, then display_name
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || currentUser?.id || null;
        const email = user?.email || currentUser?.email || '';
        if (userId) {
          const { data } = await supabase
            .from('users')
            .select('first_name, display_name')
            .eq('id', userId)
            .single();
          const first = (data as any)?.first_name as string | undefined;
          const display = (data as any)?.display_name as string | undefined;
          if (first && first.trim()) {
            const name = first.trim();
            setGreetingName(name);
            try { localStorage.setItem('scio_display_name', name); } catch {}
            return;
          }
          if (display && display.trim()) {
            const name = display.trim().split(' ')[0];
            setGreetingName(name);
            try { localStorage.setItem('scio_display_name', name); } catch {}
            return;
          }
        }

        // 2) Fallback to auth metadata first_name/name (prefer auth user, then currentUser)
        const authFirst = (user?.user_metadata?.first_name as string | undefined) ||
          ((user?.user_metadata?.name as string | undefined) || (user?.user_metadata?.full_name as string | undefined) || '')
            .split(' ').filter(Boolean)[0];
        const propFirst = (currentUser?.user_metadata?.first_name as string | undefined) ||
          ((currentUser?.user_metadata?.name as string | undefined) || (currentUser?.user_metadata?.full_name as string | undefined) || '')
            .split(' ').filter(Boolean)[0];
        const metaFirst = authFirst || propFirst;
        if (metaFirst && metaFirst.trim()) {
          setGreetingName(metaFirst.trim());
          try { localStorage.setItem('scio_display_name', metaFirst.trim()); } catch {}
          return;
        }

        // 3) Fallback to email local part
        if (email) {
          const fallback = email.split('@')[0];
          if (fallback) {
            setGreetingName(fallback);
            try { localStorage.setItem('scio_display_name', fallback); } catch {}
          }
          return;
        }
        // No-op if nothing resolved; preserve any existing cached name to avoid clearing UI
      } catch {
        // Fallbacks only
        const email = currentUser?.email || '';
        const metaFirst = (currentUser?.user_metadata?.first_name as string | undefined) ||
          ((currentUser?.user_metadata?.name as string | undefined) || (currentUser?.user_metadata?.full_name as string | undefined) || '')
            .split(' ').filter(Boolean)[0];
        const fallback = metaFirst || (email ? email.split('@')[0] : '');
        if (fallback) {
          setGreetingName(fallback);
          try { localStorage.setItem('scio_display_name', fallback); } catch {}
        }
      }
    };
    resolveName();
  }, [currentUser]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome back
            <span suppressHydrationWarning>
              {greetingName ? `, ${greetingName}` : ''}
            </span>
            ! 👋
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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