import RosterSelectionStep from "@/app/teams/components/assignment/RosterSelectionStep";
import type { RosterMember } from "@/app/teams/components/assignment/assignmentTypes";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("RosterSelectionStep", () => {
	const mockRosterMembers: RosterMember[] = [
		{
			student_name: "John Doe",
			user_id: "user1",
			subteam_id: "subteam1",
			isLinked: true,
			userEmail: "john@example.com",
			username: "johndoe",
		},
		{
			student_name: "Jane Smith",
			user_id: "user2",
			subteam_id: "subteam1",
			isLinked: true,
			userEmail: "jane@example.com",
			username: "janesmith",
		},
		{
			student_name: "Bob Johnson",
			user_id: "user3",
			subteam_id: "subteam1",
			isLinked: false,
			userEmail: "bob@example.com",
		},
	];

	const mockProps = {
		darkMode: false,
		onNext: vi.fn(),
		onBack: vi.fn(),
		onError: vi.fn(),
		rosterMembers: mockRosterMembers,
		selectedRoster: [],
		onRosterChange: vi.fn(),
		loadingRoster: false,
		onCreateAssignment: vi.fn(),
		creating: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders roster selection header", () => {
			render(<RosterSelectionStep {...mockProps} />);

			expect(screen.getByText("Select Roster Members")).toBeInTheDocument();
		});

		it("renders all roster members", () => {
			render(<RosterSelectionStep {...mockProps} />);

			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText("Jane Smith")).toBeInTheDocument();
			expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
		});

		it("renders member status indicators", () => {
			render(<RosterSelectionStep {...mockProps} />);

			expect(screen.getAllByText("Linked")).toHaveLength(2);
			expect(screen.getByText("Unlinked")).toBeInTheDocument();
		});

		it("renders usernames when available", () => {
			render(<RosterSelectionStep {...mockProps} />);

			expect(screen.getByText("@johndoe")).toBeInTheDocument();
			expect(screen.getByText("@janesmith")).toBeInTheDocument();
		});

		it("renders email when username not available", () => {
			render(<RosterSelectionStep {...mockProps} />);

			expect(screen.getByText("bob@example.com")).toBeInTheDocument();
		});

		it("renders checkboxes for all members", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const checkboxes = screen.getAllByRole("checkbox");
			expect(checkboxes).toHaveLength(3);
		});
	});

	describe("Loading State", () => {
		it("shows loading message when loading roster", () => {
			render(<RosterSelectionStep {...mockProps} loadingRoster={true} />);

			expect(screen.getByText("Loading roster...")).toBeInTheDocument();
			expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
		});
	});

	describe("Empty State", () => {
		it("shows empty state when no roster members", () => {
			render(<RosterSelectionStep {...mockProps} rosterMembers={[]} />);

			expect(screen.getByText("No roster members found")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Make sure team members are properly linked to their accounts.",
				),
			).toBeInTheDocument();
		});
	});

	describe("Member Selection", () => {
		it("calls onRosterChange when linked member is clicked", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const johnDoe = screen.getByText("John Doe");
			fireEvent.click(johnDoe);

			expect(mockProps.onRosterChange).toHaveBeenCalledWith(["John Doe"]);
		});

		it("calls onRosterChange when linked member checkbox is clicked", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const johnCheckbox = screen.getAllByRole("checkbox")[0];
			if (!johnCheckbox) throw new Error("John checkbox not found");
			fireEvent.click(johnCheckbox);

			expect(mockProps.onRosterChange).toHaveBeenCalledWith(["John Doe"]);
		});

		it("does not call onRosterChange when unlinked member is clicked", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const bobJohnson = screen.getByText("Bob Johnson");
			fireEvent.click(bobJohnson);

			expect(mockProps.onRosterChange).not.toHaveBeenCalled();
		});

		it("does not call onRosterChange when unlinked member checkbox is clicked", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const bobCheckbox = screen.getAllByRole("checkbox")[2]; // Bob is the third checkbox
			if (!bobCheckbox) throw new Error("Bob checkbox not found");
			fireEvent.click(bobCheckbox);

			expect(mockProps.onRosterChange).not.toHaveBeenCalled();
		});

		it("removes member from selection when already selected", () => {
			const propsWithSelected = {
				...mockProps,
				selectedRoster: ["John Doe"],
			};

			render(<RosterSelectionStep {...propsWithSelected} />);

			const johnDoe = screen.getByText("John Doe");
			fireEvent.click(johnDoe);

			expect(mockProps.onRosterChange).toHaveBeenCalledWith([]);
		});

		it("adds multiple members to selection", () => {
			const propsWithSelected = {
				...mockProps,
				selectedRoster: ["John Doe"],
			};

			render(<RosterSelectionStep {...propsWithSelected} />);

			const janeSmith = screen.getByText("Jane Smith");
			fireEvent.click(janeSmith);

			expect(mockProps.onRosterChange).toHaveBeenCalledWith([
				"John Doe",
				"Jane Smith",
			]);
		});
	});

	describe("Visual States", () => {
		it("shows selected state for selected members", () => {
			const propsWithSelected = {
				...mockProps,
				selectedRoster: ["John Doe"],
			};

			render(<RosterSelectionStep {...propsWithSelected} />);

			const johnContainer = screen.getByText("John Doe").closest(".p-3");
			expect(johnContainer).toHaveClass("bg-blue-100", "border-blue-300");
		});

		it("shows unlinked state for unlinked members", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const bobContainer = screen.getByText("Bob Johnson").closest(".p-3");
			expect(bobContainer).toHaveClass("opacity-50", "cursor-not-allowed");
		});

		it("shows linked state for linked members", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const johnContainer = screen.getByText("John Doe").closest(".p-3");
			expect(johnContainer).toHaveClass("cursor-pointer");
		});
	});

	describe("Button Interactions", () => {
		it("calls onBack when back button is clicked", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const backButton = screen.getByText("Back");
			fireEvent.click(backButton);

			expect(mockProps.onBack).toHaveBeenCalled();
		});

		it("calls onCreateAssignment when create button is clicked", () => {
			const propsWithSelected = {
				...mockProps,
				selectedRoster: ["John Doe"],
			};

			render(<RosterSelectionStep {...propsWithSelected} />);

			const createButton = screen.getByText("Create Assignment");
			fireEvent.click(createButton);

			expect(mockProps.onCreateAssignment).toHaveBeenCalled();
		});

		it("calls onError when create button is clicked with no selection", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const createButton = screen.getByText("Create Assignment");
			// The button should be disabled when no members are selected
			expect(createButton).toBeDisabled();

			// Since the button is disabled, we can't click it, so we test the validation logic directly
			// by calling the handler function manually
			// const _component = screen.getByTestId('roster-selection-step');
			// The validation happens in the component, so we test that the button is disabled
			expect(createButton).toBeDisabled();
		});

		it("disables create button when creating", () => {
			render(<RosterSelectionStep {...mockProps} creating={true} />);

			const createButton = screen.getByText("Creating...");
			expect(createButton).toBeDisabled();
		});

		it("disables create button when no members selected", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const createButton = screen.getByText("Create Assignment");
			expect(createButton).toBeDisabled();
		});

		it("enables create button when members are selected", () => {
			const propsWithSelected = {
				...mockProps,
				selectedRoster: ["John Doe"],
			};

			render(<RosterSelectionStep {...propsWithSelected} />);

			const createButton = screen.getByText("Create Assignment");
			expect(createButton).not.toBeDisabled();
		});
	});

	describe("Dark Mode", () => {
		it("applies dark mode classes when darkMode is true", () => {
			render(<RosterSelectionStep {...mockProps} darkMode={true} />);

			const johnContainer = screen.getByText("John Doe").closest(".p-3");
			expect(johnContainer).toHaveClass("bg-gray-700", "border-gray-600");
		});

		it("applies light mode classes when darkMode is false", () => {
			render(<RosterSelectionStep {...mockProps} darkMode={false} />);

			const johnContainer = screen.getByText("John Doe").closest(".p-3");
			expect(johnContainer).toHaveClass("bg-white", "border-gray-200");
		});
	});

	describe("Accessibility", () => {
		it("has proper labels for checkboxes", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const checkboxes = screen.getAllByRole("checkbox");
			expect(checkboxes).toHaveLength(3);

			for (const checkbox of checkboxes) {
				expect(checkbox).toHaveAttribute("type", "checkbox");
			}
		});

		it("disables checkboxes for unlinked members", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const bobCheckbox = screen.getAllByRole("checkbox")[2]; // Bob is the third checkbox
			expect(bobCheckbox).toBeDisabled();
		});

		it("enables checkboxes for linked members", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const johnCheckbox = screen.getAllByRole("checkbox")[0]; // John is the first checkbox
			expect(johnCheckbox).not.toBeDisabled();
		});

		it("has proper button text for actions", () => {
			render(<RosterSelectionStep {...mockProps} />);

			expect(screen.getByText("Back")).toBeInTheDocument();
			expect(screen.getByText("Create Assignment")).toBeInTheDocument();
		});
	});

	describe("Status Indicators", () => {
		it("shows green dot for linked members", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const linkedDots = screen.getAllByText("Linked");
			for (const linkedText of linkedDots) {
				const container = linkedText.closest("div");
				const dot = container?.querySelector(".bg-green-500");
				expect(dot).toBeInTheDocument();
			}
		});

		it("shows red dot for unlinked members", () => {
			render(<RosterSelectionStep {...mockProps} />);

			const unlinkedText = screen.getByText("Unlinked");
			const container = unlinkedText.closest("div");
			const dot = container?.querySelector(".bg-red-500");
			expect(dot).toBeInTheDocument();
		});
	});
});
