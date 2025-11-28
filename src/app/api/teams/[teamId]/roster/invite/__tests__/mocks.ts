/**
 * Mock setup for roster invite route tests
 */

import { dbPg } from "@/lib/db";
import { NotificationSyncService } from "@/lib/services/notification-sync";
import { getServerUser } from "@/lib/supabaseServer";
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { vi } from "vitest";

// Type for Drizzle mock chain
export type DrizzleMockChain = {
  from: ReturnType<typeof vi.fn>;
  where?: ReturnType<typeof vi.fn>;
  limit?: ReturnType<typeof vi.fn>;
  values?: ReturnType<typeof vi.fn>;
  returning?: ReturnType<typeof vi.fn>;
  set?: ReturnType<typeof vi.fn>;
  innerJoin?: ReturnType<typeof vi.fn>;
};

// Mock dependencies
vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn(),
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/services/notification-sync", () => ({
  NotificationSyncService: {
    syncNotificationToSupabase: vi.fn(),
  },
}));

vi.mock("@/lib/utils/team-resolver", () => ({
  resolveTeamSlugToUnits: vi.fn(),
}));

export const mockDbPg = vi.mocked(dbPg);
export const mockGetServerUser = vi.mocked(getServerUser);
export const mockNotificationSyncService = vi.mocked(NotificationSyncService);
export const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);
