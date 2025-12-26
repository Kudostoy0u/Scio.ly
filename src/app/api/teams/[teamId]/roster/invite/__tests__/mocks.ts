/**
 * Mock setup for roster invite route tests
 */

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { resolveTeamSlugToUnits } from "@/lib/utils/teams/resolver";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/teams/resolver", () => ({
	resolveTeamSlugToUnits: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		where: vi.fn(),
		innerJoin: vi.fn(),
		orderBy: vi.fn(),
		returning: vi.fn(),
	},
}));

export const mockGetServerUser = vi.mocked(getServerUser);
export const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);
export const mockNotificationSyncService = {
	syncNotificationToSupabase: vi.fn(),
};
export const mockDbPg = vi.mocked(dbPg) as typeof dbPg & {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
};
