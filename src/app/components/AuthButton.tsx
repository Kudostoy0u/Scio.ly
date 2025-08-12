'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User } from '@supabase/supabase-js';
import { Eye, EyeOff, X, Settings, Trophy } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
// Removed SocialAuth to use a custom-styled Google button

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
  const [oauthLoading, setOauthLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const subtleLinkClass = darkMode
    ? 'text-blue-300 hover:text-blue-200'
    : 'text-blue-500 hover:text-blue-600';

  // Sync with centralized auth context; avoid localStorage hacks
  useEffect(() => {
    setUser(ctxUser ?? null);
    setLoading(false);
  }, [ctxUser]);

  // Save user data to localStorage
  

  // Clear user data from localStorage
  const clearUserFromLocalStorage = () => {
    try {
      localStorage.removeItem('scio_user_data');
      localStorage.setItem('scio_is_logged_in', '0');
      localStorage.removeItem('scio_display_name');
    } catch {}
  };

  // Handle online/offline status
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

  useEffect(() => {
    let active = true;
    const supabase = client;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('display_name, first_name')
          .eq('id', ctxUser?.id || '')
          .maybeSingle();
        if (!active) return;
        const dn = (profile as any)?.display_name as string | undefined;
        if (dn) setDisplayName(dn);
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
          // Check for various error messages that indicate existing account
          if (error.message.includes('already registered') || 
              error.message.includes('already exists') ||
              error.message.includes('already been registered') ||
              error.message.includes('User already registered')) {
            setAuthError('An account with this email already exists. Please sign in instead.');
          } else {
            setAuthError(error.message);
          }
        } else {
          // Check if the response indicates user already exists
          if (data.user && data.user.email_confirmed_at) {
            setAuthError('An account with this email already exists. Please sign in instead.');
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
            setAuthError('No account found with this email. Please sign up instead.');
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
      // Usually redirects immediately; this is just to satisfy UI states in non-redirect environments
      setOauthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Fast local clear to avoid stale UI when session is expired or network is slow
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
      clearUserFromLocalStorage();
      setUser(null);
      setIsDropdownOpen(false);

      // Attempt global sign-out in the background; if it fails, UI is still cleared
      client.auth.signOut({ scope: 'global' }).catch((err) => {
        console.warn('Non-fatal global sign-out issue:', err);
      });

      // Hard reload to ensure all client state is reset
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const compute = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = rect.bottom + 8;
      const tentativeLeft = rect.right - 240; // assume ~240px width
      const left = Math.max(8, Math.min(tentativeLeft, window.innerWidth - 248));
      setDropdownPos({ top, left });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [isDropdownOpen]);

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
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center space-x-2 border rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            darkMode 
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' 
              : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
          }`}
        >
          {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
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
            {displayName || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
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

        {isDropdownOpen && dropdownPos && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, minWidth: 192, zIndex: 10000 }}
            className={`rounded-md shadow-lg py-1 border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
          >
            <div className={`px-4 py-2 text-sm border-b ${darkMode ? 'text-gray-200 border-gray-600' : 'text-gray-700 border-gray-100'}`}>
              <div className="font-medium truncate">{displayName || user.user_metadata?.name || user.user_metadata?.full_name || 'User'}</div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} break-all`}>{user.email}</div>
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
          </div>, document.body
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
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999]" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
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