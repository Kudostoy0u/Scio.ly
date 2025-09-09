'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { X, Copy, Share2, Users, Crown } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';

interface TeamShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: string;
  division: 'B' | 'C';
  isCaptain: boolean;
  onJoinTeam: (teamData: any, type: 'captain' | 'user') => void;
}

export default function TeamShareModal({ 
  isOpen, 
  onClose, 
  school, 
  division, 
  isCaptain, 
  onJoinTeam 
}: TeamShareModalProps) {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'share' | 'join'>('share');
  const [captainCode, setCaptainCode] = useState<string>('');
  const [userCode, setUserCode] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const generateCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const captainResponse = await fetch('/api/teams/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', school, division, type: 'captain' })
      });
      
      const userResponse = await fetch('/api/teams/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', school, division, type: 'user' })
      });
      
      if (captainResponse.ok && userResponse.ok) {
        const captainData = await captainResponse.json();
        const userData = await userResponse.json();
        setCaptainCode(captainData.code);
        setUserCode(userData.code);
      } else {
        throw new Error('Failed to generate codes');
      }
    } catch (err) {
      setError('Failed to generate share codes');
      console.error('Error generating codes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [school, division]);

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/teams/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code: joinCode.trim() })
      });

      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Invalid or expired code');
        return;
      }

      onJoinTeam(result.teamData, result.type);
      setSuccess('Successfully joined team!');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to join team');
      console.error('Error joining team:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(`${type} code copied to clipboard!`);
      setTimeout(() => setSuccess(''), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateCodes();
    }
  }, [isOpen, generateCodes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Team Sharing
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-full hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'share' ? 'border-b-2 border-blue-500' : ''
            }`}
          >
            Share Team
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'join' ? 'border-b-2 border-blue-500' : ''
            }`}
          >
            Join Team
          </button>
        </div>

        {activeTab === 'share' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share these codes with your team members. Codes expire in 24 hours.
            </p>

            {isCaptain && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  Captain Code
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={captainCode}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(captainCode, 'Captain')}
                    className="px-3 py-2 border rounded hover:bg-gray-100"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Share this code with someone who should have captain access
                </p>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                User Code
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={userCode}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(userCode, 'User')}
                  className="px-3 py-2 border rounded hover:bg-gray-100"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Share this code with team members who should have view access
              </p>
            </div>

            <button
              onClick={generateCodes}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isLoading ? 'Generating...' : 'Generate New Codes'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                Enter a code to join a team. You&apos;ll get the appropriate access level based on the code type.
              </p>

            <div>
              <label className="block text-sm font-medium mb-2">Team Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter team code..."
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <button
              onClick={handleJoinTeam}
              disabled={isLoading || !joinCode.trim()}
              className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
            >
              {isLoading ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
