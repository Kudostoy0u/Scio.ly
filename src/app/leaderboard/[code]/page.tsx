'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';

export default function JoinLeaderboardPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const getCode = async () => {
      const { code: resolvedCode } = await params;
      setCode(resolvedCode);
    };
    getCode();
  }, [params]);

  const joinLeaderboard = useCallback(async () => {
    if (!code) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Redirect to home with join code in query params
      router.push(`/?join=${code}`);
      return;
    }

    // Try to join the leaderboard
    const { error } = await supabase.rpc('join_leaderboard_by_code', { 
      p_join_code: code.toUpperCase() 
    });

    if (error) {
      console.error('Error joining leaderboard:', error);
      router.push('/leaderboard');
    } else {
      router.push('/leaderboard');
    }
  }, [code, router]);

  useEffect(() => {
    if (code) {
      joinLeaderboard();
    }
  }, [joinLeaderboard, code]);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      <div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Joining leaderboard...</p>
        </div>
      </div>
    </div>
  );
}