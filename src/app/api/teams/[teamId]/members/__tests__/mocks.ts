/**
 * Mock setup for team members route tests
 */

import { queryCockroachDB } from "@/lib/cockroachdb";
import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { getTeamAccess, getUserDisplayInfo } from "@/lib/utils/team-auth-v2";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/team-auth-v2", () => ({
  getTeamAccess: vi.fn(),
  getUserDisplayInfo: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/cockroachdb", () => ({
  queryCockroachDB: vi.fn(),
}));

export const mockGetServerUser = vi.mocked(getServerUser);
export const mockGetTeamAccess = vi.mocked(getTeamAccess);
export const mockDbPg = vi.mocked(dbPg);
export const mockGetUserDisplayInfo = vi.mocked(getUserDisplayInfo);
export const mockQueryCockroachDb = vi.mocked(queryCockroachDB);

