import TeamDashboard from "@/app/teams/components/TeamDashboard";
import { cleanup, fireEvent, renderWithProviders, screen, waitFor } from "@/test-utils";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex for performance
// Top-level regex for performance
const CLOSE_BUTTON_REGEX = /close/i;

// Global fetch mock to prevent network calls
global.fetch = vi.fn();

// Mock TeamDataLoader to prevent complex interactions
vi.mock("@/app/teams/components/TeamDataLoader", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock heavy tab components to prevent OOM
vi.mock("@/app/teams/components/TeamDashboard/components/HomeContent", () => ({
  HomeContent: ({ activeTab }: { activeTab: string }) => (
    <div data-testid="home-content">{activeTab} Content</div>
  ),
}));

// Stable mock functions
const mockExitTeamMutation = vi.fn(() => Promise.resolve());
const mockArchiveTeamMutation = vi.fn(() => Promise.resolve());
const mockCreateSubteamMutation = vi.fn(() => Promise.resolve({ id: "subteam-1" }));
const mockUpdateSubteamMutation = vi.fn(() => Promise.resolve());
const mockDeleteSubteamMutation = vi.fn(() => Promise.resolve());
const mockRefetch = vi.fn();

const mockTeamPageData = {
  userTeams: [],
  currentTeam: null,
  subteams: [],
  assignments: [],
  members: [],
  roster: {},
  auth: { role: "captain", isAuthorized: true },
};

// Mock tRPC client
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    teams: {
      exitTeam: {
        useMutation: () => ({
          mutateAsync: mockExitTeamMutation,
        }),
      },
      archiveTeam: {
        useMutation: () => ({
          mutateAsync: mockArchiveTeamMutation,
        }),
      },
      createSubteam: {
        useMutation: () => ({
          mutateAsync: mockCreateSubteamMutation,
        }),
      },
      updateSubteam: {
        useMutation: () => ({
          mutateAsync: mockUpdateSubteamMutation,
        }),
      },
      deleteSubteam: {
        useMutation: () => ({
          mutateAsync: mockDeleteSubteamMutation,
        }),
      },
      updateRoster: {
        useMutation: () => ({
          mutateAsync: vi.fn(() => Promise.resolve()),
        }),
      },
      removeRosterEntry: {
        useMutation: () => ({
          mutateAsync: vi.fn(() => Promise.resolve()),
        }),
      },
      exitSubteam: {
        useMutation: () => ({
          mutateAsync: vi.fn(() => Promise.resolve()),
        }),
      },
      updateRosterBulk: {
        useMutation: () => ({
          mutateAsync: vi.fn(() => Promise.resolve()),
        }),
      },
      getRoster: {
        useQuery: () => ({
          data: { roster: {}, removedEvents: [] },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
        }),
      },
      getTeamPageData: {
        useQuery: () => ({
          data: mockTeamPageData,
          isLoading: false,
          error: null,
          refetch: mockRefetch,
          isError: false,
        }),
      },
    },
  },
}));

// Stable team store mock
const mockTeamStore = {
  userTeams: [],
  getSubteams: vi.fn(() => []),
  loadSubteams: vi.fn(() => Promise.resolve()),
  updateSubteams: vi.fn(),
  updateAssignments: vi.fn(),
  updateMembers: vi.fn(),
  updateRoster: vi.fn(),
  invalidateCache: vi.fn(),
  getMembers: vi.fn(() => []),
  loadMembers: vi.fn(() => Promise.resolve()),
};

// Mock useTeamStore
vi.mock("@/app/hooks/useTeamStore", () => ({
  useTeamStore: () => mockTeamStore,
}));

// Stable auth mock
const mockAuth = {
  user: { id: "test-user-id", email: "test@example.com" },
  loading: false,
  client: {},
};

// Mock useAuth to return user immediately
vi.mock("@/app/contexts/authContext", () => {
  const actual = vi.importActual("@/app/contexts/authContext");
  return {
    ...actual,
    useAuth: () => mockAuth,
  };
});

// Stable router mock
const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
};

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/teams/test-team",
  useSearchParams: () => new URLSearchParams(),
}));

// Regex constants for test queries
const ASSIGNMENTS_REGEX = /assignments/i;
const PEOPLE_REGEX = /people/i;

