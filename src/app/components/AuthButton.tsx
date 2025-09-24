'use client';
import logger from '@/lib/utils/logger';


import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
// Image and Link are used within UserDropdown/AuthModal
import { useAuth } from '@/app/contexts/AuthContext';
import { useNotifications } from '@/app/contexts/NotificationsContext';
import AuthModal from './auth/AuthModal';
import UserDropdown from './auth/UserDropdown';
import { preloadImage } from '@/lib/utils/preloadImage';


export default function AuthButton() {
  const { darkMode } = useTheme();
  const { user: ctxUser, client } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const subtleLinkClass = darkMode
    ? 'text-blue-300 hover:text-blue-200'
    : 'text-blue-500 hover:text-blue-600';
  const { notifications: notifs, unreadCount: unread, markAllRead, markReadById, refresh } = useNotifications();
  const [username, setUsername] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);


  useEffect(() => {
    setUser(ctxUser ?? null);
    setLoading(false);
  }, [ctxUser]);
  useEffect(() => {
    if (ctxUser?.id) {
      try {
        const cachedName = localStorage.getItem(`scio_display_name_${ctxUser.id}`);
        if (cachedName) setDisplayName(cachedName);
        const cachedUsername = localStorage.getItem(`scio_username_${ctxUser.id}`);
        if (cachedUsername) setUsername(cachedUsername);
      } catch {}
    }
  }, [ctxUser?.id]);
  // Notifications are now handled globally via NotificationsProvider


  useEffect(() => {
    if (ctxUser?.id) {

      try {
        const cachedPhotoUrl = localStorage.getItem(`scio_profile_photo_${ctxUser.id}`);
        if (cachedPhotoUrl) {
          setPhotoUrl(cachedPhotoUrl);

          preloadImage(cachedPhotoUrl).catch(() => {

            localStorage.removeItem(`scio_profile_photo_${ctxUser.id}`);
            setPhotoUrl(null);
          });
        }
              } catch {

        }
    }
  }, [ctxUser?.id]);


  


  const clearUserFromLocalStorage = () => {
    try {
      localStorage.removeItem('scio_user_data');
      localStorage.setItem('scio_is_logged_in', '0');
      localStorage.removeItem('scio_display_name');

      if (user?.id) {
        localStorage.removeItem(`scio_profile_photo_${user.id}`);
        localStorage.removeItem(`scio_display_name_${user.id}`);
        localStorage.removeItem(`scio_username_${user.id}`);
      }
    } catch {}
  };


  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!window.navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  // moved to '@/lib/utils/preloadImage'

  useEffect(() => {
    let active = true;
    const supabase = client;
    (async () => {
      try {

        if (!ctxUser?.id || typeof ctxUser.id !== 'string' || ctxUser.id.trim() === '') {
          return;
        }
        
        const { data: profile } = await supabase
          .from('users')
          .select('display_name, first_name, photo_url, username')
          .eq('id', ctxUser.id)
          .maybeSingle();
        if (!active) return;
        const dn = (profile as any)?.display_name as string | undefined;
        if (dn) {
          setDisplayName(dn);
          try { localStorage.setItem(`scio_display_name_${ctxUser.id}`, dn); } catch {}
        }
        const un = (profile as any)?.username as string | undefined;
        if (un) {
          setUsername(un);
          try { localStorage.setItem(`scio_username_${ctxUser.id}`, un); } catch {}
        }
        const photo = (profile as any)?.photo_url as string | undefined;
        if (photo) {
          try {

            localStorage.setItem(`scio_profile_photo_${ctxUser.id}`, photo);
            

            await preloadImage(photo);
            if (active) {
              setPhotoUrl(photo);
            }
          } catch {

            localStorage.removeItem(`scio_profile_photo_${ctxUser.id}`);
          }
        }
      } catch {}
    })();
    return () => { active = false; };
  }, [client, ctxUser?.id]);

  const handleEmailPasswordAuth = async () => {
    if (!email || !password) {
      setAuthError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      if (authMode === 'signup') {
        if (!firstName || !lastName) {
          setAuthError('Please enter your first and last name');
          return;
        }
        if (!confirmPassword) {
          setAuthError('Please confirm your password');
          return;
        }
        if (confirmPassword !== password) {
          setAuthError('Passwords do not match');
          return;
        }
        // Pre-check if email already exists in our public users table.
        // If this check is blocked by RLS or fails, we will still rely on the signUp error handling below.
        try {
          const { data: existing, error: existsErr } = await (client as any)
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          if (existing && !existsErr) {
            setAuthError('Email is already in use.');
            return;
          }
        } catch {
          // ignore and proceed to signUp
        }
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
            data: {
              first_name: firstName,
              last_name: lastName,
              name: `${firstName} ${lastName}`.trim(),
              full_name: `${firstName} ${lastName}`.trim(),
            },
          }
        });
        
        if (error) {
          if (
            error.message.includes('already registered') ||
            error.message.includes('already exists') ||
            error.message.includes('already been registered') ||
            error.message.includes('User already registered')
          ) {
            setAuthError('Email is already in use.');
          } else {
            setAuthError(error.message);
          }
        } else {
          if (data.user && data.user.email_confirmed_at) {
            setAuthError('Email is already in use.');
          } else {
            setAuthSuccess('Check your email for the confirmation link. Don\'t forget to check your spam folder.');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setFirstName('');
            setLastName('');
          }
        }
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            try {
              const { data: existing, error: readErr } = await (client as any)
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();
              if (existing && !readErr) {
                setAuthError('Incorrect password.');
              } else if (!existing && !readErr) {
                setAuthError('No account found with this email. Please sign up instead.');
              } else {
                setAuthError('Incorrect email or password.');
              }
            } catch {
              setAuthError('Incorrect email or password.');
            }
          } else {
            setAuthError(error.message);
          }
        } else {
          setShowSignInModal(false);
          setEmail('');
          setPassword('');
        }
      }
    } catch (error) {
      setAuthError(`An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setAuthError('Please enter your email address');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) {
        setAuthError(error.message);
      } else {
        setResetEmailSent(true);
      }
    } catch (error) {
      setAuthError(`An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setOauthLoading(true);
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) {
        setAuthError(error.message);
      }
    } catch (err) {
      setAuthError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {

      setOauthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {

      await client.auth.signOut({ scope: 'local' }).catch(() => undefined);

      try {
        const { resetAllLocalStorageExceptTheme } = await import('@/app/utils/dashboardData');
        resetAllLocalStorageExceptTheme();
      } catch {
        clearUserFromLocalStorage();
      }
      setUser(null);
      setIsDropdownOpen(false);


      client.auth.signOut({ scope: 'global' }).catch((err) => {
        logger.warn('Non-fatal global sign-out issue:', err);
      });


      window.location.reload();
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthSuccess('');
    setResetEmailSent(false);
    setAuthMode('signin');
    setFirstName('');
    setLastName('');
    setConfirmPassword('');
  };


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return (
      <UserDropdown
        darkMode={!!darkMode}
        user={user}
        photoUrl={photoUrl}
        displayName={displayName}
        username={username}
        unread={unread}
        notifs={notifs as any}
        refresh={async (force?: boolean) => { try { await refresh(!!force); } catch {} }}
        markAllRead={markAllRead}
        markReadById={markReadById}
        handleSignOut={handleSignOut}
        clearingAll={clearingAll}
        setClearingAll={setClearingAll}
        isDropdownOpen={isDropdownOpen}
        setIsDropdownOpen={setIsDropdownOpen}
        dropdownRef={dropdownRef}
        triggerRef={triggerRef}
      />
    );
  }

  return (
    <>
      <button
        onClick={() => setShowSignInModal(true)}
        className={`px-2 py-2 text-sm font-medium transition-colors duration-200 ${
          darkMode 
            ? 'text-blue-400 hover:text-blue-300' 
            : 'text-blue-500 hover:text-blue-600'
        }`}
      >
        Sign In
      </button>

      <AuthModal
        open={showSignInModal}
        darkMode={!!darkMode}
        authMode={authMode}
        setAuthMode={(m)=>{ setAuthMode(m); if (m==='signin') setAuthError(''); }}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        authError={authError}
        authSuccess={authSuccess}
        authLoading={authLoading}
        oauthLoading={oauthLoading}
        isOffline={isOffline}
        subtleLinkClass={subtleLinkClass}
        resetEmailSent={resetEmailSent}
        onClose={()=>{ setShowSignInModal(false); resetForm(); }}
        handlePasswordReset={handlePasswordReset}
        handleEmailPasswordAuth={handleEmailPasswordAuth}
        handleGoogleSignIn={handleGoogleSignIn}
      />
    </>
  );
}