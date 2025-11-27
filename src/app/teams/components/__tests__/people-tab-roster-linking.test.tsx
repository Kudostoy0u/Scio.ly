import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import PeopleTab from "@/app/teams/components/PeopleTab";
import { TestProviders } from "@/test-utils/test-providers";

// Global fetch mock
global.fetch = vi.fn();

// Mock dependencies
vi.mock("@/app/contexts/themeContext", () => ({
  useTheme: () => ({ darkMode: false }),
}));

vi.mock("@/app/contexts/authContext", () => ({
  useAuth: () => ({ user: { id: "user-123", email: "test@example.com" } }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useTeamStore
const mockTeamStore = {
  userTeams: [],
  getSubteams: vi.fn(() => []),
  loadSubteams: vi.fn(() => Promise.resolve()),
  updateSubteam: vi.fn(),
  deleteSubteam: vi.fn(),
  invalidateCache: vi.fn(),
  getRoster: vi.fn(() => ({
    "Anatomy and Physiology": ["John Doe", "Jane Smith"],
    "Astronomy": ["Bob Johnson"],
  })),
  getMembers: vi.fn(() => []),
  loadMembers: vi.fn(() => Promise.resolve()),
  updateMembers: vi.fn(),
  updateSubteams: vi.fn(),
  updateAssignments: vi.fn(),
  updateRoster: vi.fn(),
};

vi.mock("@/app/hooks/useTeamStore", () => ({
  useTeamStore: () => mockTeamStore,
}));

// Mock RosterLinkIndicator to avoid its complexity
vi.mock("@/app/teams/components/RosterLinkIndicator", () => ({
  default: ({ studentName, isLinked, onLinkStatusChange }: {
    studentName: string;
    isLinked: boolean;
    onLinkStatusChange: (name: string, linked: boolean) => void;
  }) => (
    <button
      data-testid={`link-indicator-${studentName}`}
      onClick={() => onLinkStatusChange(studentName, !isLinked)}
      aria-label={isLinked ? "Linked" : "Not linked"}
    >
      {isLinked ? "✓" : "+"}
    </button>
  ),
}));

// Mock useMemberActions hook
vi.mock("@/app/teams/components/hooks/useMemberActions", () => ({
  useMemberActions: () => ({
    handleRemoveSelfFromSubteam: vi.fn(),
    handleRemoveOtherFromSubteam: vi.fn(),
    handleRemoveEvent: vi.fn(),
    handleAddEvent: vi.fn(),
    handleSubteamAssign: vi.fn(),
    handleInviteSubmit: vi.fn(),
    handleLinkInviteSubmit: vi.fn(),
    handleCancelLinkInvite: vi.fn(),
    handleCancelInvitation: vi.fn(),
    handleRemoveMember: vi.fn(),
    handlePromoteToCaptain: vi.fn(),
  }),
}));

const mockFetch = vi.mocked(global.fetch);

describe("PeopleTab - Roster Linking", () => {
  const defaultProps = {
    team: {
      id: "team-123",
      school: "Test School",
      division: "B" as const,
      slug: "test-school",
    },
    isCaptain: true,
    onInvitePerson: vi.fn(),
    activeSubteamId: null,
    subteams: [],
    onSubteamChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("should load and display roster names when captain views people tab", async () => {
    // Mock link status response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        linkStatus: {
          "John Doe": { isLinked: true, userId: "user-456", userEmail: "john@example.com" },
          "Jane Smith": { isLinked: false },
          "Bob Johnson": { isLinked: false },
        },
      }),
    } as Response);

    render(
      <TestProviders>
        <PeopleTab {...defaultProps} />
      </TestProviders>
    );

    // Wait for link status to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/teams/test-school/roster/link-status")
      );
    });

    // Verify Roster Names section is displayed
    await waitFor(() => {
      expect(screen.getByText("Roster Names")).toBeInTheDocument();
    });

    // Verify all roster names are displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
  });

  it("should display link indicators for each roster name", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        linkStatus: {
          "John Doe": { isLinked: true, userId: "user-456", userEmail: "john@example.com" },
          "Jane Smith": { isLinked: false },
          "Bob Johnson": { isLinked: false },
        },
      }),
    } as Response);

    render(
      <TestProviders>
        <PeopleTab {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText("Roster Names")).toBeInTheDocument();
    });

    // Verify link indicators exist for each name
    expect(screen.getByTestId("link-indicator-John Doe")).toBeInTheDocument();
    expect(screen.getByTestId("link-indicator-Jane Smith")).toBeInTheDocument();
    expect(screen.getByTestId("link-indicator-Bob Johnson")).toBeInTheDocument();

    // Verify linked vs not linked status
    expect(screen.getByTestId("link-indicator-John Doe")).toHaveTextContent("✓");
    expect(screen.getByTestId("link-indicator-Jane Smith")).toHaveTextContent("+");
  });

  it("should reload link status when subteam filter changes", async () => {
    const subteams = [
      { id: "subteam-1", name: "Subteam A", team_id: "team-123", description: "", created_at: "" },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ linkStatus: { "John Doe": { isLinked: false } } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ linkStatus: { "Jane Smith": { isLinked: true } } }),
      } as Response);

    render(
      <TestProviders>
        <PeopleTab {...defaultProps} subteams={subteams} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Change subteam filter
    const select = screen.getByDisplayValue("All Subteams");
    fireEvent.change(select, { target: { value: "subteam-1" } });

    // Verify link status is reloaded for the new subteam
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("?subteamId=subteam-1")
      );
    });
  });

  it("should display Team Members section", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ linkStatus: {} }),
    } as Response);

    render(
      <TestProviders>
        <PeopleTab {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText("Team Members")).toBeInTheDocument();
    });
  });

  it("should handle errors when loading link status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock a fetch error (not just ok: false, but actual error)
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <TestProviders>
        <PeopleTab {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Error should be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading link status:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("should not display Roster Names section for non-captains", async () => {
    render(
      <TestProviders>
        <PeopleTab {...defaultProps} isCaptain={false} />
      </TestProviders>
    );

    // Roster Names section should not be displayed
    await waitFor(() => {
      expect(screen.queryByText("Roster Names")).not.toBeInTheDocument();
    });

    // But Team Members should still be displayed
    expect(screen.getByText("Team Members")).toBeInTheDocument();
  });

  it("should update link status when link indicator is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        linkStatus: {
          "John Doe": { isLinked: false },
        },
      }),
    } as Response);

    render(
      <TestProviders>
        <PeopleTab {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText("Roster Names")).toBeInTheDocument();
    });

    // Initially not linked
    const indicator = screen.getByTestId("link-indicator-John Doe");
    expect(indicator).toHaveTextContent("+");

    // Click to link
    fireEvent.click(indicator);

    // Should update to linked
    await waitFor(() => {
      expect(indicator).toHaveTextContent("✓");
    });
  });
});
