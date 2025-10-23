'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SyncLocalStorage from '@/lib/database/localStorage-replacement';

interface NamePromptState {
  needsPrompt: boolean;
  currentName: string;
  currentEmail: string;
  isLoading: boolean;
}

export function useNamePrompt(): NamePromptState {
  const { user } = useAuth();
  const [state, setState] = useState<NamePromptState>({
    needsPrompt: false,
    currentName: '',
    currentEmail: '',
    isLoading: true
  });

  useEffect(() => {
    const checkNamePrompt = async () => {
      if (!user?.id) {
        setState({
          needsPrompt: false,
          currentName: '',
          currentEmail: '',
          isLoading: false
        });
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('users')
          .select('display_name, first_name, last_name, username, email')
          .eq('id', user.id)
          .maybeSingle() as { data: any; error: any };

        if (error) {
          console.error('Error fetching user profile for name prompt:', error);
          setState({
            needsPrompt: false,
            currentName: '',
            currentEmail: user.email || '',
            isLoading: false
          });
          return;
        }

        const email = profile?.email || user.email || '';
        
        // Check if user needs a name prompt
        let needsPrompt = false;
        let currentName = '';

        if (profile?.display_name && profile.display_name.trim()) {
          currentName = profile.display_name.trim();
        } else if (profile?.first_name && profile?.last_name) {
          currentName = `${profile.first_name.trim()} ${profile.last_name.trim()}`;
        } else if (profile?.first_name && profile.first_name.trim()) {
          currentName = profile.first_name.trim();
        } else if (profile?.last_name && profile.last_name.trim()) {
          currentName = profile.last_name.trim();
        } else if (profile?.username && profile.username.trim() && !profile.username.startsWith('user_')) {
          currentName = `@${profile.username.trim()}`;
        } else if (email && email.includes('@')) {
          const emailLocal = email.split('@')[0];
          if (emailLocal && emailLocal.length > 2 && !emailLocal.match(/^[a-f0-9]{8}$/)) {
            currentName = `@${emailLocal}`;
          } else {
            currentName = '@unknown';
            needsPrompt = true;
          }
        } else {
          currentName = '@unknown';
          needsPrompt = true;
        }

        // Also check for auto-generated names that should prompt for better names
        if (!needsPrompt && (
          currentName.startsWith('User ') ||
          currentName.match(/^[a-f0-9]{8}$/) ||
          (profile?.username && profile.username.startsWith('user_'))
        )) {
          needsPrompt = true;
        }

        // Check if user has already dismissed this prompt recently
        const dismissedKey = `name_prompt_dismissed_${user.id}`;
        const dismissed = SyncLocalStorage.getItem(dismissedKey);
        if (dismissed) {
          const dismissedTime = parseInt(dismissed, 10);
          const now = Date.now();
          // Don't prompt again for 7 days
          if (now - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
            needsPrompt = false;
          }
        }

        setState({
          needsPrompt,
          currentName,
          currentEmail: email,
          isLoading: false
        });

      } catch (error) {
        console.error('Error in useNamePrompt:', error);
        setState({
          needsPrompt: false,
          currentName: '',
          currentEmail: user.email || '',
          isLoading: false
        });
      }
    };

    checkNamePrompt();
  }, [user?.id, user?.email]);

  return state;
}

export function dismissNamePrompt(userId: string) {
  const dismissedKey = `name_prompt_dismissed_${userId}`;
  SyncLocalStorage.setItem(dismissedKey, Date.now().toString());
}
