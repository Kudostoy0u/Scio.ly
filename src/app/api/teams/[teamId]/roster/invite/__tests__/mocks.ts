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

export type DrizzleMockChain = {
	from: ReturnType<typeof vi.fn>;
	innerJoin?: ReturnType<typeof vi.fn>;
	where?: ReturnType<typeof vi.fn>;
	limit?: ReturnType<typeof vi.fn>;
	values?: ReturnType<typeof vi.fn>;
	returning?: ReturnType<typeof vi.fn>;
	set?: ReturnType<typeof vi.fn>;
	// Required Drizzle properties that we mock
	fields?: unknown;
	session?: unknown;
	dialect?: unknown;
	withList?: unknown;
	distinct?: unknown;
	table?: unknown;
	overridingSystemValue?: unknown;
	select?: unknown;
	_?: unknown;
	setToken?: unknown;
};
