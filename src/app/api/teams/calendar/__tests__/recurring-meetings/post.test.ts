/**
 * POST endpoint tests for recurring meetings route
 */

import { POST } from "@/app/api/teams/calendar/recurring-meetings/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockGroupId,
  mockMeetingId,
  mockMembershipCaptain,
  mockMembershipCoCaptain,
  mockMembershipMember,
  mockTeamId,
  mockTeamSlug,
  mockUser,
  mockUserId,
} from "./fixtures";
import {
  createDrizzleInsertChain,
  createDrizzleInsertChainReject,
  createDrizzleSelectChain,
  createDrizzleSelectChainWithInnerJoin,
  createDrizzleSelectChainWithLimit,
  createPostRequest,
} from "./helpers";
import { mockDbPg, mockGetServerUser } from "./mocks";

describe("POST /api/teams/calendar/recurring-meetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates recurring meeting successfully for captain", async () => {
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithInnerJoin([{ slug: mockTeamSlug }]))
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([mockMembershipCaptain]));

    mockDbPg.insert = vi.fn().mockReturnValue(createDrizzleInsertChain([{ id: mockMeetingId }]));

    const request = createPostRequest({
      team_slug: mockTeamSlug,
      title: "Weekly Practice",
      description: "Regular team practice",
      location: "Gym",
      days_of_week: [1, 3],
      start_time: "15:00",
      end_time: "17:00",
      start_date: "2024-01-15T00:00:00Z",
      end_date: "2024-06-15T00:00:00Z",
      exceptions: ["2024-01-15"],
      created_by: mockUserId,
      meeting_type: "team",
      selected_team_id: mockTeamId,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meetingIds).toContain(mockMeetingId);
    expect(data.count).toBe(1);
  });

  it("creates recurring meeting successfully for co-captain", async () => {
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithInnerJoin([{ slug: mockTeamSlug }]))
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([mockMembershipCoCaptain]));

    mockDbPg.insert = vi.fn().mockReturnValue(createDrizzleInsertChain([{ id: mockMeetingId }]));

    const request = createPostRequest({
      team_slug: mockTeamSlug,
      title: "Weekly Practice",
      days_of_week: [1, 3],
      start_time: "15:00",
      end_time: "17:00",
      start_date: "2024-01-15T00:00:00Z",
      end_date: "2024-06-15T00:00:00Z",
      meeting_type: "team",
      selected_team_id: mockTeamId,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meetingIds).toContain(mockMeetingId);
  });

  it("returns 401 for unauthenticated user", async () => {
    mockGetServerUser.mockResolvedValue(null);

    const request = createPostRequest({
      team_id: "team-123",
      title: "Weekly Practice",
      days_of_week: [1, 3],
      start_time: "15:00",
      end_time: "17:00",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for missing required fields", async () => {
    mockGetServerUser.mockResolvedValue({ id: "user-123" } as { id: string });

    const request = createPostRequest({
      team_slug: mockTeamSlug,
      title: "Weekly Practice",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("returns 403 for non-captain users when creating team meeting", async () => {
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([]));

    const request = createPostRequest({
      team_slug: mockTeamSlug,
      title: "Weekly Practice",
      days_of_week: [1, 3],
      start_time: "15:00",
      end_time: "17:00",
      start_date: "2024-01-15T00:00:00Z",
      end_date: "2024-06-15T00:00:00Z",
      meeting_type: "team",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Not a team member");
  });

  it("allows member to create personal recurring meeting", async () => {
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([mockMembershipMember]));

    mockDbPg.insert = vi.fn().mockReturnValue(createDrizzleInsertChain([{ id: mockMeetingId }]));

    const request = createPostRequest({
      team_slug: mockTeamSlug,
      title: "Weekly Practice",
      days_of_week: [1, 3],
      start_time: "15:00",
      end_time: "17:00",
      start_date: "2024-01-15T00:00:00Z",
      end_date: "2024-06-15T00:00:00Z",
      meeting_type: "personal",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meetingIds).toContain(mockMeetingId);
    expect(data.count).toBe(1);
  });

  it("handles database errors gracefully", async () => {
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithInnerJoin([{ slug: mockTeamSlug }]))
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([mockMembershipCaptain]));

    mockDbPg.insert = vi
      .fn()
      .mockReturnValue(createDrizzleInsertChainReject(new Error("Database connection failed")));

    const request = createPostRequest({
      team_slug: mockTeamSlug,
      title: "Weekly Practice",
      days_of_week: [1, 3],
      start_time: "15:00",
      end_time: "17:00",
      start_date: "2024-01-15T00:00:00Z",
      end_date: "2024-06-15T00:00:00Z",
      meeting_type: "team",
      selected_team_id: mockTeamId,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database error");
    expect(data.details).toBe("Database connection failed");
  });
});

