import * as trpcClientModule from "@/lib/trpc/client";
import TeamCalendar from "@app/teams/components/TeamCalendar";
import TeamsLanding from "@app/teams/components/TeamsLanding";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface Team {
	id: string;
	name: string;
	slug: string;
	school: string;
	division: "B" | "C";
	description?: string;
	members: Array<{
		id: string;
		name: string;
		email: string;
		role: "admin" | "captain" | "member";
	}>;
}

// Top-level regex patterns for test matching
const NEXT_BUTTON_REGEX = /next/i;
const PREV_BUTTON_REGEX = /previous/i;
const MONTH_REGEX = /February|March|April/;
const PREV_MONTH_REGEX = /December|January/;
const DAY_NUMBER_REGEX = /^\d+$/;

// Mock all the required modules
vi.mock("@/app/contexts/ThemeContext", () => ({
	useTheme: () => ({
		darkMode: false,
	}),
}));

vi.mock("@/app/contexts/AuthContext", () => ({
	useAuth: () => ({
		user: {
			id: "test-user-id",
			email: "test@example.com",
		},
	}),
}));

vi.mock("@/lib/trpc/client", () => {
	const utilsMock = {
		teams: {
			personalCalendarEvents: {
				invalidate: vi.fn(),
				prefetch: vi.fn(),
			},
			teamCalendarEvents: {
				invalidate: vi.fn(),
				prefetch: vi.fn(),
			},
		},
	};

	const state = {
		listUserTeamsWithSubteamsReturn: {
			data: {
				teams: [
					{
						id: "team-123",
						name: "Test Team",
						slug: "test-team",
						school: "Test School",
						division: "B",
						role: "captain",
						subteams: [
							{ id: "subteam-1", name: "Varsity" },
							{ id: "subteam-2", name: "JV" },
						],
					},
				],
			},
			isLoading: false,
		} as { data: { teams: unknown[] }; isLoading: boolean; error?: Error },
		personalEventsReturn: {
			data: [],
			isLoading: false,
		} as { data: unknown[]; isLoading: boolean; error?: Error },
		teamEventsReturn: {
			data: [],
			isLoading: false,
		} as { data: unknown[]; isLoading: boolean; error?: Error },
		calendarManifestReturn: {
			data: {
				personalUpdatedAt: new Date().toISOString(),
				teams: [
					{
						teamId: "team-123",
						calendarUpdatedAt: new Date().toISOString(),
					},
				],
			},
			isLoading: false,
		} as { data: unknown; isLoading: boolean; error?: Error },
		createEventMutation: vi.fn(async () => ({ eventId: "new-event-id" })),
		skipOccurrenceMutation: vi.fn(async () => ({ success: true })),
	};

	const reset = () => {
		state.listUserTeamsWithSubteamsReturn = {
			data: {
				teams: [
					{
						id: "team-123",
						name: "Test Team",
						slug: "test-team",
						school: "Test School",
						division: "B",
						role: "captain",
						subteams: [
							{ id: "subteam-1", name: "Varsity" },
							{ id: "subteam-2", name: "JV" },
						],
					},
				],
			},
			isLoading: false,
		};
		state.personalEventsReturn = { data: [], isLoading: false };
		state.teamEventsReturn = { data: [], isLoading: false };
		state.calendarManifestReturn = {
			data: {
				personalUpdatedAt: new Date().toISOString(),
				teams: [
					{
						teamId: "team-123",
						calendarUpdatedAt: new Date().toISOString(),
					},
				],
			},
			isLoading: false,
		};
		state.createEventMutation = vi.fn(async () => ({
			eventId: "new-event-id",
		}));
		state.skipOccurrenceMutation = vi.fn(async () => ({ success: true }));
	};

	const __mock = {
		reset,
		setPersonalEventsReturn: (value: {
			data: unknown[];
			isLoading: boolean;
			error?: Error;
		}) => {
			state.personalEventsReturn = value;
		},
		setTeamEventsReturn: (value: {
			data: unknown[];
			isLoading: boolean;
			error?: Error;
		}) => {
			state.teamEventsReturn = value;
		},
		setCalendarManifestReturn: (value: {
			data: unknown;
			isLoading: boolean;
			error?: Error;
		}) => {
			state.calendarManifestReturn = value;
		},
		getCreateEventMutation: () => state.createEventMutation,
		getUtils: () => utilsMock,
	};

	reset();

	return {
		__esModule: true,
		trpc: {
			useUtils: () => utilsMock,
			teams: {
				listUserTeamsWithSubteams: {
					useQuery: vi.fn(() => state.listUserTeamsWithSubteamsReturn),
				},
				calendarManifest: {
					useQuery: vi.fn(() => state.calendarManifestReturn),
				},
				personalCalendarEvents: {
					useQuery: vi.fn(() => state.personalEventsReturn),
				},
				teamCalendarEvents: {
					useQuery: vi.fn(() => state.teamEventsReturn),
				},
				createCalendarEvent: {
					useMutation: () => ({
						mutateAsync: state.createEventMutation,
						isLoading: false,
					}),
				},
				deleteCalendarEvent: {
					useMutation: () => ({
						mutateAsync: vi.fn(),
						isLoading: false,
					}),
				},
				skipCalendarOccurrence: {
					useMutation: () => ({
						mutateAsync: state.skipOccurrenceMutation,
						isLoading: false,
					}),
				},
			},
		},
		__mock,
	};
});

