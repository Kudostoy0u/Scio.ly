'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Users, Plus, LogOut, Copy, Check, User } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useRouter } from 'next/navigation';

interface Leaderboard {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  join_code: string | null;
  reset_frequency: string;
  created_by: string;
  member_count?: number;
}

interface LeaderboardMember {
  user_id: string;
  display_name: string | null;
  email: string;
  questions_attempted: number;
  correct_answers: number;
  accuracy_percentage: number;
  rank?: number;
}

interface UserProfile {
  id: string;
  email: string;
  display_name?: string | null;
}

export default function LeaderboardPage() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string | null>(null);
  const [members, setMembers] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [pendingLeaderboardAction, setPendingLeaderboardAction] = useState<'public' | 'private' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadUserAndLeaderboards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedLeaderboard) {
      loadLeaderboardMembers(selectedLeaderboard);
    }
  }, [selectedLeaderboard]);

  // Update selected leaderboard when tab changes
  useEffect(() => {
    const publicBoards = leaderboards.filter(lb => lb.is_public);
    const privateBoards = leaderboards.filter(lb => !lb.is_public);
    const currentBoards = activeTab === 'public' ? publicBoards : privateBoards;
    
    // Check if currently selected leaderboard is in the current tab
    const selectedInCurrentTab = currentBoards.some(lb => lb.id === selectedLeaderboard);
    
    if (!selectedInCurrentTab) {
      // Select the first leaderboard in the current tab, or null if none
      setSelectedLeaderboard(currentBoards.length > 0 ? currentBoards[0].id : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leaderboards]);

  const loadUserAndLeaderboards = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/');
      return;
    }
    
    // Load user profile with display name
    const { data: userProfile } = await (supabase as any)
      .from('users')
      .select('display_name')
      .eq('id', authUser.id)
      .single();
    
    if (authUser && authUser.email) {
      setUser({ 
        id: authUser.id, 
        email: authUser.email,
        display_name: userProfile?.display_name 
      });
    }
    
    const { data: leaderboardData, error: leaderboardError } = await (supabase as any)
      .from('leaderboard_members')
      .select(`
        leaderboard_id,
        leaderboards:leaderboards!inner(
          id,
          name,
          description,
          is_public,
          join_code,
          reset_frequency,
          created_by
        )
      `)
      .eq('user_id', authUser.id);
    
    if (leaderboardError) {
      console.error('Error loading leaderboards:', leaderboardError);
    }

    if (leaderboardData) {
      const userLeaderboards = leaderboardData.map(item => item.leaderboards as unknown as Leaderboard);
      setLeaderboards(userLeaderboards);
      
      // Select first leaderboard if any, based on active tab
      if (userLeaderboards.length > 0) {
        const publicBoard = userLeaderboards.find(lb => lb.is_public);
        const privateBoards = userLeaderboards.filter(lb => !lb.is_public);
        
        if (publicBoard) {
          setSelectedLeaderboard(publicBoard.id);
          setActiveTab('public');
        } else if (privateBoards.length > 0) {
          setSelectedLeaderboard(privateBoards[0].id);
          setActiveTab('private');
        }
      } else {
        // No leaderboards, clear selection
        setSelectedLeaderboard(null);
      }
    }
    setLoading(false);
  };

  const loadLeaderboardMembers = async (leaderboardId: string) => {
    const { data, error } = await (supabase as any)
      .from('leaderboard_members')
      .select(`
        user_id,
        questions_attempted,
        correct_answers,
        accuracy_percentage,
        users!inner(email, display_name)
      `)
      .eq('leaderboard_id', leaderboardId)
      .order('correct_answers', { ascending: false })
      .order('accuracy_percentage', { ascending: false });

    if (error) {
      console.error('Error loading members:', error);
      return;
    }

    if (data) {
      interface MemberData {
        user_id: string;
        questions_attempted: number | null;
        correct_answers: number | null;
        accuracy_percentage: number | null;
        users: { email: string; display_name: string | null } | { email: string; display_name: string | null }[];
      }
      
      const membersWithRank = data.map((member: MemberData, index: number) => {
        // Handle both array and object cases for users data
        const userData = Array.isArray(member.users) ? member.users[0] : member.users;
        return {
          user_id: member.user_id,
          questions_attempted: member.questions_attempted || 0,
          correct_answers: member.correct_answers || 0,
          accuracy_percentage: member.accuracy_percentage || 0,
          display_name: userData?.display_name || null,
          email: userData?.email || '',
          rank: index + 1
        } as LeaderboardMember;
      });
      setMembers(membersWithRank);
    }
  };

  const joinPublicLeaderboard = async () => {
    // Check if user has display name
    if (!user?.display_name) {
      setPendingLeaderboardAction('public');
      setShowDisplayNameModal(true);
      return;
    }
    
    const { error } = await supabase.rpc('join_public_leaderboard');
    if (error) {
      console.error('Error joining public leaderboard:', error);
    } else {
      await loadUserAndLeaderboards();
    }
  };

  const joinPrivateLeaderboard = async () => {
    // Check if user has display name
    if (!user?.display_name) {
      setPendingLeaderboardAction('private');
      setShowDisplayNameModal(true);
      return;
    }
    
    const { error } = await supabase.rpc('join_leaderboard_by_code', { p_join_code: joinCode });
    if (error) {
      console.error('Error joining private leaderboard:', error);
    } else {
      setShowJoinModal(false);
      setJoinCode('');
      await loadUserAndLeaderboards();
    }
  };
  
  const handleSetDisplayName = async () => {
    if (!displayName.trim()) return;
    
    const { error } = await (supabase as any)
      .from('users')
      .update({ display_name: displayName.trim() } as any)
      .eq('id', user?.id);
      
    if (!error) {
      setUser(prev => prev ? { ...prev, display_name: displayName.trim() } : null);
      setShowDisplayNameModal(false);
      
      // Continue with pending action - directly call RPC since we now have display name
      if (pendingLeaderboardAction === 'public') {
        const { error: joinError } = await supabase.rpc('join_public_leaderboard');
        if (!joinError) {
          await loadUserAndLeaderboards();
        }
      } else if (pendingLeaderboardAction === 'private' && joinCode) {
        const { error: joinError } = await supabase.rpc('join_leaderboard_by_code', { p_join_code: joinCode });
        if (!joinError) {
          setShowJoinModal(false);
          setJoinCode('');
          await loadUserAndLeaderboards();
        }
      }
      setPendingLeaderboardAction(null);
    }
  };

  const leaveLeaderboard = async (leaderboardId: string) => {
    const { error } = await supabase.rpc('leave_leaderboard', { p_leaderboard_id: leaderboardId });
    if (!error) {
      await loadUserAndLeaderboards();
      setSelectedLeaderboard(null);
    }
  };

  const copyJoinLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/leaderboard/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const publicLeaderboards = leaderboards.filter(lb => lb.is_public);
  const privateLeaderboards = leaderboards.filter(lb => !lb.is_public);
  const currentLeaderboards = activeTab === 'public' ? publicLeaderboards : privateLeaderboards;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`p-4 pt-20 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Leaderboards
          </h1>
          
          <div className="flex gap-2">
            {activeTab === 'public' && publicLeaderboards.length === 0 && (
              <button
                onClick={joinPublicLeaderboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Join Public Leaderboard
              </button>
            )}
            {activeTab === 'private' && (
              <>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Join with Code
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Private
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'public'
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'private'
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'
            }`}
          >
            Private
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h2 className="text-xl font-semibold mb-4">Your Leaderboards</h2>
              <div className="space-y-2">
                {currentLeaderboards.length === 0 ? (
                  <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {activeTab === 'public' 
                      ? 'Join the public leaderboard to compete!'
                      : 'Join or create a private leaderboard to get started.'}
                  </p>
                ) : (
                  currentLeaderboards.map(lb => (
                    <div
                      key={lb.id}
                      onClick={() => setSelectedLeaderboard(lb.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedLeaderboard === lb.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                          : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <h3 className="font-medium">{lb.name}</h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {lb.description}
                      </p>
                      {lb.join_code && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {lb.join_code}
                          </code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyJoinLink(lb.join_code!);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedLeaderboard && currentLeaderboards.length > 0 ? (
              <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Rankings</h2>
                  <button
                    onClick={() => leaveLeaderboard(selectedLeaderboard)}
                    className="text-red-600 hover:text-red-700 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <th className="text-left py-3 px-4">Rank</th>
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-right py-3 px-4">Correct</th>
                        <th className="text-right py-3 px-4">Attempted</th>
                        <th className="text-right py-3 px-4">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr
                          key={member.user_id}
                          className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${
                            member.user_id === user?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            {member.rank === 1 && '🥇'}
                            {member.rank === 2 && '🥈'}
                            {member.rank === 3 && '🥉'}
                            {member.rank! > 3 && member.rank}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {member.display_name || member.email.split('@')[0]}
                            {member.user_id === user?.id && ' (You)'}
                          </td>
                          <td className="text-right py-3 px-4">{member.correct_answers}</td>
                          <td className="text-right py-3 px-4">{member.questions_attempted}</td>
                          <td className="text-right py-3 px-4">{member.accuracy_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : currentLeaderboards.length > 0 ? (
              <div className={`rounded-lg p-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg text-center`}>
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  Select a leaderboard to view rankings
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`rounded-lg p-6 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="text-xl font-semibold mb-4">Join Private Leaderboard</h3>
              <input
                type="text"
                placeholder="Enter join code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'border-gray-300 text-gray-900'
                }`}
                maxLength={6}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={joinPrivateLeaderboard}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && <CreateLeaderboardModal onClose={() => setShowCreateModal(false)} onCreated={loadUserAndLeaderboards} />}
        
        {/* Display Name Modal */}
        {showDisplayNameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`rounded-lg p-6 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Set Your Display Name
              </h3>
              <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Please set a display name to join leaderboards. This name will be visible to other users.
              </p>
              <input
                type="text"
                placeholder="Enter display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg mb-4 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'border-gray-300 text-gray-900'
                }`}
                maxLength={50}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDisplayNameModal(false);
                    setPendingLeaderboardAction(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetDisplayName}
                  disabled={!displayName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  Set Name
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateLeaderboardModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { darkMode } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [resetFrequency, setResetFrequency] = useState('month');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const { data, error } = await supabase.rpc('create_private_leaderboard', {
      p_name: name,
      p_description: description,
      p_reset_frequency: resetFrequency
    });
    
    if (error) {
      console.error('Error creating leaderboard:', error);
    } else if (data) {
      onCreated();
      onClose();
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-lg p-6 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className="text-xl font-semibold mb-4">Create Private Leaderboard</h3>
        
        <input
          type="text"
          placeholder="Leaderboard name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg mb-3 ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'border-gray-300 text-gray-900'
          }`}
        />
        
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg mb-3 ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'border-gray-300 text-gray-900'
          }`}
          rows={3}
        />
        
        <select
          value={resetFrequency}
          onChange={(e) => setResetFrequency(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg mb-4 ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'border-gray-300 text-gray-900'
          }`}
        >
          <option value="week">Reset Weekly</option>
          <option value="month">Reset Monthly</option>
          <option value="6month">Reset Every 6 Months</option>
          <option value="year">Reset Yearly</option>
          <option value="never">Never Reset</option>
        </select>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name || creating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}