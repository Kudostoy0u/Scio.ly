/**
 * Member interface for team member data
 */
export interface Member {
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
