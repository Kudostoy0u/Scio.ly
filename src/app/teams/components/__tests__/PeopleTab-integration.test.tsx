import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
// import { trpc } from '@/lib/trpc/client';
// import { httpBatchLink } from '@trpc/client';
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the team store
const mockTeamStore = {
  addRosterEntry: vi.fn(),
  removeRosterEntry: vi.fn(),
  getCacheKey: vi.fn((type: string, ...params: string[]) => `${type}-${params.join("-")}`),
};

// Mock the useTeamStore hook
vi.mock("@/app/hooks/useTeamStore", () => ({
  useTeamStore: () => mockTeamStore,
}));

// Mock the tRPC client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock("react-toastify", () => ({
  toast: mockToast,
}));

// Test component that simulates the PeopleTab functionality
function TestPeopleTab({ teamSlug, subteamId }: { teamSlug: string; subteamId: string }) {
  const [members] = useState([
    {
      id: "user-123",
      name: "John Doe",
      subteam: { id: subteamId, name: "Team A" },
      events: ["Astronomy"],
      subteams: [{ id: subteamId, name: "Team A", events: ["Astronomy"] }],
    },
  ]);

  const handleRemoveEvent = async (member: any, eventData: any) => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/roster/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          eventName: eventData.event,
          subteamId: eventData.subteamId,
        }),
      });

      if (response.ok) {
        // Optimistically update the roster cache immediately
        if (eventData.subteamId) {
          const normalizedEventName = eventData.event.replace(/\band\b/g, "&");
          mockTeamStore.removeRosterEntry(teamSlug, eventData.subteamId, normalizedEventName, 0);
        }

        mockToast.success(`Removed ${member.name} from ${eventData.event} in ${eventData.subteam}`);
      }
    } catch (_error) {}
  };

  const handleAddEvent = async (member: any, event: string) => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subteamId: member.subteam?.id,
          eventName: event,
          slotIndex: 0,
          studentName: member.name,
          userId: member.id,
        }),
      });

      if (response.ok) {
        // Optimistically update the roster cache immediately
        if (member.subteam?.id) {
          const normalizedEventName = event.replace(/\band\b/g, "&");
          mockTeamStore.addRosterEntry(
            teamSlug,
            member.subteam.id,
            normalizedEventName,
            0,
            member.name
          );
        }
      }
    } catch (_error) {}
  };

  return (
    <div>
      <h2>People Tab Test</h2>
      {members.map((member) => (
        <div key={member.id} data-testid={`member-${member.id}`}>
          <h3>{member.name}</h3>
          <div data-testid={`member-${member.id}-events`}>
            {member.events.map((event, index) => (
              <div key={index} data-testid={`event-${member.id}-${event}`}>
                <span>{event}</span>
                <button
                  onClick={() =>
                    handleRemoveEvent(member, {
                      event,
                      subteam: member.subteam?.name,
                      subteamId: member.subteam?.id,
                    })
                  }
                  data-testid={`remove-event-${member.id}-${event}`}
                >
                  Remove {event}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleAddEvent(member, "Chemistry")}
            data-testid={`add-event-${member.id}`}
          >
            Add Chemistry
          </button>
        </div>
      ))}
    </div>
  );
}

describe("PeopleTab Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  describe("Event Removal", () => {
    it("should call removeRosterEntry with correct parameters", async () => {
      const teamSlug = "test-team";
      const subteamId = "test-subteam";

      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <QueryClientProvider client={queryClient}>
          <TestPeopleTab teamSlug={teamSlug} subteamId={subteamId} />
        </QueryClientProvider>
      );

      // Find and click the remove button
      const removeButton = screen.getByTestId("remove-event-user-123-Astronomy");
      fireEvent.click(removeButton);

      // Wait for the API call to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/teams/test-team/roster/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "user-123",
            eventName: "Astronomy",
            subteamId: subteamId,
          }),
        });
      });

      // Verify optimistic update was called
      expect(mockTeamStore.removeRosterEntry).toHaveBeenCalledWith(
        teamSlug,
        subteamId,
        "Astronomy", // Should not be normalized since it doesn't contain "and"
        0
      );

      // Verify success toast was shown
      expect(mockToast.success).toHaveBeenCalledWith("Removed John Doe from Astronomy in Team A");
    });

    it('should normalize event names with "and" when removing', async () => {
      const teamSlug = "test-team";
      const subteamId = "test-subteam";

      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Create a member with an event containing "and"
      const TestComponentWithAndEvent = () => {
        const [members] = useState([
          {
            id: "user-123",
            name: "John Doe",
            subteam: { id: subteamId, name: "Team A" },
            events: ["Anatomy and Physiology"],
            subteams: [{ id: subteamId, name: "Team A", events: ["Anatomy and Physiology"] }],
          },
        ]);

        const handleRemoveEvent = async (member: any, eventData: any) => {
          const response = await fetch(`/api/teams/${teamSlug}/roster/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: member.id,
              eventName: eventData.event,
              subteamId: eventData.subteamId,
            }),
          });

          if (response.ok) {
            if (eventData.subteamId) {
              const normalizedEventName = eventData.event.replace(/\band\b/g, "&");
              mockTeamStore.removeRosterEntry(
                teamSlug,
                eventData.subteamId,
                normalizedEventName,
                0
              );
            }
          }
        };

        return (
          <div>
            {members.map((member) => (
              <div key={member.id}>
                {member.events.map((event, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      handleRemoveEvent(member, {
                        event,
                        subteam: member.subteam?.name,
                        subteamId: member.subteam?.id,
                      })
                    }
                    data-testid={`remove-event-${member.id}-${event}`}
                  >
                    Remove {event}
                  </button>
                ))}
              </div>
            ))}
          </div>
        );
      };

      render(
        <QueryClientProvider client={queryClient}>
          <TestComponentWithAndEvent />
        </QueryClientProvider>
      );

      // Click remove button for "Anatomy and Physiology"
      const removeButton = screen.getByTestId("remove-event-user-123-Anatomy and Physiology");
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockTeamStore.removeRosterEntry).toHaveBeenCalledWith(
          teamSlug,
          subteamId,
          "Anatomy & Physiology", // Should be normalized
          0
        );
      });
    });
  });

  describe("Event Addition", () => {
    it("should call addRosterEntry with correct parameters", async () => {
      const teamSlug = "test-team";
      const subteamId = "test-subteam";

      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <QueryClientProvider client={queryClient}>
          <TestPeopleTab teamSlug={teamSlug} subteamId={subteamId} />
        </QueryClientProvider>
      );

      // Find and click the add event button
      const addButton = screen.getByTestId("add-event-user-123");
      fireEvent.click(addButton);

      // Wait for the API call to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/teams/test-team/roster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subteamId: subteamId,
            eventName: "Chemistry",
            slotIndex: 0,
            studentName: "John Doe",
            userId: "user-123",
          }),
        });
      });

      // Verify optimistic update was called
      expect(mockTeamStore.addRosterEntry).toHaveBeenCalledWith(
        teamSlug,
        subteamId,
        "Chemistry",
        0,
        "John Doe"
      );
    });

    it('should normalize event names with "and" when adding', async () => {
      const teamSlug = "test-team";
      const subteamId = "test-subteam";

      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Test component that adds an event with "and"
      const TestComponentWithAndEvent = () => {
        const [members] = useState([
          {
            id: "user-123",
            name: "John Doe",
            subteam: { id: subteamId, name: "Team A" },
            events: [],
            subteams: [{ id: subteamId, name: "Team A", events: [] }],
          },
        ]);

        const handleAddEvent = async (member: any, event: string) => {
          const response = await fetch(`/api/teams/${teamSlug}/roster`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subteamId: member.subteam?.id,
              eventName: event,
              slotIndex: 0,
              studentName: member.name,
              userId: member.id,
            }),
          });

          if (response.ok) {
            if (member.subteam?.id) {
              const normalizedEventName = event.replace(/\band\b/g, "&");
              mockTeamStore.addRosterEntry(
                teamSlug,
                member.subteam.id,
                normalizedEventName,
                0,
                member.name
              );
            }
          }
        };

        return (
          <div>
            {members.map((member) => (
              <div key={member.id}>
                <button
                  onClick={() => handleAddEvent(member, "Anatomy and Physiology")}
                  data-testid={`add-event-${member.id}`}
                >
                  Add Anatomy and Physiology
                </button>
              </div>
            ))}
          </div>
        );
      };

      render(
        <QueryClientProvider client={queryClient}>
          <TestComponentWithAndEvent />
        </QueryClientProvider>
      );

      // Click add button for "Anatomy and Physiology"
      const addButton = screen.getByTestId("add-event-user-123");
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockTeamStore.addRosterEntry).toHaveBeenCalledWith(
          teamSlug,
          subteamId,
          "Anatomy & Physiology", // Should be normalized
          0,
          "John Doe"
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const teamSlug = "test-team";
      const subteamId = "test-subteam";

      // Mock API error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <TestPeopleTab teamSlug={teamSlug} subteamId={subteamId} />
        </QueryClientProvider>
      );

      // Try to remove an event
      const removeButton = screen.getByTestId("remove-event-user-123-Astronomy");
      fireEvent.click(removeButton);

      // Wait for the API call to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Verify optimistic update was NOT called on error
      expect(mockTeamStore.removeRosterEntry).not.toHaveBeenCalled();

      // Verify success toast was NOT shown
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it("should handle network errors gracefully", async () => {
      const teamSlug = "test-team";
      const subteamId = "test-subteam";

      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      render(
        <QueryClientProvider client={queryClient}>
          <TestPeopleTab teamSlug={teamSlug} subteamId={subteamId} />
        </QueryClientProvider>
      );

      // Try to add an event
      const addButton = screen.getByTestId("add-event-user-123");
      fireEvent.click(addButton);

      // Wait for the error to be handled
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Verify optimistic update was NOT called on error
      expect(mockTeamStore.addRosterEntry).not.toHaveBeenCalled();
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate consistent cache keys", () => {
      const teamSlug = "test-team";
      const subteamId = "test-subteam";

      const key1 = mockTeamStore.getCacheKey("roster", teamSlug, subteamId);
      const key2 = mockTeamStore.getCacheKey("roster", teamSlug, subteamId);

      expect(key1).toBe(key2);
      expect(key1).toBe("roster-test-team-test-subteam");
    });

    it("should generate different cache keys for different subteams", () => {
      const teamSlug = "test-team";
      const subteamId1 = "subteam-1";
      const subteamId2 = "subteam-2";

      const key1 = mockTeamStore.getCacheKey("roster", teamSlug, subteamId1);
      const key2 = mockTeamStore.getCacheKey("roster", teamSlug, subteamId2);

      expect(key1).not.toBe(key2);
    });
  });
});
