/**
 * GET endpoint tests for recurring meetings route
 */

// Import mocks first to ensure they're set up before route handler
import "./mocks";

import { GET } from "@/app/api/teams/calendar/recurring-meetings/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockGroupId,
  mockMembershipMember,
  mockRecurringMeeting,
  mockRecurringMeetingWithExceptions,
  mockTeamId,
  mockTeamSlug,
  mockUser,
} from "./fixtures";
import {
  createDrizzleSelectChain,
  createDrizzleSelectChainWithLeftJoin,
  createDrizzleSelectChainWithLimit,
  createGetRequest,
} from "./helpers";
import { mockDbPg, mockGetServerUser } from "./mocks";

describe("GET /api/teams/calendar/recurring-meetings", () => {
  beforeEach(() => {
    // Reset only the mocks we need, not all mocks
    mockGetServerUser.mockReset();
    mockDbPg.select.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches recurring meetings successfully", async () => {
    mockGetServerUser.mockReset();
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ role: "member" }]))
      .mockReturnValueOnce(createDrizzleSelectChainWithLeftJoin([mockRecurringMeeting]));

    const request = createGetRequest(`teamSlug=${mockTeamSlug}`);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meetings).toHaveLength(1);
    expect(data.meetings[0].title).toBe("Weekly Practice");
    expect(data.meetings[0].days_of_week).toEqual([1, 3]);
    expect(data.meetings[0].exceptions).toEqual([]);
  });

  it("returns 400 for missing team ID", async () => {
    mockGetServerUser.mockResolvedValue({ id: "user-123" } as { id: string });

    const request = createGetRequest();

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("returns 401 for unauthenticated user", async () => {
    mockGetServerUser.mockResolvedValue(null);

    const request = createGetRequest(`teamSlug=${mockTeamSlug}`);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 for non-team members", async () => {
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([]));

    const request = createGetRequest(`teamSlug=${mockTeamSlug}`);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Not a member of this team");
  });

  it("handles database errors", async () => {
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([mockMembershipMember]));

    const errorChain = {
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error("Database error")),
          }),
        }),
      }),
    };
    mockDbPg.select.mockReturnValueOnce(errorChain);

    const request = createGetRequest(`teamSlug=${mockTeamSlug}`);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(["An error occurred", "Database error", "Failed to fetch recurring meetings"]).toContain(
      data.error
    );
  });

  it("parses JSON fields correctly", async () => {
    mockGetServerUser.mockResolvedValue(mockUser as { id: string });

    mockDbPg.select
      .mockReturnValueOnce(createDrizzleSelectChainWithLimit([{ id: mockGroupId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([{ id: mockTeamId }]))
      .mockReturnValueOnce(createDrizzleSelectChain([mockMembershipMember]))
      .mockReturnValueOnce(
        createDrizzleSelectChainWithLeftJoin([mockRecurringMeetingWithExceptions])
      );

    const request = createGetRequest(`teamSlug=${mockTeamSlug}`);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meetings[0].days_of_week).toEqual([1, 3, 5]);
    expect(data.meetings[0].exceptions).toEqual(["2024-01-15", "2024-01-22"]);
  });
});