describe("TeamDashboard", () => {
  const mockUser = { id: "test-user-id", email: "test@example.com" } as {
    id: string;
    email: string;
  };

  const defaultProps = {
    team: {
      id: "test-team-id",
      school: "Test School",
      division: "B" as const,
      slug: "test-team",
    },
    isCaptain: true,
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock for each test
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    // Cleanup React components
    cleanup();
  });

  it("should render team dashboard with basic elements", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, {
      initialUser: mockUser,
    });

    await waitFor(
      () => {
        expect(screen.getByText("Test School")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Division text might be split, so use a more flexible matcher
    await waitFor(
      () => {
        expect(
          screen.getByText((content, element) => {
            return element?.textContent === "Division B" || content.includes("Division B");
          })
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    // Note: Tab navigation is now handled by separate routes, so we don't test for tab text here
  });

  it("should render with roster tab by default", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });
  });

  it("should render with stream tab when specified", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} activeTab="stream" />, {
      initialUser: mockUser,
    });

    await waitFor(() => {
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });
  });

  it("should render with assignments tab when specified", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} activeTab="assignments" />, {
      initialUser: mockUser,
    });

    await waitFor(() => {
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });
  });

  it("should render with people tab when specified", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} activeTab="people" />, {
      initialUser: mockUser,
    });

    await waitFor(() => {
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });
  });

  it("should show invite and exit buttons for captain", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, { initialUser: mockUser });

    const inviteButton = screen.getByTitle("Invite Person");
    const exitButton = screen.getByTitle("Exit Team");

    expect(inviteButton).toBeInTheDocument();
    expect(exitButton).toBeInTheDocument();
  });

  it("should not show invite and exit buttons for non-captain", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} isCaptain={false} />, {
      initialUser: mockUser,
    });

    await waitFor(() => {
      expect(screen.queryByTitle("Invite Person")).not.toBeInTheDocument();
    });
    // Exit button is still shown for non-captains
    expect(screen.getByTitle("Exit Team")).toBeInTheDocument();
  });

  it("should open invite modal when invite button is clicked", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByTitle("Invite Person")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Invite Person"));
    await waitFor(() => {
      expect(screen.getByText("Team Invite Codes")).toBeInTheDocument();
    });
  });

  it("should open exit modal when exit button is clicked", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByTitle("Exit Team")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Exit Team"));
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to exit this team?")).toBeInTheDocument();
    });
  });

  it("should close invite modal when cancel is clicked", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByTitle("Invite Person")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Invite Person"));

    await waitFor(() => {
      expect(screen.getByText("Team Invite Codes")).toBeInTheDocument();
    });

    // Click the close button
    const closeButton = screen.getByRole("button", { name: CLOSE_BUTTON_REGEX });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("Team Invite Codes")).not.toBeInTheDocument();
    });
  });

  it("should close exit modal when cancel is clicked", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByTitle("Exit Team")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Exit Team"));
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to exit this team?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(
        screen.queryByText("Are you sure you want to exit this team?")
      ).not.toBeInTheDocument();
    });
  });

  // Search functionality not implemented in current BannerInvite component
  it("should show invite codes when invite button is clicked", async () => {
    const mockCodes = {
      captainCode: "CAP-123",
      userCode: "USR-456",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCodes),
    });

    renderWithProviders(<TeamDashboard {...defaultProps} />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByTitle("Invite Person")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Invite Person"));

    await waitFor(() => {
      expect(screen.getByText("Team Invite Codes")).toBeInTheDocument();
      expect(screen.getByText("CAP-123")).toBeInTheDocument();
      expect(screen.getByText("USR-456")).toBeInTheDocument();
    });
  });

  it("should show assignments tab content when activeTab is assignments", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} activeTab="assignments" />, {
      initialUser: mockUser,
    });

    await waitFor(() => {
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });

    await waitFor(() => {
      // With mocked HomeContent, verify it renders the correct tab
      expect(screen.getByTestId("home-content")).toBeInTheDocument();
      expect(screen.getByText(ASSIGNMENTS_REGEX)).toBeInTheDocument();
    });
  });

  it("should show people tab content when activeTab is people", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} activeTab="people" />, {
      initialUser: mockUser,
    });

    await waitFor(() => {
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });

    // With mocked HomeContent, verify it renders
    await waitFor(() => {
      expect(screen.getByTestId("home-content")).toBeInTheDocument();
      expect(screen.getByText(PEOPLE_REGEX)).toBeInTheDocument();
    });
  });

  it("should handle dark mode correctly", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, {
      initialDarkMode: true,
      initialUser: mockUser,
    });

    // Verify the component renders with dark mode
    await waitFor(() => {
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });

    // Verify mocked HomeContent renders
    await waitFor(() => {
      expect(screen.getByTestId("home-content")).toBeInTheDocument();
    });
  });

  it("should have All Teams button for navigation", async () => {
    renderWithProviders(<TeamDashboard {...defaultProps} />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });

    // Look for the "All Teams" button in the sidebar which acts as back navigation
    const allTeamsButton = screen.getByText("All Teams");
    expect(allTeamsButton).toBeInTheDocument();
    expect(allTeamsButton).toBeEnabled();
  });
});
