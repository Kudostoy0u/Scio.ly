'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User } from '@supabase/supabase-js';
import { Eye, EyeOff, X, Settings, Trophy, Bell } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNotifications } from '@/app/contexts/NotificationsContext';


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
  const modalRef = useRef<HTMLDivElement>(null);
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


  const preloadImage = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
  };

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
        console.warn('Non-fatal global sign-out issue:', err);
      });


      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
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
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={async () => {
            const nextOpen = !isDropdownOpen;
            setIsDropdownOpen(nextOpen);
            if (nextOpen) {
              try { await refresh(false); } catch {} // Use cached data if available
            }
          }}
          className={`flex items-center space-x-2 border rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            darkMode 
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' 
              : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
          }`}
        >
          {unread > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white text-[10px]">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt="Profile"
              width={24}
              height={24}
              className="w-6 h-6 rounded-full"
            />
          ) : user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
            <Image
              src={user.user_metadata.avatar_url || user.user_metadata.picture}
              alt="Profile"
              width={24}
              height={24}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
              {(user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="hidden sm:block">
            {displayName || username || user.email?.split('@')[0] || 'User'}
          </span>
          
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div
            className={`absolute right-0 top-full mt-2 w-64 rounded-md shadow-lg py-1 border z-50 ${
              darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
            }`}
          >
            <div className={`px-4 py-2 text-sm border-b ${darkMode ? 'text-gray-200 border-gray-600' : 'text-gray-700 border-gray-100'}`}>
              <div className="font-medium truncate">{displayName || username || 'User'}</div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} break-all`}>{username || (user.email?.split('@')[0] || '')}</div>
            </div>
            {/* Notifications */}
            <div className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</div>
                <div className="flex items-center gap-2">
                  {unread > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white text-[10px]">{unread > 9 ? '9+' : unread}</span>}
                  <div className="flex items-center gap-2">
                    {notifs.length > 0 && (
                      <button
                        disabled={clearingAll}
                        onClick={async () => {
                          setClearingAll(true);
                          await markAllRead();
                          setClearingAll(false);
                        }}
                        className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'} text-[10px] underline`}
                        title="Clear all notifications"
                      >
                        {clearingAll ? 'Clearing…' : 'Clear all'}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        try { await refresh(true); } catch {} // Force refresh from server
                      }}
                      className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'} text-[10px] underline`}
                      title="Refresh notifications"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2 max-h-56 overflow-auto space-y-2">
                {notifs.length === 0 ? (
                  <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>No notifications</div>
                ) : (
                  notifs.map((n) => (
                    <div key={n.id} className={`rounded border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-2 text-xs`}>
                      <div className="font-medium">{n.title}</div>
                      {!!n.body && <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{n.body}</div>}
                      {n.type === 'assignment' ? (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await markReadById(n.id);
                              window.location.href = n.data?.url || '/test';
                            }}
                            className={`px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700`}
                          >
                            Start
                          </button>
                          <button
                            onClick={async () => {
                              await markReadById(n.id);
                            }}
                            className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                          >
                            Decline
                          </button>
                        </div>
                      ) : n.type === 'team_invite' && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/notifications/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id, school: n.data?.school, division: n.data?.division, teamId: n.data?.teamId, memberName: n.data?.memberName }) });
                                const j = await res.json();
                                if (res.ok && j?.success) {
                                  await markReadById(n.id);
                                  if (j?.slug) window.location.href = `/teams/${j.slug}`;
                                }
                              } catch {}
                            }}
                            className={`px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700`}
                          >
                            Accept
                          </button>
                          <button
                            onClick={async () => {
                              await markReadById(n.id);
                            }}
                            className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <Link href="/leaderboard" className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 flex items-center gap-2 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Trophy className="w-4 h-4" />
              Leaderboards
            </Link>
            <Link href="/profile" className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 flex items-center gap-2 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Settings className="w-4 h-4" />
              Profile Settings
            </Link>
            <button onClick={handleSignOut} className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              Sign out
            </button>
          </div>
        )}
      </div>
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

      {showSignInModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999]" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }}
          onMouseDown={() => { setShowSignInModal(false); resetForm(); }}
        >
          <div
            ref={modalRef}
            className={`relative rounded-lg p-6 w-full max-w-md ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowSignInModal(false);
                resetForm();
              }}
              className={`absolute top-4 right-4 transition-colors duration-200 ${
                darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Sign Up' : 'Reset Password'}
              </h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                {authMode === 'signin' 
                  ? 'Welcome back! Sign in to continue your learning journey.'
                  : authMode === 'signup'
                  ? 'Join Scio.ly to start practicing Science Olympiad questions.'
                  : 'Enter your email to receive a password reset link.'
                }
              </p>
            </div>

            {authMode === 'reset' ? (
              <form onSubmit={(e) => { e.preventDefault(); handlePasswordReset(); }} className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    required
                  />
                </div>

                {authError && (
                  <div className="text-red-500 text-sm bg-red-400 p-3 rounded-lg">
                    {authError}
                  </div>
                )}

                {resetEmailSent && (
                  <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                    Password reset email sent! Check your inbox.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {authLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending Reset Email...
                    </div>
                  ) : (
                    'Send Reset Email'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={resetForm}
                    className={`${subtleLinkClass} text-sm`}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form onSubmit={(e) => { e.preventDefault(); handleEmailPasswordAuth(); }} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      required
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 ${
                        darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {authMode === 'signup' && (
                    <div>
                      <input
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  {authError && (
                    <div className="text-white text-sm bg-red-400 p-3 rounded-lg">
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg">
                      {authSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    {authLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {authMode === 'signin' ? 'Signing In...' : 'Signing Up...'}
                      </div>
                    ) : (
                      authMode === 'signin' ? 'Sign In' : 'Sign Up'
                    )}
                  </button>

                  {authMode === 'signin' && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('reset');
                          setAuthError('');
                        }}
                        className={`${subtleLinkClass} text-sm`}
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}
                </form>

                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={oauthLoading || isOffline}
                      className={`w-full rounded-lg px-4 py-2 flex items-center justify-center gap-3 transition-colors duration-200 border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode
                          ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-100 shadow disabled:opacity-100 disabled:bg-gray-700 disabled:text-gray-100 disabled:border-gray-600'
                          : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-900 shadow-sm disabled:opacity-100 disabled:bg-white disabled:text-gray-900 disabled:border-gray-300'
                      }`}
                    >
                      <Image src="/about/google-icon.png" alt="Google" width={18} height={18} />
                      {oauthLoading ? 'Connecting…' : 'Continue with Google'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      setAuthError('');
                    }}
                    className={`${subtleLinkClass} text-sm`}
                  >
                    {authMode === 'signin' 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Sign in"
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}