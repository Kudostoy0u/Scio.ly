/**
 * POST endpoint tests for team invite route
 */

// Import mocks first to ensure they're set up before route handler
import "./mocks";

import { POST } from "@/app/api/teams/[teamId]/invite/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockInvitedUser,
  mockMembership,
  mockNotification,
  mockNotificationId,
  mockTeamCodes,
  mockTeamGroup,
  mockTeamInfo,
  mockUser,
} from "./fixtures";
import {
  createDrizzleInsertChain,
  createDrizzleSelectChain,
  createDrizzleSelectChainWithLimit,
  createParams,
  createPostRequest,
} from "./helpers";
import {
  mockDbPg,
  mockGetServerUser,
  mockResolveTeamSlugToUnits,
  mockSyncNotificationToSupabase,
} from "./mocks";
import type { DrizzleMockChain } from "./mocks";

describe("POST /api/teams/[teamId]/invite", () => {
  beforeEach(() => {
    // Reset only the mocks we need, not all mocks
    mockGetServerUser.mockReset();
    mockResolveTeamSlugToUnits.mockReset();
    mockSyncNotificationToSupabase.mockReset();
    mockDbPg.select.mockReset();
    mockDbPg.insert.mockReset();

    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    // Set up mocks
    mockGetServerUser.mockResolvedValue(mockUser);
    mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);
    mockSyncNotificationToSupabase.mockResolvedValue();

    mockDbPg.select.mockReturnValue({
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    } as unknown as DrizzleMockChain);
    mockDbPg.insert.mockReturnValue({
      values: vi.fn(),
      returning: vi.fn(),
    } as unknown as DrizzleMockChain);
  });

  afterEach(() => {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    }
  });

  it("should create team invitation successfully", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createDrizzleSelectChain([mockMembership]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([mockInvitedUser]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([mockTeamCodes]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([mockTeamGroup]));

    mockDbPg.insert.mockImplementationOnce(() => createDrizzleInsertChain([mockNotification]));

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Invitation sent successfully");
    expect(data.joinCode).toBe("user123");
    expect(mockSyncNotificationToSupabase).toHaveBeenCalledWith(mockNotificationId);
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetServerUser.mockReset();
    mockGetServerUser.mockResolvedValue(null);

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 if DATABASE_URL is missing", async () => {
    const originalEnv = process.env.DATABASE_URL;
    // biome-ignore lint/performance/noDelete: Need to remove env var for test
    delete process.env.DATABASE_URL;

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    if (originalEnv) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      // biome-ignore lint/performance/noDelete: Need to remove env var for test cleanup
      delete process.env.DATABASE_URL;
    }

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database configuration error");
  });

  it("should return 404 if team is not found", async () => {
    mockResolveTeamSlugToUnits.mockReset();
    mockResolveTeamSlugToUnits.mockRejectedValue(new Error("Team not found"));

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Team not found");
  });

  it("should return 403 if user is not a team member", async () => {
    mockDbPg.select.mockImplementationOnce(() => createDrizzleSelectChain([]));

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Not a team member");
  });

  it("should return 403 if user is not a captain", async () => {
    const memberMembership = { ...mockMembership, role: "member" };
    mockDbPg.select.mockImplementationOnce(() => createDrizzleSelectChain([memberMembership]));

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only captains can invite members");
  });

  it("should return 404 if invited user is not found", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createDrizzleSelectChain([mockMembership]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([]));

    const request = createPostRequest("test-team", {
      username: "nonexistentuser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return 400 if user is already a team member", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createDrizzleSelectChain([mockMembership]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([mockInvitedUser]))
      .mockImplementationOnce(() =>
        createDrizzleSelectChainWithLimit([{ id: "existing-membership" }])
      );

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("User is already a team member");
  });

  it("should return 400 if invitation already sent", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createDrizzleSelectChain([mockMembership]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([mockInvitedUser]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([]))
      .mockImplementationOnce(() =>
        createDrizzleSelectChainWithLimit([{ id: "existing-invitation" }])
      );

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Invitation already sent");
  });

  it("should handle notification sync failure gracefully", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createDrizzleSelectChain([mockMembership]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([mockInvitedUser]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([mockTeamCodes]))
      .mockImplementationOnce(() => createDrizzleSelectChainWithLimit([mockTeamGroup]));

    mockDbPg.insert.mockImplementationOnce(() => createDrizzleInsertChain([mockNotification]));

    mockSyncNotificationToSupabase.mockReset();
    mockSyncNotificationToSupabase.mockRejectedValue(new Error("Sync failed"));

    const request = createPostRequest("test-team", {
      username: "inviteduser",
      role: "member",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Invitation sent successfully");
  });
});
