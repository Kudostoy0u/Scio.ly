import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import RosterLinkIndicator from "@/app/teams/components/RosterLinkIndicator";

// Mock fetch
global.fetch = vi.fn();

// Mock window.alert
global.alert = vi.fn();

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockFetch = vi.mocked(global.fetch);

// Helper function to create mock responses
const createMockResponse = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status });

describe("RosterLinkIndicator", () => {
  const defaultProps = {
    studentName: "John Doe",
    isLinked: false,
    teamSlug: "team-slug",
    subteamId: "subteam-123",
    onLinkStatusChange: vi.fn(),
    darkMode: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it("should render red indicator for unlinked user", () => {
    render(<RosterLinkIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("text-red-500");
  });

  it("should render green indicator for linked user", () => {
    render(<RosterLinkIndicator {...defaultProps} isLinked={true} userEmail="john@example.com" />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("text-green-500");
  });

  it("should show loading state when linking", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: "Not found" }, 404));

    render(<RosterLinkIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTitle("Click to invite user")).toBeInTheDocument();
    });
  });

  it("should open invite modal when auto-merge fails", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: "Not found" }, 404));

    render(<RosterLinkIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Invite User for Roster")).toBeInTheDocument();
    });
  });

  it("should search users when typing in search input", async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ error: "Not found" }, 404))
      .mockResolvedValueOnce(
        createMockResponse({
          users: [{ id: "user-123", email: "john@example.com", display_name: "John Doe" }],
        })
      );

    render(<RosterLinkIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Invite User for Roster")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by username...");
    fireEvent.change(searchInput, { target: { value: "john" } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/teams/team-slug/roster/invite?q=john")
      );
    });
  });

  it("should send invitation when user is selected", async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ error: "Not found" }, 404))
      .mockResolvedValueOnce(
        createMockResponse({
          users: [
            {
              id: "user-123",
              email: "john@example.com",
              display_name: "John Doe",
              username: "johndoe",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          invitation: { id: "invitation-123" },
          message: "Invitation sent successfully",
        })
      );

    render(<RosterLinkIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Invite User for Roster")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by username...");
    fireEvent.change(searchInput, { target: { value: "john" } });

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const userOption = screen.getByText("John Doe");
    fireEvent.click(userOption);

    const sendButton = screen.getByText("Send Invitation");
    fireEvent.click(sendButton);

    await waitFor(() => {
      // Check that the invitation was sent (the last call should be the POST to /roster/invite)
      const inviteCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === "/api/teams/team-slug/roster/invite" && call[1]?.method === "POST"
      );
      expect(inviteCalls).toHaveLength(1);

      const inviteCall = inviteCalls[0];
      expect(inviteCall[1]).toEqual(
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subteamId: "subteam-123",
            studentName: "John Doe",
            username: "johndoe",
            message: 'You\'ve been invited to join the team roster as "John Doe"',
          }),
        })
      );
    });
  });

  it("should close modal when cancel is clicked", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: "Not found" }, 404));

    render(<RosterLinkIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Invite User for Roster")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Invite User for Roster")).not.toBeInTheDocument();
    });
  });

  it("should handle invitation errors gracefully", async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ error: "Not found" }, 404))
      .mockResolvedValueOnce(
        createMockResponse({
          users: [
            {
              id: "user-123",
              email: "john@example.com",
              display_name: "John Doe",
              username: "johndoe",
            },
          ],
        })
      )
      .mockResolvedValueOnce(createMockResponse({ error: "User not found" }, 404));

    // Mock alert
    const mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<RosterLinkIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Invite User for Roster")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by username...");
    fireEvent.change(searchInput, { target: { value: "john" } });

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const userOption = screen.getByText("John Doe");
    fireEvent.click(userOption);

    const sendButton = screen.getByText("Send Invitation");
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("User not found");
    });

    mockAlert.mockRestore();
  });
});
