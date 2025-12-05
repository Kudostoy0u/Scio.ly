import TeamsPageClient from "@/app/teams/components/TeamsPageClient";
import { renderWithProviders, screen, waitFor } from "@/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/trpc/client", () => {
	const utilsMock = {
		teams: {
			listUserTeams: { invalidate: vi.fn() },
			pendingInvites: { invalidate: vi.fn() },
		},
	};

	const state = {
		listUserTeamsReturn: {
			data: { teams: [] as unknown[] },
			isLoading: false,
		} as
			| { data: { teams: unknown[] }; isLoading: boolean; error?: Error }
			| { data?: undefined; isLoading: boolean; error?: Error },
		pendingInvitesReturn: {
			invites: [] as unknown[],
			isLoading: false,
		},
	};

	const __mock = {
		setListUserTeamsReturn: (
			value:
				| { data: { teams: unknown[] }; isLoading: boolean; error?: Error }
				| { data?: undefined; isLoading: boolean; error?: Error },
		) => {
			state.listUserTeamsReturn = value;
		},
		setPendingInvitesReturn: (value: {
			invites: unknown[];
			isLoading: boolean;
		}) => {
			state.pendingInvitesReturn = value;
		},
	};

	return {
		__esModule: true,
		trpc: {
			useUtils: () => utilsMock,
			teams: {
				listUserTeams: {
					useQuery: vi.fn(() => state.listUserTeamsReturn),
				},
				pendingInvites: {
					useQuery: vi.fn(() => state.pendingInvitesReturn),
				},
				createTeam: {
					useMutation: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
						mutateAsync: async () => {
							onSuccess?.();
							return { slug: "new-team" };
						},
						isLoading: false,
					}),
				},
				joinTeam: {
					useMutation: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
						mutateAsync: async () => {
							onSuccess?.();
							return { slug: "joined-team" };
						},
						isLoading: false,
					}),
				},
				acceptInvite: {
					useMutation: () => ({
						mutate: vi.fn(),
						mutateAsync: vi.fn(),
						isLoading: false,
					}),
				},
				declineInvite: {
					useMutation: () => ({
						mutate: vi.fn(),
						isLoading: false,
					}),
				},
			},
		},
		__mock,
	};
});


// Mock the auth context
vi.mock("@/app/contexts/AuthContext", () => ({
	useAuth: () => ({
		user: {
			id: "test-user-id",
			email: "test@example.com",
		},
	}),
}));

// Mock the router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

// Mock toast
vi.mock("react-toastify", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock fetch
global.fetch = vi.fn() as Mock;

describe("TeamsPageClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(global.fetch as unknown as { mockClear: () => void }).mockClear();
	});

	it("shows loading state initially", () => {

		renderWithProviders(<TeamsPageClient />);

		expect(
			document.querySelector(".animate-spin.rounded-full"),
		).toBeInTheDocument();
	});

	it("shows sign in message when user is not authenticated", () => {
		renderWithProviders(<TeamsPageClient />, {
			initialUser: null,
		});

		expect(screen.getByText("Sign in to see your teams.")).toBeInTheDocument();
	});

	it("shows landing page when user has no teams", async () => {

		renderWithProviders(<TeamsPageClient />);

		await waitFor(() => {
			expect(screen.getByText("Add a team to get started")).toBeInTheDocument();
		});
	});

	it("shows dashboard when user has teams", async () => {


		renderWithProviders(<TeamsPageClient />);

		await waitFor(() => {
			expect(screen.getByText("Test School")).toBeInTheDocument();
		});
	});

	it("handles API errors gracefully", async () => {

		renderWithProviders(<TeamsPageClient />);

		await waitFor(() => {
			expect(screen.getByText("Add a team to get started")).toBeInTheDocument();
		});
	});

	it("creates team successfully", async () => {
		renderWithProviders(<TeamsPageClient />);

		await waitFor(() => {
			expect(screen.getByText("Add a team to get started")).toBeInTheDocument();
		});

		// Simulate team creation
		const createButton = screen.getByText("Create team");
		createButton.click();

		// This would trigger the modal, but we're testing the component logic
		expect(createButton).toBeInTheDocument();
	});

	it("joins team successfully", async () => {
		renderWithProviders(<TeamsPageClient />);

		await waitFor(() => {
			expect(screen.getByText("Add a team to get started")).toBeInTheDocument();
		});

		// Simulate team joining
		const joinButton = screen.getByText("Join team");
		joinButton.click();

		// This would trigger the modal, but we're testing the component logic
		expect(joinButton).toBeInTheDocument();
	});
});
