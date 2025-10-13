'use client';

import React, { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { X, UserPlus, Send } from 'lucide-react';

interface InlineInviteProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string) => void;
}

export default function InlineInvite({ isOpen, onClose, onSubmit }: InlineInviteProps) {
  const { darkMode } = useTheme();
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      setSubmitting(true);
      await onSubmit(username.trim());
      setUsername('');
      onClose();
    } catch (error) {
      console.error('Error submitting invite:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`p-4 rounded-lg border ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center space-x-3 sm:space-x-4">
        <UserPlus className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3">
          <input
            type="text"
            placeholder="Enter username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
              darkMode 
                ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
            }`}
            autoFocus
          />
          <button
            type="submit"
            disabled={!username.trim() || submitting}
            className={`px-4 py-2 rounded-lg font-medium transition-colors sm:w-auto w-full ${
              username.trim() && !submitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors sm:w-auto w-full ${
              darkMode 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-200 text-gray-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