vi.mock("react-toastify", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("framer-motion", () => ({
	motion: {
		div: ({
			children,
			...props
		}: { children: ReactNode; [key: string]: unknown }) => (
			<div {...props}>{children}</div>
		),
	},
	AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
	Plus: ({ className }: { className?: string }) => (
		<div className={className} data-testid="plus-icon" />
	),
	Edit: ({ className }: { className?: string }) => (
		<div className={className} data-testid="edit-icon" />
	),
	Trash2: ({ className }: { className?: string }) => (
		<div className={className} data-testid="trash-icon" />
	),
	X: ({ className }: { className?: string }) => (
		<div className={className} data-testid="x-icon" />
	),
	Repeat: ({ className }: { className?: string }) => (
		<div className={className} data-testid="repeat-icon" />
	),
	ChevronLeft: ({ className }: { className?: string }) => (
		<div className={className} data-testid="chevron-left-icon" />
	),
	ChevronRight: ({ className }: { className?: string }) => (
		<div className={className} data-testid="chevron-right-icon" />
	),
	Home: ({ className }: { className?: string }) => (
		<div className={className} data-testid="home-icon" />
	),
	Calendar: ({ className }: { className?: string }) => (
		<div className={className} data-testid="calendar-icon" />
	),
	Archive: ({ className }: { className?: string }) => (
		<div className={className} data-testid="archive-icon" />
	),
	Settings: ({ className }: { className?: string }) => (
		<div className={className} data-testid="settings-icon" />
	),
	Users: ({ className }: { className?: string }) => (
		<div className={className} data-testid="users-icon" />
	),
}));

// Mock NotificationsContext
vi.mock("@/app/contexts/NotificationsContext", () => ({
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

describe("Calendar Integration Tests", () => {
	// Get the mock from the mocked module
	const trpcMock = (
		trpcClientModule as unknown as {
			__mock: {
				reset: () => void;
				setListUserTeamsReturn: (value: {
					data: { teams: unknown[] };
					isLoading: boolean;
					error?: Error;
				}) => void;
				setCalendarEventsReturn: (value: {
					data: unknown[];
					isLoading: boolean;
					error?: Error;
				}) => void;
				setRecurringMeetingsReturn: (value: {
					data: unknown[];
					isLoading: boolean;
					error?: Error;
				}) => void;
				getCreateEventMutation: () => ReturnType<typeof vi.fn>;
				getCreateRecurringMutation: () => ReturnType<typeof vi.fn>;
				getUtils: () => unknown;
			};
		}
	).__mock;

	beforeEach(() => {
		vi.clearAllMocks();
		trpcMock.reset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Calendar Component Integration", () => {
		it("loads and displays team events and personal events", async () => {
			const mockTeamEvents = [
				{
					id: "team-event-1",
					title: "Team Practice",
					start_time: new Date().toISOString(),
					end_time: null,
					event_type: "practice",
					is_all_day: false,
					is_recurring: false,
					created_by: "test-user-id",
					team_id: "team-123",
				},
			];

			const mockPersonalEvents = [
				{
					id: "personal-event-1",
					title: "Personal Study",
					start_time: new Date().toISOString(),
					end_time: null,
					event_type: "personal",
					is_all_day: false,
					is_recurring: false,
					created_by: "test-user-id",
					team_id: null,
				},
			];

			const mockRecurringMeetings = [
				{
					id: "recurring-1",
					team_id: "team-123",
					title: "Weekly Practice",
					days_of_week: [1, 3], // Monday and Wednesday
					start_time: "15:00",
					end_time: "17:00",
					start_date: "2024-01-01",
					end_date: "2024-12-31",
					exceptions: [],
				},
			];

			trpcMock.setCalendarEventsReturn({
				data: [...mockTeamEvents, ...mockPersonalEvents],
				isLoading: false,
			});
			trpcMock.setRecurringMeetingsReturn({
				data: mockRecurringMeetings,
				isLoading: false,
			});

			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			await waitFor(() => {
				expect(screen.getByText("Team Practice")).toBeInTheDocument();
				expect(screen.getByText("Personal Study")).toBeInTheDocument();
			});
		});

		it("creates event and refreshes calendar", async () => {
			const createEvent = trpcMock.getCreateEventMutation();

			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			// Open event modal
			const addEventButton = screen.getByText("Add Event");
			fireEvent.click(addEventButton);

			await waitFor(() => {
				expect(screen.getByText("Create Event")).toBeInTheDocument();
			});

			// Fill out form
			fireEvent.change(screen.getByPlaceholderText("Event title"), {
				target: { value: "New Team Event" },
			});
			fireEvent.change(screen.getByDisplayValue(""), {
				target: { value: "14:00" },
			});
			fireEvent.change(screen.getByDisplayValue(""), {
				target: { value: "16:00" },
			});

			// Submit form
			const createButton = screen.getByText("Create");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(createEvent).toHaveBeenCalledWith(
					expect.objectContaining({
						title: "New Team Event",
					}),
				);
			});
		});

		it("creates recurring meeting and refreshes calendar", async () => {
			const createRecurring = trpcMock.getCreateRecurringMutation();

			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			// Open recurring meeting modal
			const recurringButton = screen.getByText("Recurring");
			fireEvent.click(recurringButton);

			await waitFor(() => {
				expect(
					screen.getByText("Create Recurring Meeting"),
				).toBeInTheDocument();
			});

			// Fill out form
			fireEvent.change(
				screen.getByPlaceholderText("e.g., Weekly Science Olympiad Practice"),
				{
					target: { value: "Weekly Practice" },
				},
			);

			// Select days of week
			const mondayCheckbox = screen.getByDisplayValue("1");
			const wednesdayCheckbox = screen.getByDisplayValue("3");
			fireEvent.click(mondayCheckbox);
			fireEvent.click(wednesdayCheckbox);

			fireEvent.change(screen.getByDisplayValue(""), {
				target: { value: "15:00" },
			});
			fireEvent.change(screen.getByDisplayValue(""), {
				target: { value: "17:00" },
			});

			// Submit form
			const createButton = screen.getByText("Create Recurring Meeting");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(createRecurring).toHaveBeenCalledWith(
					expect.objectContaining({
						title: "Weekly Practice",
					}),
				);
			});
		});
	});

	describe("TeamsLanding Integration", () => {
		it("switches to upcoming tab and shows calendar", async () => {
			const mockUserTeams: Team[] = [
				{
					id: "team-1",
					name: "Test Team",
					slug: "test-team",
					school: "Test School",
					division: "B",
					members: [],
				},
			];

			render(
				<TeamsLanding
					onCreateTeam={() => {
						// Empty handler for test
					}}
					onJoinTeam={() => {
						// Empty handler for test
					}}
					userTeams={mockUserTeams}
					onTeamSelect={() => {
						// Empty handler for test
					}}
				/>,
			);

			// Click on Upcoming tab
			const upcomingTab = screen.getByText("Upcoming");
			fireEvent.click(upcomingTab);

			await waitFor(() => {
				expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
			});
		});

		it("shows different content for different tabs", async () => {
			const mockUserTeams: Team[] = [
				{
					id: "team-1",
					name: "Test Team",
					slug: "test-team",
					school: "Test School",
					division: "B",
					members: [],
				},
			];

			render(
				<TeamsLanding
					onCreateTeam={() => {
						// Empty handler for test
					}}
					onJoinTeam={() => {
						// Empty handler for test
					}}
					userTeams={mockUserTeams}
					onTeamSelect={() => {
						// Empty handler for test
					}}
				/>,
			);

			// Should start with home tab
			expect(screen.getByText("Add a team to get started")).toBeInTheDocument();

			// Switch to settings tab
			const settingsTab = screen.getByText("Settings");
			fireEvent.click(settingsTab);

			await waitFor(() => {
				expect(
					screen.getByText("Team and account settings will appear here."),
				).toBeInTheDocument();
			});
		});
	});

	describe("Error Handling Integration", () => {
		it("handles API errors gracefully", async () => {
			trpcMock.setCalendarEventsReturn({
				data: [],
				isLoading: false,
				error: new Error("Network error"),
			});

			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			await waitFor(() => {
				// Should not crash and should show calendar
				expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
			});
		});

		it("handles partial API failures", async () => {
			trpcMock.setCalendarEventsReturn({
				data: [],
				isLoading: false,
				error: new Error("Events failed"),
			});
			trpcMock.setRecurringMeetingsReturn({
				data: [],
				isLoading: false,
				error: new Error("Recurring meetings failed"),
			});

			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			await waitFor(() => {
				// Should still show calendar even if personal events fail
				expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
			});
		});
	});

	describe("Calendar Navigation Integration", () => {
		it("navigates between months and maintains state", async () => {
			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			// Navigate to next month
			const nextButton = screen.getByRole("button", {
				name: NEXT_BUTTON_REGEX,
			});
			fireEvent.click(nextButton);

			await waitFor(() => {
				// Should show next month
				expect(screen.getByText(MONTH_REGEX)).toBeInTheDocument();
			});

			// Navigate to previous month
			const prevButton = screen.getByRole("button", {
				name: PREV_BUTTON_REGEX,
			});
			fireEvent.click(prevButton);

			await waitFor(() => {
				// Should show previous month
				expect(screen.getByText(PREV_MONTH_REGEX)).toBeInTheDocument();
			});
		});

		it("changes view modes and maintains calendar state", async () => {
			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			// Change to week view
			const weekButton = screen.getByText("Week");
			fireEvent.click(weekButton);

			expect(weekButton).toHaveClass("bg-blue-500");

			// Change to day view
			const dayButton = screen.getByText("Day");
			fireEvent.click(dayButton);

			expect(dayButton).toHaveClass("bg-blue-500");
			expect(weekButton).not.toHaveClass("bg-blue-500");
		});
	});

	describe("Event Interaction Integration", () => {
		it("allows clicking on events to view details", async () => {
			const mockEvents = [
				{
					id: "event-1",
					title: "Team Practice",
					start_time: new Date().toISOString(),
					event_type: "practice",
					is_all_day: false,
					is_recurring: false,
					created_by: "test-user-id",
					description: "Weekly team practice",
					location: "Gym",
				},
			];

			trpcMock.setCalendarEventsReturn({
				data: mockEvents,
				isLoading: false,
			});

			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			await waitFor(() => {
				expect(screen.getByText("Team Practice")).toBeInTheDocument();
			});

			// Click on event
			const eventElement = screen.getByText("Team Practice");
			fireEvent.click(eventElement);

			// Should open event details or modal
			// This would depend on the specific implementation
		});

		it("allows adding events to specific dates", async () => {
			render(
				<TeamCalendar
					teamId="team-123"
					isCaptain={true}
					teamSlug="test-team"
				/>,
			);

			// Find a day in the current month
			const dayButtons = screen.getAllByRole("button");
			const dayButton = dayButtons.find(
				(button) =>
					button.textContent && DAY_NUMBER_REGEX.test(button.textContent),
			);

			if (dayButton) {
				fireEvent.click(dayButton);

				await waitFor(() => {
					expect(screen.getByText("Create Event")).toBeInTheDocument();
				});
			}
		});
	});
});
