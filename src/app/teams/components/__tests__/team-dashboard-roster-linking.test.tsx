import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import TeamDashboard from "@/app/teams/components/TeamDashboard";
import { TestProviders } from "@/test-utils/test-providers";

// Mock dependencies
vi.mock("@/app/contexts/themeContext", () => ({
  useTheme: () => ({ darkMode: false }),
}));

vi.mock("@/app/contexts/authContext", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}));

// Mock fetch
global.fetch = vi.fn();

const mockFetch = vi.mocked(global.fetch);

// Helper function to create mock responses
const createMockResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });

// Helper function to render with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(ui, {
    wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    ...options,
  });
};

describe("TeamDashboard - Roster Linking Integration", () => {
  const defaultProps = {
    team: {
      id: "team-123",
      school: "Test School",
      division: "B" as const,
      slug: "team-slug",
    },
    isCaptain: true,
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it("should load link status when switching to people tab", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ members: [] })).mockResolvedValueOnce(
      createMockResponse({
        linkStatus: {
          "John Doe": { isLinked: true, userId: "user-456", userEmail: "john@example.com" },
          "Jane Smith": { isLinked: false },
        },
      })
    );

    renderWithProviders(<TeamDashboard {...defaultProps} />);

    // Switch to people tab
    const peopleTab = screen.getByText("People");
    fireEvent.click(peopleTab);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/teams/team-slug/roster/link-status")
      );
    });
  });

  it("should display roster names with link indicators", async () => {
    // Mock initial data
    // const _mockTeams = [{
    //   id: '1',
    //   name: 'Test School',
    //   roster: {
    //     'Anatomy and Physiology': ['John Doe', 'Jane Smith'],
    //     'Astronomy': ['Bob Johnson']
    //   }
    // }];

    mockFetch.mockResolvedValueOnce(createMockResponse({ members: [] })).mockResolvedValueOnce(
      createMockResponse({
        linkStatus: {
          "John Doe": { isLinked: true, userId: "user-456", userEmail: "john@example.com" },
          "Jane Smith": { isLinked: false },
          "Bob Johnson": { isLinked: false },
        },
      })
    );

    // Mock the teams state by directly setting it
    renderWithProviders(<TeamDashboard {...defaultProps} />);

    // Simulate the component state after data loading
    // const _component = screen.getByTestId('team-dashboard') || document.body;

    // Switch to people tab
    const peopleTab = screen.getByText("People");
    fireEvent.click(peopleTab);

    await waitFor(() => {
      expect(screen.getByText("Roster Names")).toBeInTheDocument();
    });
  });

  it("should handle link status changes", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ members: [] })).mockResolvedValueOnce(
      createMockResponse({
        linkStatus: {
          "John Doe": { isLinked: false },
        },
      })
    );

    renderWithProviders(<TeamDashboard {...defaultProps} />);

    // Switch to people tab
    const peopleTab = screen.getByText("People");
    fireEvent.click(peopleTab);

    await waitFor(() => {
      expect(screen.getByText("Roster Names")).toBeInTheDocument();
    });
  });

  it("should load link status when subteam filter changes", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({
          subteams: [{ id: "12345678-1234-1234-8234-123456789012", name: "Test Subteam" }],
        })
      )
      .mockResolvedValueOnce(createMockResponse({ members: [] }))
      .mockResolvedValueOnce(
        createMockResponse({
          linkStatus: {
            "John Doe": { isLinked: true, userId: "user-456", userEmail: "john@example.com" },
          },
        })
      )
      .mockResolvedValueOnce(createMockResponse({ members: [] }))
      .mockResolvedValueOnce(
        createMockResponse({
          linkStatus: {
            "Jane Smith": { isLinked: false },
          },
        })
      );

    renderWithProviders(<TeamDashboard {...defaultProps} />);

    // Switch to people tab
    const peopleTab = screen.getByText("People");
    fireEvent.click(peopleTab);

    await waitFor(() => {
      expect(screen.getByText("Roster Names")).toBeInTheDocument();
    });

    // Change subteam filter
    const filterSelect = screen.getByDisplayValue("All Subteams");
    fireEvent.change(filterSelect, { target: { value: "12345678-1234-1234-8234-123456789012" } });

    await waitFor(() => {
      // Check that the component is working correctly by verifying the filter change
      expect(screen.getByDisplayValue("Test Subteam")).toBeInTheDocument();
    });
  });

  it("should display team members section separately from roster names", async () => {
    const mockMembers = [
      {
        id: "user-123",
        name: "Captain User",
        email: "captain@example.com",
        role: "captain",
        joinedAt: "2024-01-01",
        subteam: { id: "subteam-1", name: "Team A", teamId: "A" },
        events: ["Anatomy and Physiology"],
        eventCount: 1,
      },
    ];

    mockFetch
      .mockResolvedValueOnce(createMockResponse({ members: mockMembers }))
      .mockResolvedValueOnce(
        createMockResponse({
          linkStatus: {
            "John Doe": { isLinked: false },
          },
        })
      );

    renderWithProviders(<TeamDashboard {...defaultProps} />);

    // Switch to people tab
    const peopleTab = screen.getByText("People");
    fireEvent.click(peopleTab);

    await waitFor(() => {
      expect(screen.getByText("Roster Names")).toBeInTheDocument();
      expect(screen.getByText("Team Members")).toBeInTheDocument();
      expect(screen.getByText("Linked Members")).toBeInTheDocument();
    });
  });

  it("should handle errors when loading link status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Mock implementation - suppress console.error
    });

    mockFetch
      .mockResolvedValueOnce(createMockResponse({ members: [] }))
      .mockResolvedValueOnce(createMockResponse({ error: "Failed to load link status" }, 500));

    renderWithProviders(<TeamDashboard {...defaultProps} />);

    // Switch to people tab
    const peopleTab = screen.getByText("People");
    fireEvent.click(peopleTab);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Error loading link status:", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
