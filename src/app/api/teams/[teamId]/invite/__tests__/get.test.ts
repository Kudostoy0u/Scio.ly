/**
 * GET endpoint tests for team invite route
 */

// Import mocks first to ensure they're set up before route handler
import "./mocks";

import { GET } from "@/app/api/teams/[teamId]/invite/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMembership, mockSearchResults, mockTeamInfo } from "./fixtures";
import {
  createDrizzleSelectChain,
  createDrizzleSelectChainWithLimit,
  createGetRequest,
  createParams,
} from "./helpers";
import { mockDbPg, mockGetServerUser, mockResolveTeamSlugToUnits } from "./mocks";
import type { DrizzleMockChain } from "./mocks";

describe("GET /api/teams/[teamId]/invite", () => {
  beforeEach(() => {
    // Reset only the mocks we need, not all mocks
    mockGetServerUser.mockReset();
    mockResolveTeamSlugToUnits.mockReset();
    mockDbPg.select.mockReset();
    
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    // Set up mocks
    mockGetServerUser.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "test@example.com",
    });
    mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);

    mockDbPg.select.mockReturnValue({
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    } as unknown as DrizzleMockChain);
  });

  afterEach(() => {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    }
  });

  it("should search users successfully", async () => {
    mockDbPg.select
      .mockImplementationOnce(() =>
        createDrizzleSelectChain([{ ...mockMembership, role: "captain" }])
      )
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit(mockSearchResults));

    const request = createGetRequest("test-team", "q=user");

    const response = await GET(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toEqual(mockSearchResults);
  });

  it("should return empty array for short queries", async () => {
    const request = createGetRequest("test-team", "q=a");

    const response = await GET(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toEqual([]);
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetServerUser.mockReset();
    mockGetServerUser.mockResolvedValue(null);

    const request = createGetRequest("test-team", "q=user");

    const response = await GET(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if user is not a team member", async () => {
    mockDbPg.select.mockImplementationOnce(() => createDrizzleSelectChain([]));

    const request = createGetRequest("test-team", "q=user");

    const response = await GET(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Not a team member");
  });

  it("should return 403 if user is not a captain", async () => {
    const memberMembership = { ...mockMembership, role: "member" };
    mockDbPg.select.mockImplementationOnce(() => createDrizzleSelectChain([memberMembership]));

    const request = createGetRequest("test-team", "q=user");

    const response = await GET(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only captains can search users");
  });
});

