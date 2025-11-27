/**
 * Mock setup for recurring meetings route tests
 */

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

export const mockDbPg = vi.mocked(dbPg);
export const mockGetServerUser = vi.mocked(getServerUser);

