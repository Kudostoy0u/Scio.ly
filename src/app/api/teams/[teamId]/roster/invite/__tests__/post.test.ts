/**
 * POST endpoint tests for roster invite route
 */

import { POST } from "@/app/api/teams/[teamId]/roster/invite/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INVITATION_SENT_REGEX,
  SUBTEAM_ID_REGEX,
  mockGroup,
  mockInvitation,
  mockInvitedUser,
  mockMembership,
  mockNotification,
  mockSubteam,
  mockTeamInfo,
  mockUser,
} from "./fixtures";
import {
  createMockDrizzleChain,
  createMockDrizzleChainWithJoin,
  createMockDrizzleInsert,
  createMockDrizzleUpdate,
  createParams,
  createPostRequest,
} from "./helpers";
import { mockDbPg, mockGetServerUser, mockNotificationSyncService } from "./mocks";
import type { DrizzleMockChain } from "./mocks";

describe("POST /api/teams/[teamId]/roster/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    mockGetServerUser.mockResolvedValue(mockUser);
    mockNotificationSyncService.syncNotificationToSupabase.mockResolvedValue();

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
    mockDbPg.update.mockReturnValue({
      set: vi.fn(),
      where: vi.fn(),
      returning: vi.fn(),
    } as unknown as DrizzleMockChain);
  });

  afterEach(() => {
    // biome-ignore lint/performance/noDelete: Need to remove env var for test cleanup
    delete process.env.DATABASE_URL;
  });

  it("should create roster link invitation successfully", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockGroup.id }))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin({ role: mockMembership.role }))
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockSubteam.id }))
      .mockImplementationOnce(() => createMockDrizzleChain(mockInvitedUser))
      .mockImplementationOnce(() => createMockDrizzleChain([]))
      .mockImplementationOnce(() => createMockDrizzleChain(mockTeamInfo));

    mockDbPg.insert
      .mockImplementationOnce(() => createMockDrizzleInsert(mockInvitation))
      .mockImplementationOnce(() => createMockDrizzleInsert(mockNotification));

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
      message: "Custom message",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Roster link invitation sent successfully");
    expect(data.invitation).toEqual(mockInvitation);
    expect(mockNotificationSyncService.syncNotificationToSupabase).toHaveBeenCalledWith(
      "notification-123"
    );
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetServerUser.mockResolvedValue(null);

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if required fields are missing", async () => {
    const request = createPostRequest("test-team", {
      subteamId: "subteam-123",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
    expect(Array.isArray(data.details)).toBe(true);
    expect(data.details.length).toBeGreaterThan(0);
    const hasValidationError = data.details.some(
      (detail: string) => typeof detail === "string" && detail.length > 0
    );
    expect(hasValidationError).toBe(true);
  });

  it("should return 400 if subteam ID is invalid UUID", async () => {
    const request = createPostRequest("test-team", {
      subteamId: "invalid-uuid",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(Array.isArray(data.details)).toBe(true);
    expect(data.details.some((detail: string) => SUBTEAM_ID_REGEX.test(detail))).toBe(true);
  });

  it("should return 404 if team group is not found", async () => {
    mockDbPg.select.mockImplementationOnce(() => createMockDrizzleChain([]));

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Team group not found");
  });

  it("should return 403 if user is not a team member", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockGroup.id }))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin([]));

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Not a team member");
  });

  it("should return 403 if user is not a captain", async () => {
    const memberMembership = { role: "member" };
    mockDbPg.select
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockGroup.id }))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin(memberMembership));

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only captains can send roster invitations");
  });

  it("should return 404 if subteam is not found", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockGroup.id }))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin({ role: mockMembership.role }))
      .mockImplementationOnce(() => createMockDrizzleChain([]));

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Subteam not found");
  });

  it("should return 404 if invited user is not found", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockGroup.id }))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin({ role: mockMembership.role }))
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockSubteam.id }))
      .mockImplementationOnce(() => createMockDrizzleChain([]));

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "nonexistentuser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return 400 if invitation already sent", async () => {
    const existingInvitation = { id: "existing-invitation", status: "pending" };
    mockDbPg.select
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockGroup.id }))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin({ role: mockMembership.role }))
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockSubteam.id }))
      .mockImplementationOnce(() => createMockDrizzleChain(mockInvitedUser))
      .mockImplementationOnce(() => createMockDrizzleChain(existingInvitation));

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
    expect(Array.isArray(data.details)).toBe(true);
    expect(data.details.some((detail: string) => INVITATION_SENT_REGEX.test(detail))).toBe(true);
  });

  it("should update existing declined invitation", async () => {
    const existingInvitation = { id: "existing-invitation", status: "declined" };
    mockDbPg.select
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockGroup.id }))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin({ role: mockMembership.role }))
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockSubteam.id }))
      .mockImplementationOnce(() => createMockDrizzleChain(mockInvitedUser))
      .mockImplementationOnce(() => createMockDrizzleChain(existingInvitation))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin(mockTeamInfo));

    mockDbPg.update.mockImplementationOnce(() => createMockDrizzleUpdate(mockInvitation));
    mockDbPg.insert.mockImplementationOnce(() => createMockDrizzleInsert(mockNotification));

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Roster link invitation sent successfully");
  });

  it("should handle notification sync failure gracefully", async () => {
    mockDbPg.select
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockGroup.id }))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin({ role: mockMembership.role }))
      .mockImplementationOnce(() => createMockDrizzleChain({ id: mockSubteam.id }))
      .mockImplementationOnce(() => createMockDrizzleChain(mockInvitedUser))
      .mockImplementationOnce(() => createMockDrizzleChain([]))
      .mockImplementationOnce(() => createMockDrizzleChainWithJoin(mockTeamInfo));

    mockDbPg.insert
      .mockImplementationOnce(() => createMockDrizzleInsert(mockInvitation))
      .mockImplementationOnce(() => createMockDrizzleInsert(mockNotification));

    mockNotificationSyncService.syncNotificationToSupabase.mockRejectedValue(
      new Error("Sync failed")
    );

    const request = createPostRequest("test-team", {
      subteamId: "123e4567-e89b-12d3-a456-426614174000",
      studentName: "Test Student",
      username: "inviteduser",
    });

    const response = await POST(request, createParams("test-team"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Roster link invitation sent successfully");
  });
});

