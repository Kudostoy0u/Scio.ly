'use client';
import logger from '@/lib/utils/logger';


import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Users, Plus, LogOut, Copy, Check, User } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import { useAuth } from '@/app/contexts/AuthContext';
import Image from 'next/image';

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
  photo_url: string | null;
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

export default function LeaderboardClientPage() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const { user: authUser, client, loading: authLoading } = useAuth();
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
  const [publicLeaderboard, setPublicLeaderboard] = useState<Leaderboard | null>(null);
  const [hasJoinedPublic, setHasJoinedPublic] = useState<boolean>(false);


  const loadLeaderboardMembers = useCallback(async (leaderboardId: string) => {
    const supabase = client as any;
    const { data, error } = await supabase
      .from('leaderboard_members')
      .select(`
        user_id,
        questions_attempted,
        correct_answers,
        accuracy_percentage,
        users!inner(email, display_name, photo_url)
      `)
      .eq('leaderboard_id', leaderboardId)
      .order('correct_answers', { ascending: false })
      .order('accuracy_percentage', { ascending: false });

    if (error) {
      logger.error('Error loading members:', error);
      return;
    }

    if (data) {
      interface MemberData {
        user_id: string;
        questions_attempted: number | null;
        correct_answers: number | null;
        accuracy_percentage: number | null;
        users: { email: string; display_name: string | null; photo_url: string | null } | { email: string; display_name: string | null; photo_url: string | null }[];
      }
      const membersWithRank = (data as MemberData[]).map((member, index) => {
        const userData = Array.isArray(member.users) ? member.users[0] : member.users;
        return {
          user_id: member.user_id,
          questions_attempted: member.questions_attempted || 0,
          correct_answers: member.correct_answers || 0,
          accuracy_percentage: member.accuracy_percentage || 0,
          display_name: userData?.display_name || null,
          email: userData?.email || '',
          photo_url: userData?.photo_url || null,
          rank: index + 1
        } as LeaderboardMember;
      });
      setMembers(membersWithRank);
    }
  }, [client]);

  const loadUserAndLeaderboards = useCallback(async () => {
    const supabase = client as any;
    if (!authUser) {
      setLoading(false);
      router.replace('/');
      return;
    }
    
    
    const { data: userProfile } = await supabase
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
    
    const { data: leaderboardData, error: leaderboardError } = await supabase
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
      logger.error('Error loading leaderboards:', leaderboardError);
    }

    if (leaderboardData) {
      const userLeaderboards = leaderboardData.map(item => item.leaderboards as unknown as Leaderboard);
      setLeaderboards(userLeaderboards);
      const joinedPublic = userLeaderboards.some(lb => lb.is_public);
      setHasJoinedPublic(joinedPublic);
      if (userLeaderboards.length === 0) {
        setSelectedLeaderboard(null);
      }
    }


    try {
      const { data: pubLb } = await supabase
        .from('leaderboards')
        .select('id,name,description,is_public,join_code,reset_frequency,created_by')
        .eq('is_public', true)
        .limit(1)
        .single();
      setPublicLeaderboard(pubLb ?? null);
    } catch {
      setPublicLeaderboard(null);
    }
    setLoading(false);
  }, [client, authUser, router]);

  const canLoad = useMemo(() => !authLoading, [authLoading]);
  useEffect(() => {
    if (!canLoad) return;
    loadUserAndLeaderboards();
  }, [canLoad, loadUserAndLeaderboards]);

  useEffect(() => {
    if (selectedLeaderboard) {
      loadLeaderboardMembers(selectedLeaderboard);
    }
  }, [selectedLeaderboard, loadLeaderboardMembers]);


  useEffect(() => {
    if (!selectedLeaderboard && leaderboards.length > 0) {
      setSelectedLeaderboard(leaderboards[0].id);
    }
  }, [leaderboards, selectedLeaderboard]);

  

  

  const joinPublicLeaderboard = async () => {

    if (!user?.display_name) {
      setPendingLeaderboardAction('public');
      setShowDisplayNameModal(true);
      return;
    }
    const { error } = await client.rpc('join_public_leaderboard');
    if (error) {
      logger.error('Error joining public leaderboard:', error);
    } else {
      await loadUserAndLeaderboards();
    }
  };

  const joinPrivateLeaderboard = async () => {

    if (!user?.display_name) {
      setPendingLeaderboardAction('private');
      setShowDisplayNameModal(true);
      return;
    }
    
    const { error } = await client.rpc('join_leaderboard_by_code', { p_join_code: joinCode });
    if (error) {
      logger.error('Error joining private leaderboard:', error);
    } else {
      setShowJoinModal(false);
      setJoinCode('');
      await loadUserAndLeaderboards();
    }
  };
  
  const handleSetDisplayName = async () => {
    if (!displayName.trim()) return;
    
    const { error } = await (client as any)
      .from('users')
      .update({ display_name: displayName.trim() } as any)
      .eq('id', user?.id);
      
    if (!error) {
      setUser(prev => prev ? { ...prev, display_name: displayName.trim() } : null);
      setShowDisplayNameModal(false);
      

      if (pendingLeaderboardAction === 'public') {
        const { error: joinError } = await client.rpc('join_public_leaderboard');
        if (!joinError) {
          await loadUserAndLeaderboards();
        }
      } else if (pendingLeaderboardAction === 'private' && joinCode) {
        const { error: joinError } = await client.rpc('join_leaderboard_by_code', { p_join_code: joinCode });
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
    const { error } = await client.rpc('leave_leaderboard', { p_leaderboard_id: leaderboardId });
    if (!error) {
      await loadUserAndLeaderboards();
      setSelectedLeaderboard(null);
    }
  };

  const copyJoinLink = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentLeaderboards = leaderboards;

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      <div className={`p-4 pt-20 max-w-7xl mx-auto ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? '' : 'text-gray-900'}`}>
            <Trophy className="w-8 h-8 text-yellow-500" />
            Leaderboards
          </h1>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              aria-label="Join with code"
              title="Join with code"
              className={`${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'} p-2 rounded-lg transition-colors`}
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              aria-label="Create private leaderboard"
              title="Create private leaderboard"
              className={`${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'} p-2 rounded-lg transition-colors`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? '' : 'text-gray-900'}`}>Your Leaderboards</h2>
              <div className="space-y-2">
                {/* Global/Public leaderboard card when not joined */}
                {!hasJoinedPublic && publicLeaderboard && (
                  <div className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex items-start justify-between gap-3`}>
                    <div>
                      <h3 className={`font-medium ${darkMode ? '' : 'text-gray-900'}`}>Global Leaderboard</h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Compete with everyone on Scio.ly</p>
                    </div>
                    <button
                      onClick={joinPublicLeaderboard}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Join
                    </button>
                  </div>
                )}
                {currentLeaderboards.length === 0 ? (
                  <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Join with a code or create a private leaderboard to get started.
                  </p>
                ) : (
                  currentLeaderboards.map(lb => (
                    <div
                      key={lb.id}
                      onClick={() => setSelectedLeaderboard(lb.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        selectedLeaderboard === lb.id
                          ? (darkMode ? 'bg-blue-900/20 border-blue-400' : 'bg-blue-50 border-blue-500')
                          : (darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-100')
                      }`}
                    >
                      {lb.is_public && (
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mb-1 ${darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>Global</span>
                      )}
                      <h3 className={`font-medium ${darkMode ? '' : 'text-gray-900'}`}>{lb.name}</h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                        {lb.description}
                      </p>
                      {lb.join_code && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            {lb.join_code}
                          </code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyJoinLink(lb.join_code!);
                            }}
                            className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
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
              <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-2xl font-semibold ${darkMode ? '' : 'text-gray-900'}`}>Rankings</h2>
                  <button
                    onClick={() => leaveLeaderboard(selectedLeaderboard)}
                    className={`${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} flex items-center gap-2`}
                  >
                    <LogOut className="w-4 h-4" />
                    Leave
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <th className={`text-left py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rank</th>
                        <th className={`text-left py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name</th>
                        <th className={`text-right py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Correct</th>
                        <th className={`text-right py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Attempted</th>
                        <th className={`text-right py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr
                          key={member.user_id}
                          className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${
                            member.user_id === user?.id ? (darkMode ? 'bg-blue-900/10' : 'bg-blue-50') : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            {member.rank === 1 && '🥇'}
                            {member.rank === 2 && '🥈'}
                            {member.rank === 3 && '🥉'}
                            {member.rank! > 3 && member.rank}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center gap-3">
                              {member.photo_url ? (
                                <Image
                                  src={member.photo_url}
                                  alt="Profile"
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-full"
                                  unoptimized
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs" 
                                style={{ display: member.photo_url ? 'none' : 'flex' }}
                              >
                                {(member.display_name || member.email || 'U')[0].toUpperCase()}
                              </div>
                              <span>
                                {member.display_name || member.email.split('@')[0]}
                                {member.user_id === user?.id && ' (You)'}
                              </span>
                            </div>
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
              <div className={`rounded-lg p-12 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm text-center`}>
                <Trophy className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Select a leaderboard to view rankings
                </p>
              </div>
            ) : null}
            {/* If no leaderboards at all, show a helpful prompt */}
            {currentLeaderboards.length === 0 && (
              <div className={`rounded-lg p-12 mt-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm text-center`}>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  You haven&apos;t joined any leaderboards yet. Use the buttons above to join the public leaderboard, join with a code, or create your own.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setShowJoinModal(false)}>
            <div className={`rounded-lg p-6 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
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
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => {
            setShowDisplayNameModal(false);
            setPendingLeaderboardAction(null);
          }}>
            <div className={`rounded-lg p-6 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
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
  const { client } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [resetFrequency, setResetFrequency] = useState('month');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const { data, error } = await client.rpc('create_private_leaderboard', {
      p_name: name,
      p_description: description,
      p_reset_frequency: resetFrequency
    });
    
    if (error) {
      logger.error('Error creating leaderboard:', error);
    } else if (data) {
      onCreated();
      onClose();
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose}>
      <div className={`rounded-lg p-6 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
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


