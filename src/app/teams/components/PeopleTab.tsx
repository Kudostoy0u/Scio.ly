"use client";

import NamePromptModal from "@/app/components/NamePromptModal";
import { useAuth } from "@/app/contexts/authContext";
import { useTheme } from "@/app/contexts/themeContext";
import { useTeamStore } from "@/app/hooks/useTeamStore";
import { generateDisplayName, needsNamePrompt } from "@/lib/utils/displayNameUtils";
import { UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Member } from "../types";
import EventAssignmentModal from "./EventAssignmentModal";
import InlineInvite from "./InlineInvite";
import MemberCard from "./MemberCard";
import { useMemberActions } from "./hooks/useMemberActions";
import { processMembers } from "./utils/processMembers";

interface PeopleTabProps {
  team: {
    id: string;
    school: string;
    division: "B" | "C";
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

export default function PeopleTab({
  team,
  isCaptain,
  onInvitePerson: _onInvitePerson,
  activeSubteamId: _activeSubteamId,
  subteams = [],
  onSubteamChange: _onSubteamChange,
}: PeopleTabProps) {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [selectedSubteam, setSelectedSubteam] = useState<string>("all");

  // Use centralized team store for data fetching
  const { getMembers, loadMembers } = useTeamStore();

  // Load members data when component mounts or subteam changes
  useEffect(() => {
    if (team.slug) {
      loadMembers(team.slug, selectedSubteam === "all" ? undefined : selectedSubteam);
    }
  }, [team.slug, selectedSubteam, loadMembers]);

  // Get members data from store
  const membersData = getMembers(team.slug, selectedSubteam === "all" ? "all" : selectedSubteam);
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

  // Get processed members using utility function
  const processedFilteredMembers = useMemo(() => {
    if (!membersData) {
      return [];
    }
    return processMembers(membersData, pendingLinkInvites, team.division);
  }, [membersData, pendingLinkInvites, team.division]);

  const filteredMembers = processedFilteredMembers;

  // Use member actions hook
  const {
    handleRemoveSelfFromSubteam,
    handleRemoveOtherFromSubteam,
    handleRemoveEvent,
    handleAddEvent,
    handleSubteamAssign,
    handleInviteSubmit,
    handleLinkInviteSubmit,
    handleCancelLinkInvite,
    handleCancelInvitation,
    handleRemoveMember,
    handlePromoteToCaptain,
  } = useMemberActions({
    teamSlug: team.slug,
    selectedSubteam,
    loadMembers,
    filteredMembers,
  });

  // Handle clicking on own name to edit it
  const handleNameClick = useCallback(
    (member: Member) => {
      if (member.id === user?.id) {
        setShowNamePrompt(true);
      }
    },
    [user?.id]
  );

  // Handle name update completion
  const handleNameUpdate = useCallback(() => {
    loadMembers(team.slug, selectedSubteam === "all" ? undefined : selectedSubteam);
    setShowNamePrompt(false);
  }, [loadMembers, team.slug, selectedSubteam]);

  // Listen for name updates from NamePromptModal
  useEffect(() => {
    const onDisplayNameUpdated = (e: Event) => {
      const newName = (e as CustomEvent<string>).detail as string | undefined;
      if (!(newName && user?.id)) {
        return;
      }
      loadMembers(team.slug, selectedSubteam === "all" ? undefined : selectedSubteam);
    };
    window.addEventListener("scio-display-name-updated", onDisplayNameUpdated as EventListener);
    return () => {
      window.removeEventListener(
        "scio-display-name-updated",
        onDisplayNameUpdated as EventListener
      );
    };
  }, [user?.id, loadMembers, team.slug, selectedSubteam]);

  // Auto-open name prompt if current user's name is '@unknown' or otherwise needs prompt
  useEffect(() => {
    if (!(user?.id && filteredMembers.length > 0)) {
      return;
    }
    const me = filteredMembers.find((m) => m.id === user.id);
    if (!me) {
      return;
    }
    if (me.name && needsNamePrompt(me.name)) {
      setShowNamePrompt(true);
    }
  }, [filteredMembers, user?.id]);

  const handleInvitePerson = () => {
    setShowInlineInvite(true);
  };

  const handleLinkInvite = (memberName: string) => {
    setLinkInviteStates((prev) => ({ ...prev, [memberName]: true }));
  };

  const handleLinkInviteClose = (memberName: string) => {
    setLinkInviteStates((prev) => ({ ...prev, [memberName]: false }));
  };

  const handleLinkInviteSubmitWrapper = async (memberName: string, username: string) => {
    const result = await handleLinkInviteSubmit(memberName, username);
    if (result) {
      setPendingLinkInvites((prev) => ({ ...prev, [memberName]: true }));
      setLinkInviteStates((prev) => ({ ...prev, [memberName]: false }));
    }
  };

  const handleAddEventClick = (member: Member) => {
    setSelectedMember(member);
    setShowEventModal(true);
  };

  const handleEventSelect = async (eventName: string, subteamId: string) => {
    if (!selectedMember) {
      return;
    }

    let finalSubteamId = subteamId || selectedMember.subteamId;

    if (!finalSubteamId || finalSubteamId.trim() === "") {
      const matchingSubteam = subteams.find((s) => s.name === selectedMember.subteam?.name);
      if (matchingSubteam) {
        finalSubteamId = matchingSubteam.id;
      } else if (selectedMember.subteam?.id) {
        finalSubteamId = selectedMember.subteam.id;
      } else {
        alert(
          'This member needs to be assigned to a subteam first. Please use the "set?" option next to their team badge.'
        );
        return;
      }
    }

    await handleAddEvent(selectedMember, eventName, finalSubteamId);
    setShowEventModal(false);
    setSelectedMember(null);
  };

  const handleSubteamDropdownToggle = (memberId: string | null) => {
    setShowSubteamDropdown(memberId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
          People
        </h2>
        {isCaptain && (
          <button
            type="button"
            onClick={handleInvitePerson}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
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
                ? "bg-gray-800 text-white border-gray-600 hover:border-gray-500 focus:border-blue-500"
                : "bg-white text-gray-900 border-gray-300 hover:border-gray-400 focus:border-blue-500"
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
          <div
            className={`col-span-full text-center py-12 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            <p>No members found</p>
          </div>
        ) : (
          filteredMembers.map((member, index) => (
            <MemberCard
              key={member.id || `member-${index}`}
              member={member}
              index={index}
              isCaptain={isCaptain}
              subteams={subteams}
              showSubteamDropdown={showSubteamDropdown}
              selectedMember={selectedMember}
              onNameClick={handleNameClick}
              onPromoteToCaptain={(m) => handlePromoteToCaptain(m)}
              onRemoveMember={(m) => handleRemoveMember(m, user?.id)}
              onRemoveFromSubteam={handleRemoveOtherFromSubteam}
              onRemoveSelfFromSubteam={handleRemoveSelfFromSubteam}
              onRemoveEvent={handleRemoveEvent}
              onAddEvent={handleAddEventClick}
              onSubteamAssign={handleSubteamAssign}
              onSubteamDropdownToggle={handleSubteamDropdownToggle}
              onSetSelectedMember={setSelectedMember}
              linkInviteStates={linkInviteStates}
              onLinkInvite={handleLinkInvite}
              onLinkInviteClose={handleLinkInviteClose}
              onLinkInviteSubmit={handleLinkInviteSubmitWrapper}
              onCancelLinkInvite={handleCancelLinkInvite}
              onCancelInvitation={handleCancelInvitation}
            />
          ))
        )}
      </div>

      {/* Event Assignment Modal */}
      <EventAssignmentModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedMember(null);
        }}
        onSelectEvent={handleEventSelect}
        selectedMember={selectedMember}
        subteamId={selectedMember?.subteamId || selectedMember?.subteam?.id || ""}
      />

      {/* Name Prompt Modal */}
      <NamePromptModal
        isOpen={showNamePrompt}
        onClose={() => setShowNamePrompt(false)}
        currentName={(() => {
          if (!user) {
            return "";
          }
          const member = filteredMembers.find((m) => m.id === user.id);
          if (member?.name && typeof member.name === "string" && member.name.trim()) {
            return member.name;
          }
          const emailLocal = user.email?.split("@")[0] || "";
          const { name: robust } = generateDisplayName(
            {
              displayName: null,
              firstName: null,
              lastName: null,
              username: emailLocal && emailLocal.length > 2 ? emailLocal : null,
              email: user.email || null,
            },
            user.id
          );
          return robust;
        })()}
        currentEmail={user?.email || ""}
        onSave={handleNameUpdate}
      />
    </div>
  );
}
