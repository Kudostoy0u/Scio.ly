export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const TEAM_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  DELETED: "deleted",
  PENDING: "pending",
} as const;

export const MEMBER_ROLES = ["captain", "co_captain", "member", "observer"] as const;

export const DIVISIONS = ["B", "C"] as const;
