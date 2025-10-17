'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'react-toastify';
import TeamsLanding from './TeamsLanding';
import CreateTeamModal from './CreateTeamModal';
import JoinTeamModal from './JoinTeamModal';
import { useTeamStore } from '@/app/hooks/useTeamStore';
import { trpc } from '@/lib/trpc/client';

interface TeamsPageClientProps {
  initialLinkedSelection?: { school: string; division: 'B'|'C'; team_id: string; member_name?: string } | null;
  initialGroupSlug?: string | null;
}

// Use UserTeam from the cache utility instead of defining our own

export default function TeamsPageClient({ initialLinkedSelection: _initialLinkedSelection, initialGroupSlug: _initialGroupSlug }: TeamsPageClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  // Use team store instead of separate state management
  const { userTeams, isUserTeamsLoading: isLoading, invalidateCache } = useTeamStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [teamMemberCounts, setTeamMemberCounts] = useState<Record<string, { total: number; captains: number }>>({});

  // User teams are now loaded by the enhanced hook automatically
  
  // Use tRPC to batch load member counts for all teams at once
  const utils = trpc.useUtils();
  
  useEffect(() => {
    const loadMemberCounts = async () => {
      const counts: Record<string, { total: number; captains: number }> = {};
      
      // Batch load members for all teams using Promise.all
      const memberPromises = userTeams.map(async (userTeam) => {
        try {
          const result = await utils.teams.getMembers.fetch({ 
            teamSlug: userTeam.slug, 
            subteamId: 'all' 
          });
          
          counts[userTeam.slug] = {
            total: result.members.length,
            captains: result.members.filter(m => m.role === 'captain').length
          };
        } catch (error) {
          console.error(`Failed to load members for team ${userTeam.slug}:`, error);
          counts[userTeam.slug] = { total: 0, captains: 0 };
        }
      });
      
      await Promise.all(memberPromises);
      setTeamMemberCounts(counts);
    };

    if (userTeams.length > 0) {
      loadMemberCounts();
    }
  }, [userTeams, utils]);
  
  // Convert UserTeam to Team format for TeamsLanding
  const teamsForLanding = userTeams.map(userTeam => ({
    id: userTeam.id,
    name: userTeam.name || `${userTeam.school} ${userTeam.division}`,
    slug: userTeam.slug,
    school: userTeam.school,
    division: userTeam.division,
    members: teamMemberCounts[userTeam.slug] ? 
      Array.from({ length: teamMemberCounts[userTeam.slug].total }, (_, i) => ({
        id: `member-${i}`,
        name: `Member ${i + 1}`,
        email: `member${i + 1}@example.com`,
        role: (i < teamMemberCounts[userTeam.slug].captains ? 'captain' : 'member') as 'captain' | 'member'
      })) : []
  }));


  const handleCreateTeam = async (teamData: any) => {
    try {
      const response = await fetch('/api/teams/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      if (response.ok) {
        const newTeam = await response.json();
        // Invalidate cache to refresh teams list
        if (user?.id) {
          invalidateCache(`user-teams-${user.id}`);
        }
        
        // If team was reactivated, clear subteams cache to ensure fresh data
        if (newTeam.wasReactivated && newTeam.slug) {
          console.log('Team was reactivated, clearing subteams cache');
          // Clear subteams cache for this team
          if (typeof window !== 'undefined') {
            // Clear localStorage cache
            localStorage.removeItem(`subteams-${newTeam.slug}`);
            // Clear any other relevant caches
            localStorage.removeItem(`roster-${newTeam.slug}`);
            localStorage.removeItem(`members-${newTeam.slug}`);
          }
        }
        
        // Redirect to the team dashboard URL
        if (newTeam && newTeam.slug) {
          router.push(`/teams/${newTeam.slug}`);
        }
        toast.success('Team created successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const handleJoinTeam = async (joinData: any) => {
    try {
      const response = await fetch('/api/teams/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinData),
      });

      if (response.ok) {
        const joinedTeam = await response.json();
        // Invalidate cache to refresh teams list
        if (user?.id) {
          invalidateCache(`user-teams-${user.id}`);
        }
        
        // Redirect to the team dashboard URL
        if (joinedTeam && joinedTeam.slug) {
          router.push(`/teams/${joinedTeam.slug}`);
        }
        toast.success('Successfully joined team!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to join team');
      }
    } catch (error) {
      console.error('Error joining team:', error);
      toast.error('Failed to join team');
    }
  };

  // Removed handleBackToLanding and handleTeamSelect since we only handle landing page now

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <TeamsLanding
        onCreateTeam={() => {
          toast.info('You need to create an account to use teams', {
            onClick: () => router.push('/auth'),
            style: { cursor: 'pointer' }
          });
        }}
        onJoinTeam={() => {
          toast.info('You need to create an account to use teams', {
            onClick: () => router.push('/auth'),
            style: { cursor: 'pointer' }
          });
        }}
        userTeams={[]}
        onTeamSelect={() => {
          toast.info('You need to create an account to use teams', {
            onClick: () => router.push('/auth'),
            style: { cursor: 'pointer' }
          });
        }}
        isPreviewMode={true}
      />
    );
  }

  return (
    <>
      <TeamsLanding
        onCreateTeam={() => setIsCreateModalOpen(true)}
        onJoinTeam={() => setIsJoinModalOpen(true)}
        userTeams={teamsForLanding}
        onTeamSelect={() => {}} // Not used anymore, but keeping for interface compatibility
      />

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTeam={handleCreateTeam}
      />

      <JoinTeamModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinTeam={handleJoinTeam}
      />
    </>
  );
}
