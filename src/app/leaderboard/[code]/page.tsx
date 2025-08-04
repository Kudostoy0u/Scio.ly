'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function JoinLeaderboardPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg">Joining leaderboard...</p>
      </div>
    </div>
  );
}