'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'react-toastify';
import { UserPlus, Crown, Link2Off, Link, ArrowUpCircle, X, AlertTriangle, Edit3 } from 'lucide-react';
import InlineInvite from './InlineInvite';
import LinkInvite from './LinkInvite';
// Removed tRPC import - using centralized team store instead
import { generateDisplayName, needsNamePrompt } from '@/lib/utils/displayNameUtils';
import NamePromptModal from '@/app/components/NamePromptModal';
import { useTeamStore } from '@/app/hooks/useTeamStore';
import { invalidateCache } from '@/lib/cache/teamCacheManager';
import { trpc } from '@/lib/trpc/client';

// Division groups data
const DIVISION_B_GROUPS = [
  { label: 'Conflict Block 1', events: ['Codebusters', 'Disease Detectives', 'Remote Sensing'], colorKey: 'blue' },
  { label: 'Conflict Block 2', events: ['Entomology', 'Experimental Design', 'Solar System'], colorKey: 'green' },
  { label: 'Conflict Block 3', events: ['Machines', 'Meteorology', 'Metric Mastery'], colorKey: 'yellow' },
  { label: 'Conflict Block 4', events: ['Circuit Lab', 'Dynamic Planet', 'Water Quality'], colorKey: 'purple' },
  { label: 'Conflict Block 5', events: ['Heredity', 'Potions & Poisons', 'Rocks and Minerals'], colorKey: 'pink' },
  { label: 'Conflict Block 6', events: ['Anatomy & Physiology', 'Crime Busters', 'Write It Do It'], colorKey: 'indigo' },
  { label: 'Conflict Block 7', events: ['Boomilever', 'Helicopter', 'Hovercraft', 'Mission Possible', 'Scrambler'], colorKey: 'orange' },
];

const DIVISION_C_GROUPS = [
  { label: 'Conflict Block 1', events: ['Anatomy & Physiology', 'Engineering CAD', 'Forensics'], colorKey: 'blue' },
  { label: 'Conflict Block 2', events: ['Codebusters', 'Disease Detectives', 'Remote Sensing'], colorKey: 'green' },
  { label: 'Conflict Block 3', events: ['Astronomy', 'Entomology', 'Experimental Design'], colorKey: 'yellow' },
  { label: 'Conflict Block 4', events: ['Chemistry Lab', 'Machines'], colorKey: 'purple' },
  { label: 'Conflict Block 5', events: ['Circuit Lab', 'Dynamic Planet', 'Water Quality'], colorKey: 'pink' },
  { label: 'Conflict Block 6', events: ['Designer Genes', 'Materials Science', 'Rocks and Minerals'], colorKey: 'indigo' },
  { label: 'Conflict Block 7', events: ['Boomilever', 'Bungee Drop', 'Electric Vehicle', 'Helicopter', 'Hovercraft', 'Robot Tour'], colorKey: 'orange' },
];

interface PeopleTabProps {
  team: {
    id: string;
    school: string;
    division: 'B' | 'C';
    slug: string;
  };
  isCaptain: boolean;
  onInvitePerson: () => void;
  activeSubteamId?: string | null;
  subteams?: Array<{
    id: string;
    name: string;
    team_id: string;
    description: string;
    created_at: string;
  }>;
  onSubteamChange?: (subteamId: string) => void;
}

interface Member {
  id: string | null; // null for unlinked roster members
  name: string | null; // Can be null for unlinked roster members
  email: string | null; // null for unlinked roster members
  username?: string | null; // null for unlinked roster members
  role: string;
  joinedAt?: string | null;
  subteam?: {
    id: string;
    name: string;
    description: string;
  };
  subteams?: Array<{
    id: string;
    name: string;
    description: string;
    events?: string[];
  }>;
  subteamId?: string;
  events: string[];
  eventCount?: number;
  avatar?: string;
  isOnline?: boolean;
  hasPendingInvite?: boolean;
  hasPendingLinkInvite?: boolean;
  isPendingInvitation?: boolean;
  invitationCode?: string;
  isUnlinked?: boolean; // true for unlinked roster members
  conflicts?: Array<{
    events: string[];
    conflictBlock: string;
    conflictBlockNumber: number;
  }>;
}

// Helper function to safely get display name
function getDisplayName(member: Member): string {
  if (member.name && typeof member.name === 'string' && member.name.trim().length > 0) {
    return member.name;
  }
  if (member.email && typeof member.email === 'string') {
    return member.email.split('@')[0];
  }
  if (member.username && typeof member.username === 'string') {
    return member.username;
  }
  return 'Unknown User';
}

