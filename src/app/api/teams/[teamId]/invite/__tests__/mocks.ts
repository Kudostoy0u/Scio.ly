/**
 * Mock setup for team invite route tests
 */

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/team-resolver", () => ({
	resolveTeamSlugToUnits: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		insert: vi.fn(),
	},
}));

export const mockGetServerUser = vi.mocked(getServerUser);
export const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);
export const mockSyncNotificationToSupabase = vi.fn();
export const mockDbPg = vi.mocked(dbPg);

export type DrizzleMockChain = {
	from: ReturnType<typeof vi.fn>;
	innerJoin?: ReturnType<typeof vi.fn>;
	where?: ReturnType<typeof vi.fn>;
	limit?: ReturnType<typeof vi.fn>;
	values?: ReturnType<typeof vi.fn>;
	returning?: ReturnType<typeof vi.fn>;
};

