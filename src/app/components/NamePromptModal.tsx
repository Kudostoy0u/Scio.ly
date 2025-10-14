'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Edit3 } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/app/contexts/ThemeContext';

interface NamePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName?: string;
  currentEmail?: string;
  onSave?: () => void;
}

export default function NamePromptModal({ 
  isOpen, 
  onClose, 
  currentName = '@unknown',
  currentEmail = '',
  onSave
}: NamePromptModalProps) {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // Pre-fill with email local part if available
      if (currentEmail && currentEmail.includes('@')) {
        const emailLocal = currentEmail.split('@')[0];
        if (emailLocal && emailLocal.length > 2 && !emailLocal.match(/^[a-f0-9]{8}$/)) {
          setUsername(emailLocal);
          if (currentName === '@unknown' || currentName.startsWith('User ')) {
            setDisplayName(emailLocal);
          }
        }
      }
    }
  }, [isOpen, user, currentEmail, currentName]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError('');

    try {
      // Validate inputs
      if (!displayName.trim()) {
        setError('Please provide a display name');
        setSaving(false);
        return;
      }

      if (username && username.length < 3) {
        setError('Username must be at least 3 characters long');
        setSaving(false);
        return;
      }

      // Build update payload
      const updateData: any = {
        id: user.id,
        email: user.email || currentEmail,
      };

      if (displayName.trim()) updateData.display_name = displayName.trim();
      if (username.trim()) updateData.username = username.trim();

      const { error: updateError } = await supabase
        .from('users')
        .upsert(updateData, { onConflict: 'id' });

      if (updateError) {
        if (updateError.code === '23505') {
          setError('That username is already taken. Please choose a different one.');
        } else {
          setError('Failed to update profile. Please try again.');
        }
        setSaving(false);
        return;
      }

      setSuccess(true);
      
      // Update localStorage
      try {
        if (displayName.trim()) {
          localStorage.setItem(`scio_display_name_${user.id}`, displayName.trim());
          localStorage.setItem('scio_display_name', displayName.trim());
          window.dispatchEvent(new CustomEvent('scio-display-name-updated', { 
            detail: displayName.trim() 
          }));
        }
        if (username.trim()) {
          localStorage.setItem(`scio_username_${user.id}`, username.trim());
        }
      } catch {
        // Ignore localStorage errors
      }

      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }

      // Close modal after a brief success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className={`w-full max-w-md rounded-lg shadow-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              darkMode ? 'bg-blue-900' : 'bg-blue-100'
            }`}>
              <Edit3 className={`w-5 h-5 ${
                darkMode ? 'text-blue-300' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Complete Your Profile
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Help others recognize you in teams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-opacity-10 ${
              darkMode ? 'hover:bg-white' : 'hover:bg-gray-900'
            }`}
          >
            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                darkMode ? 'bg-green-900' : 'bg-green-100'
              }`}>
                <User className={`w-8 h-8 ${
                  darkMode ? 'text-green-300' : 'text-green-600'
                }`} />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Profile Updated!
              </h3>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Your name will now appear properly in teams.
              </p>
            </div>
          ) : (
            <>
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-yellow-900 bg-opacity-30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <User className={`w-5 h-5 mt-0.5 ${
                    darkMode ? 'text-yellow-300' : 'text-yellow-600'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-yellow-200' : 'text-yellow-800'
                    }`}>
                      Current name: {currentName}
                    </p>
                    <p className={`text-xs mt-1 ${
                      darkMode ? 'text-yellow-300' : 'text-yellow-700'
                    }`}>
                      Let&apos;s give you a proper name that others can recognize!
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className={`p-3 rounded-lg text-sm ${
                  darkMode ? 'bg-red-900 bg-opacity-30 text-red-200' : 'bg-red-50 text-red-800'
                }`}>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How you'd like to be called"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>


                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Unique username (optional)"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                {currentEmail && (
                  <div className={`flex items-center space-x-2 text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <Mail className="w-4 h-4" />
                    <span>{currentEmail}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className={`flex items-center justify-end space-x-3 p-6 border-t ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                darkMode 
                  ? 'text-gray-400 hover:text-gray-300' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Skip for now
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !displayName.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                saving || !displayName.trim()
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