export default function PeopleTab({ 
  team, 
  isCaptain, 
  onInvitePerson: _onInvitePerson, 
  activeSubteamId: _activeSubteamId, 
  subteams = [], 
  onSubteamChange: _onSubteamChange 
}: PeopleTabProps) {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  // Removed filteredMembers state - using computed value directly
  const [selectedSubteam, setSelectedSubteam] = useState<string>('all');
  const prevMembersDataRef = useRef<string>('');
  
  // Use centralized team store for data fetching
  const {
    getMembers,
    loadMembers,
    // isMembersLoading,
    // getMembersError
  } = useTeamStore();

  // tRPC mutations
  const updateRosterMutation = trpc.teams.updateRoster.useMutation();
  const removeRosterEntryMutation = trpc.teams.removeRosterEntry.useMutation();

  // Load members data when component mounts or subteam changes
  useEffect(() => {
    if (team.slug) {
      loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
    }
  }, [team.slug, selectedSubteam, loadMembers]);

  // Get members data from store
  const membersData = getMembers(team.slug, selectedSubteam === 'all' ? 'all' : selectedSubteam);
  // const isLoading = isMembersLoading(team.slug, selectedSubteam === 'all' ? 'all' : selectedSubteam);
  // const error = getMembersError(team.slug, selectedSubteam === 'all' ? 'all' : selectedSubteam);

  // Removed verbose logging - not needed for business logic
  
  // Using tRPC for all data operations - no legacy team store needed
  const [showInlineInvite, setShowInlineInvite] = useState(false);
  const [linkInviteStates, setLinkInviteStates] = useState<Record<string, boolean>>({});
  // Persist optimistic 'Link Pending' state across refetches until explicitly cancelled or linked
  const [pendingLinkInvites, setPendingLinkInvites] = useState<Record<string, boolean>>({});
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showSubteamDropdown, setShowSubteamDropdown] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  
  // Removed custom optimistic updates - using store's built-in optimistic updates

  // Handle clicking on own name to edit it
  const handleNameClick = useCallback((member: Member) => {
    if (member.id === user?.id) {
      setShowNamePrompt(true);
    }
  }, [user?.id]);

  // Handle name update completion
  const handleNameUpdate = useCallback(() => {
    // Refresh the members list to show updated names
    loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
    setShowNamePrompt(false);
  }, [loadMembers, team.slug, selectedSubteam]);

  // Listen for name updates from NamePromptModal and optimistically update UI
  useEffect(() => {
    const onDisplayNameUpdated = (e: Event) => {
      const newName = (e as CustomEvent<string>).detail as string | undefined;
      if (!newName || !user?.id) return;
      // Refresh members from server in background
      loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
    };
    window.addEventListener('scio-display-name-updated', onDisplayNameUpdated as EventListener);
    return () => {
      window.removeEventListener('scio-display-name-updated', onDisplayNameUpdated as EventListener);
    };
  }, [user?.id, loadMembers, team.slug, selectedSubteam]);

  // Conflict detection function for member events
  const detectMemberConflicts = useCallback((members: Member[]) => {
    const conflicts: Record<string, Array<{
      events: string[];
      conflictBlock: string;
      conflictBlockNumber: number;
    }>> = {};
    
    const groups = team.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS;
    const conflictBlocks: Record<string, number> = {};
    let nextConflictBlock = 1;

    // Check each member for conflicts
    members.forEach(member => {
      if (!member.events || member.events.length === 0) return;
      
      // Check each conflict block for conflicts
      groups.forEach(group => {
        const groupEvents = group.events;
        const memberEventsInBlock = member.events.filter(event => groupEvents.includes(event));
        
        // If member has multiple events in the same conflict block, it's a conflict
        if (memberEventsInBlock.length > 1) {
          const memberName = getDisplayName(member);
          const conflictKey = `${memberName}-${group.label}`;
          if (!conflictBlocks[conflictKey]) {
            conflictBlocks[conflictKey] = nextConflictBlock++;
          }
          
          if (!conflicts[memberName]) {
            conflicts[memberName] = [];
          }
          
          conflicts[memberName].push({
            events: memberEventsInBlock,
            conflictBlock: group.label,
            conflictBlockNumber: conflictBlocks[conflictKey]
          });
        }
      });
    });
    
    return conflicts;
  }, [team.division]);

  // Create a stable key for membersData to prevent unnecessary recalculations
  const membersDataKey = membersData?.map(m => `${m.id}-${m.name}-${m.role}-${m.events?.join(',') || ''}`).join('|') || '';
  const hasDataChanged = membersDataKey !== prevMembersDataRef.current;
  
  // Update the ref when data changes
  if (hasDataChanged) {
    prevMembersDataRef.current = membersDataKey;
  }

  // Process store data and filter, enrich names, and sort members using useMemo
  const processedFilteredMembers = useMemo(() => {
    // Removed verbose logging - not needed for business logic
    
    if (!membersData) {
      // Removed verbose logging - not needed for business logic
      return [];
    }
    
    if (membersData.length === 0) {
      // Removed verbose logging - not needed for business logic
      return [];
    }
    
    // Removed verbose logging - not needed for business logic
    
    const processedMembers = membersData.map(person => ({
      id: person.id,
      name: person.name,
      email: person.email || null,
      username: person.username || null,
      role: person.role,
      joinedAt: person.joinedAt || null,
      subteam: {
        id: person.subteamId || '',
        name: person.subteam?.name || 'Unknown',
        description: person.subteam?.description || ''
      },
      subteams: [],
      subteamId: person.subteamId || '',
      events: person.events || [],
      eventCount: person.events?.length || 0,
      avatar: undefined,
      isOnline: false,
      hasPendingInvite: person.isPendingInvitation || false,
      hasPendingLinkInvite: false,
      isPendingInvitation: person.isPendingInvitation || false,
      invitationCode: undefined,
      isUnlinked: person.isUnlinked || false,
      conflicts: [] // Conflicts not available in current store response
    }));

    // Detect conflicts based on member events
    const conflicts = detectMemberConflicts(processedMembers);
    
    const filtered = processedMembers.map(member => {
      let name = member.name;
      // Handle null/undefined names safely
      if (!name || typeof name !== 'string') {
        name = null;
      }
      // If the name is weak ('@unknown'), derive a better display using same logic as NamePromptModal
      if (needsNamePrompt(name)) {
        const emailLocal = (member.email && typeof member.email === 'string' && (member.email as string).includes('@')) ? (member.email as string).split('@')[0] : '';
        const { name: robust } = generateDisplayName({
          displayName: null,
          firstName: null,
          lastName: null,
          username: (member.username && typeof member.username === 'string' && (member.username as string).trim())
            ? (member.username as string).trim()
            : (emailLocal && emailLocal.length > 2 ? emailLocal : null),
          email: member.email,
        });
        if (robust && robust.trim()) {
          name = robust.trim();
        }
      }

      // If server hasn't reflected link-pending yet, honor our optimistic state
      const hasPendingLinkInvite = (member as any).hasPendingLinkInvite || pendingLinkInvites[getDisplayName(member)] === true;

      return {
        ...member,
        name,
        hasPendingLinkInvite,
        conflicts: conflicts[getDisplayName(member)] || []
      };
    });

    // Sort: captains first, then alphabetical
    filtered.sort((a, b) => {
      if (a.role === 'captain' && b.role !== 'captain') return -1;
      if (b.role === 'captain' && a.role !== 'captain') return 1;
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });

    // Removed verbose logging - not needed for business logic

    return filtered;
  }, [membersDataKey, team.division, detectMemberConflicts, pendingLinkInvites]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use the processed members directly instead of storing in state
  const filteredMembers = processedFilteredMembers;
  
  // Removed custom optimistic update clearing - using store's built-in system

  // Auto-open name prompt if current user's name is '@unknown' or otherwise needs prompt
  useEffect(() => {
    if (!user?.id || !filteredMembers.length) return;
    const me = filteredMembers.find(m => m.id === user.id);
    if (!me) return;
    if (me.name && needsNamePrompt(me.name)) {
      setShowNamePrompt(true);
    }
  }, [filteredMembers, user?.id]);

  const handleInvitePerson = () => {
    setShowInlineInvite(true);
  };

  const handleInviteSubmit = async (username: string) => {
    try {
      const response = await fetch(`/api/teams/${team.slug}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          role: 'member'
        })
      });

      if (response.ok) {
        toast.success(`Invitation sent to ${username}`);
        // Refresh members list
        loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  };

  const handleLinkInvite = (memberName: string) => {
    setLinkInviteStates(prev => ({ ...prev, [memberName]: true }));
  };

  const handleLinkInviteClose = (memberName: string) => {
    setLinkInviteStates(prev => ({ ...prev, [memberName]: false }));
  };

  const handleLinkInviteSubmit = async (memberName: string, username: string) => {
    try {
      // Find the member's subteam
      const member = filteredMembers.find(m => m.name === memberName);
      if (!member) {
        toast.error('Member not found');
        return;
      }

      // Use the member's subteam ID or fall back to the selected subteam
      const subteamId = (member as Member).subteam?.id || member.subteamId || (selectedSubteam !== 'all' ? selectedSubteam : null);
      if (!subteamId) {
        toast.error('Unable to determine subteam for this member');
        return;
      }

      const response = await fetch(`/api/teams/${team.slug}/roster/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subteamId: subteamId,
          studentName: memberName,
          username,
          message: `You've been invited to link your account to the roster entry "${memberName}"`
        })
      });

      if (response.ok) {
        toast.success(`Link invitation sent to ${username}`);
        // Optimistically mark as link pending in UI
        setPendingLinkInvites(prev => ({ ...prev, [memberName]: true }));
        setLinkInviteStates(prev => ({ ...prev, [memberName]: false }));
        // Refresh members list
        loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send link invitation');
      }
    } catch (error) {
      console.error('Error sending link invitation:', error);
      toast.error('Failed to send link invitation');
    }
  };

  const handleCancelLinkInvite = async (memberName: string) => {
    try {
      // Find the member's subteam
      const member = filteredMembers.find(m => m.name === memberName);
      if (!member) {
        toast.error('Member not found');
        return;
      }

      // Use the member's subteam ID or fall back to the selected subteam
      const subteamId = (member as Member).subteam?.id || member.subteamId || (selectedSubteam !== 'all' ? selectedSubteam : null);
      if (!subteamId) {
        toast.error('Unable to determine subteam for this member');
        return;
      }

      const response = await fetch(`/api/teams/${team.slug}/roster/invite/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subteamId: subteamId,
          studentName: memberName
        })
      });

      if (response.ok) {
        toast.success('Link invitation cancelled');
        // Optimistically clear link pending in UI
        setPendingLinkInvites(prev => ({ ...prev, [memberName]: false }));
        // Refresh members list
        loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to cancel link invitation');
      }
    } catch (error) {
      console.error('Error cancelling link invitation:', error);
      toast.error('Failed to cancel link invitation');
    }
  };

  const handleCancelInvitation = async (member: Member) => {
    if (!member.invitationCode) {
      toast.error('No invitation code found');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${team.slug}/invite/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationCode: member.invitationCode
        })
      });

      if (response.ok) {
        toast.success(`Invitation cancelled for ${getDisplayName(member)}`);
        // Refresh members list
        loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (member.role === 'captain') {
      toast.error('Cannot remove team captain');
      return;
    }

    if (member.id === user?.id) {
      toast.error('Cannot remove yourself');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${getDisplayName(member)} from the team?`)) {
      return;
    }

    try {
      // For unlinked members (no user ID), remove from roster data
      if (!member.id) {
        const response = await fetch(`/api/teams/${team.slug}/roster/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: getDisplayName(member)
          })
        });

        if (response.ok) {
          const result = await response.json();
          toast.success(`${getDisplayName(member)} has been removed from the roster (${result.removedEntries} entries)`);
          
          // Reload members to show updated data
          loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to remove roster entry');
        }
      } else {
        // For linked members (with user ID), remove from team memberships and roster
        const response = await fetch(`/api/teams/${team.slug}/members/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: member.id
          })
        });

        if (response.ok) {
          toast.success(`${member.name} has been removed from the team`);
          // Refresh members list
          const subteamParam = selectedSubteam === 'all' ? '' : `?subteamId=${selectedSubteam}`;
          const response = await fetch(`/api/teams/${team.slug}/members${subteamParam}`);
          if (response.ok) {
            loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
          }
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to remove member');
        }
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handlePromoteToCaptain = async (member: Member) => {
    if (member.role === 'captain') {
      toast.error('User is already a captain');
      return;
    }

    if (!member.id) {
      toast.error('Cannot promote unlinked members to captain');
      return;
    }

    if (!confirm(`Are you sure you want to promote ${member.name} to captain?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${team.slug}/members/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: member.id,
          newRole: 'captain'
        })
      });

      if (response.ok) {
        toast.success(`${member.name} has been promoted to captain`);
        // Refresh members list
        loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to promote member');
      }
    } catch (error) {
      console.error('Error promoting member:', error);
      toast.error('Failed to promote member');
    }
  };

  // Loading state is now handled by the store

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          People
        </h2>
        {isCaptain && (
          <button
            onClick={handleInvitePerson}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <UserPlus className="w-4 h-4 mr-2 inline" />
            <span>Invite by username</span>
          </button>
        )}
      </div>

      {/* Inline Invite */}
      {showInlineInvite && (
        <InlineInvite
          isOpen={showInlineInvite}
          onClose={() => setShowInlineInvite(false)}
          onSubmit={handleInviteSubmit}
        />
      )}

      {/* Subteam Filter */}
      {subteams.length > 0 && (
        <div className="flex items-center space-x-2">
          <select
            value={selectedSubteam}
            onChange={(e) => setSelectedSubteam(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              darkMode 
                ? 'bg-gray-800 text-white border-gray-600 hover:border-gray-500 focus:border-blue-500' 
                : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400 focus:border-blue-500'
            }`}
          >
            <option value="all">All Subteams</option>
            {subteams.map((subteam) => (
              <option key={subteam.id} value={subteam.id}>
                {subteam.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {filteredMembers.length === 0 ? (
          <div className={`col-span-full text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>No members found</p>
          </div>
        ) : (
          filteredMembers.map((member, index) => ( 
            <div
              key={member.id || `member-${index}`}
              className={`p-4 rounded-lg border relative ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              } transition-colors`}
            >
              {/* Action buttons for captains */}
              {isCaptain && member.id !== user?.id && (
                <div className="absolute top-2 right-2 flex items-center space-x-1">
                  {/* Promote to captain button */}
                  {member.role !== 'captain' && member.id && (
                    <button
                      onClick={() => handlePromoteToCaptain(member)}
                      className={`p-1 rounded transition-colors ${
                        darkMode
                          ? 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                          : 'text-gray-500 hover:text-yellow-500 hover:bg-gray-100'
                      }`}
                      title={`Promote ${member.name} to captain`}
                    >
                      <ArrowUpCircle className="w-5 h-5" />
                    </button>
                  )}
                  
                  {/* Remove button */}
                  {member.role !== 'captain' && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      className={`p-1 rounded transition-colors ${
                        darkMode
                          ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                          : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
                      }`}
                      title={`Remove ${member.name} from team`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-col items-center text-center space-y-3">
                {/* Profile Picture */}
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                    {member.avatar ? (
                      <div
                        className="w-16 h-16 rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${member.avatar})` }}
                      />
                    ) : (
                      <span className={`font-medium text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {getDisplayName(member).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {member.isOnline && (
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 rounded-full ${darkMode ? 'border-gray-800' : 'border-white'}`}></div>
                  )}
                </div>

                {/* Name and Role */}
                <div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <h3 
                        className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} ${
                          member.id === user?.id ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                        }`}
                        onClick={() => handleNameClick(member)}
                        title={member.id === user?.id ? 'Click to edit your name' : undefined}
                      >
                        {(() => {
                          // For the current user, if name is weak, show a better fallback immediately
                          if (member.id === user?.id && needsNamePrompt(member.name)) {
                            const emailLocal = user?.email?.split('@')[0] || '';
                            const { name: robust } = generateDisplayName({
                              displayName: null,
                              firstName: null,
                              lastName: null,
                              username: (emailLocal && emailLocal.length > 2) ? emailLocal : null,
                              email: user?.email || null
                            }, user?.id);
                            return robust || getDisplayName(member);
                          }
                          return getDisplayName(member);
                        })()}
                        {member.id === user?.id && (
                          <span className={`ml-2 text-xs font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            (me)
                          </span>
                        )}
                      </h3>
                      {member.id === user?.id && (
                        <button
                          type="button"
                          onClick={() => handleNameClick(member)}
                          title="Edit your name"
                          className="p-0.5 rounded cursor-pointer hover:opacity-80"
                          aria-label="Edit your name"
                        >
                          <Edit3 className="w-3 h-3 opacity-60" />
                        </button>
                      )}
                    </div>
                    {member.role === 'captain' && (
                      <Crown className="w-4 h-4 text-yellow-500 ml-1" />
                    )}
                    {member.conflicts && member.conflicts.length > 0 && (
                      <div className="relative group">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10 ${
                          darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
                        } opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}>
                          <div className="font-medium mb-1">Event Conflicts:</div>
                          {member.conflicts.map((conflict, index) => (
                            <div key={index} className="text-xs">
                              Conflict Block {conflict.conflictBlockNumber}: {conflict.events.join(', ')}
                            </div>
                          ))}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-700"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {member.username && (
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      @{member.username}
                    </p>
                  )}
                </div>

                {/* All Badges - Subteams, Events, and Add Event */}
                {!member.isPendingInvitation && (
                  <div className="flex flex-wrap gap-1 gap-y-2 justify-center">
                    {/* Subteam badges */}
                    {(member.subteams && member.subteams.length > 0 ? member.subteams : [member.subteam]).filter(Boolean).map((subteam, index) => (
                      <div key={subteam?.id || index} className="relative group">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          darkMode 
                            ? 'bg-green-900 text-green-300 border-green-700' 
                            : 'bg-green-100 text-green-800 border-green-200'
                        }`}>
                          {subteam?.name || 'Unknown'}
                          {/* Show "set?" for captains when subteam is "Unknown" */}
                          {isCaptain && member.id && (subteam?.name === 'Unknown team' || subteam?.name === 'Unknown' || !subteam?.name) && (
                            <span className="cursor-pointer" 
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowSubteamDropdown(showSubteamDropdown === member.id ? null : member.id);
                                  }}
                                  title="Set subteam for this user">
                              <span>,</span><span className="text-blue-600 hover:text-blue-800"> set?</span>
                            </span>
                          )}
                        </div>
                        {isCaptain && subteam?.id && (
                          <button
                            onClick={async () => {
                              try {
                                // Remove all roster entries for this user from specific subteam (badge removal)
                                const response = await fetch(`/api/teams/${team.slug}/roster/remove`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                userId: member.id,
                                subteamId: subteam?.id 
                              })
                            });
                            if (response.ok) {
                              toast.success(`Removed ${member.name} from subteam`);
                              
                              // Small delay to ensure API has processed the change, then reload
                              setTimeout(() => {
                                invalidateCache('members', team.slug, selectedSubteam === 'all' ? 'all' : selectedSubteam);
                                loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
                              }, 100);
                            } else {
                              const err = await response.json();
                              toast.error(err.error || 'Failed to remove subteam badge');
                            }
                          } catch (e) {
                            console.error(e);
                            toast.error('Failed to remove subteam badge');
                          }
                            }}
                            className={`absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5 rounded ${
                              darkMode ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
                            }`}
                            title="Remove subteam badge"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Event badges */}
                    {member.events.length > 0 && (() => {
                      // Create a list of all events with their subteams
                      const eventsWithSubteams: Array<{event: string, subteam: string, subteamId: string}> = [];
                      
                      // If member has multiple subteams, show each event for each subteam it appears in
                      if (member.subteams && member.subteams.length > 0) {
                        (member.subteams as Array<{
                          id: string;
                          name: string;
                          description: string;
                          events?: string[];
                        }>).forEach(subteam => {
                          if (subteam.events) {
                            subteam.events.forEach(event => {
                              eventsWithSubteams.push({
                                event,
                                subteam: subteam.name,
                                subteamId: subteam.id
                              });
                            });
                          }
                        });
                      } else if (member.subteam) {
                        // Fallback for single subteam
                        member.events.forEach(event => {
                          eventsWithSubteams.push({
                            event,
                            subteam: member.subteam?.name || 'Unknown',
                            subteamId: member.subteam?.id || ''
                          });
                        });
                      }
                      
                      // Filter out "General" events if there are specific events
                      const hasSpecificEvents = eventsWithSubteams.some(e => e.event !== 'General');
                      const filteredEvents = hasSpecificEvents 
                        ? eventsWithSubteams.filter(e => e.event !== 'General')
                        : eventsWithSubteams;
                      
                      // Check if person is only on one subteam
                      const uniqueSubteams = [...new Set(filteredEvents.map(e => e.subteamId))];
                      const isSingleSubteam = uniqueSubteams.length === 1;
                      
                      return filteredEvents.map((eventData, eventIndex) => (
                        <div key={`${eventData.event}-${eventData.subteamId}-${eventIndex}`} className="relative group">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${
                              darkMode 
                                ? 'bg-blue-900 text-blue-300 border-blue-700' 
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                          >
                            {isSingleSubteam ? eventData.event : `${eventData.event} - ${eventData.subteam}`}
                          </span>
                          {isCaptain && (
                            <button
                              onClick={async () => {
                                try {
                                  // Simple cache invalidation approach
                                  
                                  // Remove this user's event badge from the specific subteam
                                  await removeRosterEntryMutation.mutateAsync({
                                    teamSlug: team.slug,
                                    subteamId: eventData.subteamId,
                                    eventName: eventData.event,
                                    userId: member.id || undefined,
                                    studentName: getDisplayName(member)
                                  });
                                  
                                  // Show success message
                                  toast.success(`Removed ${getDisplayName(member)} from ${eventData.event} in ${eventData.subteam}`);
                                  
                                  // Small delay to ensure API has processed the change, then reload
                                  setTimeout(() => {
                                    // Invalidate members cache for People tab
                                    invalidateCache('members', team.slug, selectedSubteam === 'all' ? 'all' : selectedSubteam);
                                    loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
                                    
                                    // Invalidate roster cache for Roster tab to show updated data
                                    invalidateCache('roster', team.slug, eventData.subteamId);
                                  }, 100);
                                } catch (e) {
                                  console.error(e);
                                  toast.error('Failed to remove event badge');
                                }
                              }}
                              className={`absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5 rounded ${
                                darkMode ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
                              }`}
                              title={`Remove ${eventData.event} from ${eventData.subteam}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ));
                    })()}

                    {/* Add event badge for captains - works for both linked and unlinked members */}
                    {isCaptain && member.subteam && member.subteam.name !== 'Unknown team' && member.subteam.name !== 'Unknown' && (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowEventModal(true);
                        }}
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          darkMode 
                            ? 'bg-purple-900 text-purple-300 border-purple-700 hover:bg-purple-800' 
                            : 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
                        }`}
                        title="Add this user to an event"
                      >
                        Add event?
                      </button>
                    )}
                  </div>
                )}

                {/* Subteam assignment dropdown */}
                {showSubteamDropdown === member.id && selectedMember && (
                  <div className="mt-2">
                    <div className={`relative inline-block text-left ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-md shadow-lg`}>
                      <div className="py-1">
                        {subteams.map((subteam) => (
                          <button
                            key={subteam.id}
                            onClick={async () => {
                              try {
                                // Add user to roster in the selected subteam
                                const response = await fetch(`/api/teams/${team.slug}/roster`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    subteamId: subteam.id, // This is the UUID
                                    eventName: 'General', // Placeholder event
                                    slotIndex: 0,
                                    studentName: selectedMember.name,
                                    userId: selectedMember.id // Link to existing user
                                  })
                                });

                                if (response.ok) {
                                  toast.success(`Assigned ${selectedMember.name} to ${subteam.name}`);
                                  
                                  // Small delay to ensure API has processed the change, then reload
                                  setTimeout(() => {
                                    invalidateCache('members', team.slug, selectedSubteam === 'all' ? 'all' : selectedSubteam);
                                    loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
                                  }, 100);
                                  
                                  setShowSubteamDropdown(null);
                                  setSelectedMember(null);
                                } else {
                                  const error = await response.json();
                                  console.error('Error assigning subteam:', error);
                                  toast.error('Failed to assign subteam');
                                }
                              } catch (error) {
                                console.error('Error assigning subteam:', error);
                              }
                            }}
                            className={`w-full text-left px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                          >
                            {subteam.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Link Status */}
                {member.isPendingInvitation ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <UserPlus className="w-4 h-4" />
                      <span className="text-xs font-medium">Invite Pending</span>
                    </div>
                    {isCaptain && (
                      <button
                        onClick={() => handleCancelInvitation(member)}
                        className="text-red-600 hover:text-red-700 text-xs font-medium transition-colors"
                      >
                        Cancel?
                      </button>
                    )}
                  </div>
                ) : member.hasPendingInvite ? (
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-xs font-medium">Invite Pending</span>
                  </div>
                ) : member.hasPendingLinkInvite ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <UserPlus className="w-4 h-4" />
                      <span className="text-xs font-medium">Link Pending</span>
                    </div>
                    {isCaptain && (
                      <button
                        onClick={() => handleCancelLinkInvite(getDisplayName(member))}
                        className="text-red-600 hover:text-red-700 text-xs font-medium transition-colors"
                      >
                        Cancel?
                      </button>
                    )}
                  </div>
                ) : member.id ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <Link className="w-4 h-4" />
                    <span className="text-xs font-medium">Linked</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-red-500">
                      <Link2Off className="w-4 h-4" />
                      <span className="text-xs">Unlinked</span>
                    </div>
                    {isCaptain && (
                      <button
                        onClick={() => handleLinkInvite(getDisplayName(member))}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
                      >
                        Link?
                      </button>
                    )}
                  </div>
                )}

                {/* Link Invitation */}
                {linkInviteStates[getDisplayName(member)] && (
                  <LinkInvite
                    isOpen={linkInviteStates[getDisplayName(member)]}
                    onClose={() => handleLinkInviteClose(getDisplayName(member))}
                    onSubmit={(username) => handleLinkInviteSubmit(getDisplayName(member), username)}
                    studentName={getDisplayName(member)}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>


      {/* Event Assignment Modal */}
      {showEventModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`relative ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden`}>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
              <h3 className={`text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                Add Event for {selectedMember.name}
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                  Select an event to add {selectedMember.name} to in {selectedMember.subteam?.name}.
                </p>
                {/* Common Science Olympiad events for Division C */}
                {[
                  'Anatomy & Physiology',
                  'Astronomy',
                  'Chemistry Lab',
                  'Circuit Lab',
                  'Codebusters',
                  'Designer Genes',
                  'Disease Detectives',
                  'Dynamic Planet',
                  'Entomology',
                  'Experimental Design',
                  'Forensics',
                  'Machines',
                  'Materials Science',
                  'Meteorology',
                  'Remote Sensing',
                  'Rocks and Minerals',
                  'Solar System',
                  'Water Quality'
                ].map((event) => (
                  <button
                    key={event}
                    onClick={async () => {
                      try {
                        // Find the correct subteam ID for this member
                        let subteamId = selectedMember.subteamId;
                        
                        // If subteamId is not available, try to find it from the subteam name
                        if (!subteamId || subteamId.trim() === '') {
                          const matchingSubteam = subteams.find(s => s.name === selectedMember.subteam?.name);
                          if (matchingSubteam) {
                            subteamId = matchingSubteam.id;
                          }
                        }
                        
                        // For unlinked members, check if they have a subteam assigned
                        if (!subteamId || subteamId.trim() === '') {
                          // Removed verbose logging - not needed for business logic
                          
                          // Check if this is an unlinked member with a subteam
                          if (selectedMember.subteam?.id) {
                            subteamId = selectedMember.subteam.id;
                            // Removed verbose logging - not needed for business logic
                          } else {
                            // Removed verbose logging - not needed for business logic
                            alert('This member needs to be assigned to a subteam first. Please use the "set?" option next to their team badge.');
                            return;
                          }
                        }
                        
                        // Simple cache invalidation approach
                        
                        // Add user to the selected event in their subteam
                        const studentName = getDisplayName(selectedMember);
                        console.log('🔍 [PEOPLE TAB] Adding member to roster:', {
                          member: selectedMember,
                          studentName,
                          event,
                          subteamId
                        });
                        
                        await updateRosterMutation.mutateAsync({
                          teamSlug: team.slug,
                          subteamId: subteamId,
                          eventName: event,
                          slotIndex: 0,
                          studentName: studentName,
                          userId: selectedMember.id || undefined
                        });

                        // Show success message
                        toast.success(`Added ${getDisplayName(selectedMember)} to ${event}`);
                        
                        // Small delay to ensure API has processed the change, then reload
                        setTimeout(() => {
                          // Invalidate members cache for People tab
                          invalidateCache('members', team.slug, selectedSubteam === 'all' ? 'all' : selectedSubteam);
                          loadMembers(team.slug, selectedSubteam === 'all' ? undefined : selectedSubteam);
                          
                          // Invalidate roster cache for Roster tab to show updated data
                          invalidateCache('roster', team.slug, subteamId);
                        }, 100);
                        
                        setShowEventModal(false);
                        setSelectedMember(null);
                      } catch (error) {
                        console.error('Error adding event:', error);
                      }
                    }}
                    className={`w-full text-left px-4 py-2 border ${darkMode ? 'border-gray-600 hover:bg-gray-700 text-white' : 'border-gray-300 hover:bg-gray-50 text-gray-900'} rounded-md`}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse`}>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedMember(null);
                }}
                className={`w-full inline-flex justify-center rounded-md border ${darkMode ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'} shadow-sm px-4 py-2 text-base font-medium sm:ml-3 sm:w-auto sm:text-sm`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Prompt Modal */}
      <NamePromptModal
        isOpen={showNamePrompt}
        onClose={() => setShowNamePrompt(false)}
        currentName={(() => {
          if (!user) return '';
          const member = filteredMembers.find(m => m.id === user.id);
          if (member?.name && typeof member.name === 'string' && member.name.trim()) return member.name;
          const emailLocal = user.email?.split('@')[0] || '';
          const { name: robust } = generateDisplayName({
            displayName: null,
            firstName: null,
            lastName: null,
            username: (emailLocal && emailLocal.length > 2) ? emailLocal : null,
            email: user.email || null
          }, user.id);
          return robust;
        })()}
        currentEmail={user?.email || ''}
        onSave={handleNameUpdate}
      />
    </div>
  );
}