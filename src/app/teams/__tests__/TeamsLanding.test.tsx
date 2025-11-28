import TeamsLanding from "@app/teams/components/TeamsLanding";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the theme context
vi.mock("@/app/contexts/themeContext", () => ({
  useTheme: () => ({
    darkMode: false,
  }),
}));

// Mock the auth context
vi.mock("@/app/contexts/authContext", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-id",
      email: "test@example.com",
    },
  }),
}));

// Mock the notifications context
vi.mock("@/app/contexts/notificationsContext", () => ({
  useNotifications: () => ({
    unread: 0,
    notifs: [],
    refresh: vi.fn(),
    markAllRead: vi.fn(),
    markReadById: vi.fn(),
    clearingAll: false,
    setClearingAll: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: { alt?: string; [key: string]: unknown }) => (
    <img {...props} alt={props.alt || ""} />
  ),
}));

describe("TeamsLanding", () => {
  const mockOnCreateTeam = vi.fn();
  const mockOnJoinTeam = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the landing page with correct elements", () => {
    render(
      <TeamsLanding
        onCreateTeam={mockOnCreateTeam}
        onJoinTeam={mockOnJoinTeam}
        userTeams={[]}
        onTeamSelect={() => {
          // Empty handler for test
        }}
      />
    );

    // Check for main elements
    expect(screen.getByText("Scio.ly")).toBeInTheDocument();
    expect(screen.getByText("Add a team to get started")).toBeInTheDocument();
    expect(screen.getByText("Create team")).toBeInTheDocument();
    expect(screen.getByText("Join team")).toBeInTheDocument();
  });

  it("renders sidebar navigation items", () => {
    render(
      <TeamsLanding
        onCreateTeam={mockOnCreateTeam}
        onJoinTeam={mockOnJoinTeam}
        userTeams={[]}
        onTeamSelect={() => {
          // Empty handler for test
        }}
      />
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Archived teams")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("calls onCreateTeam when Create team button is clicked", () => {
    render(
      <TeamsLanding
        onCreateTeam={mockOnCreateTeam}
        onJoinTeam={mockOnJoinTeam}
        userTeams={[]}
        onTeamSelect={() => {
          // Empty handler for test
        }}
      />
    );

    const createButton = screen.getByText("Create team");
    fireEvent.click(createButton);

    expect(mockOnCreateTeam).toHaveBeenCalledTimes(1);
  });

  it("calls onJoinTeam when Join team button is clicked", () => {
    render(
      <TeamsLanding
        onCreateTeam={mockOnCreateTeam}
        onJoinTeam={mockOnJoinTeam}
        userTeams={[]}
        onTeamSelect={() => {
          // Empty handler for test
        }}
      />
    );

    const joinButton = screen.getByText("Join team");
    fireEvent.click(joinButton);

    expect(mockOnJoinTeam).toHaveBeenCalledTimes(1);
  });

  it("displays help text", () => {
    render(
      <TeamsLanding
        onCreateTeam={mockOnCreateTeam}
        onJoinTeam={mockOnJoinTeam}
        userTeams={[]}
        onTeamSelect={() => {
          // Empty handler for test
        }}
      />
    );

    expect(screen.getByText("Don't see your teams? Try another account.")).toBeInTheDocument();
  });

  it("renders illustration elements", () => {
    render(
      <TeamsLanding
        onCreateTeam={mockOnCreateTeam}
        onJoinTeam={mockOnJoinTeam}
        userTeams={[]}
        onTeamSelect={() => {
          // Empty handler for test
        }}
      />
    );

    // Check for illustration container
    const illustration = screen
      .getByText("Add a team to get started")
      .closest("div")
      ?.querySelector("div");
    expect(illustration).toBeInTheDocument();
  });
});
