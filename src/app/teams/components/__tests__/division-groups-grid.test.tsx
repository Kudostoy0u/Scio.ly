import DivisionGroupsGrid, {
	DIVISION_B_GROUPS,
	DIVISION_C_GROUPS,
	getGroupColors,
} from "@/app/teams/components/DivisionGroupsGrid";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

describe("DivisionGroupsGrid", () => {
	const defaultProps = {
		darkMode: false,
		division: "B" as const,
		teams: [
			{
				id: "team-1",
				name: "Test Team",
				roster: {
					Codebusters: ["Alice", "Bob"],
					"Disease Detectives": ["Charlie"],
					"Remote Sensing": ["Diana"],
				},
			},
		],
		activeTeamIdx: 0,
		isLeader: true,
		setName: vi.fn(),
		getGroupColors: (colorKey: string) => getGroupColors(false, colorKey),
		groups: DIVISION_B_GROUPS,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render division B groups correctly", () => {
		render(<DivisionGroupsGrid {...defaultProps} />);

		expect(screen.getByText("Conflict Block 1")).toBeInTheDocument();
		expect(screen.getByText("Codebusters")).toBeInTheDocument();
		expect(screen.getByText("Disease Detectives")).toBeInTheDocument();
		expect(screen.getByText("Remote Sensing")).toBeInTheDocument();
	});

	it("should render division C groups correctly", () => {
		render(
			<DivisionGroupsGrid
				{...defaultProps}
				division="C"
				groups={DIVISION_C_GROUPS}
			/>,
		);

		expect(screen.getByText("Conflict Block 1")).toBeInTheDocument();
		expect(screen.getByText("Anatomy & Physiology")).toBeInTheDocument();
		expect(screen.getByText("Engineering CAD")).toBeInTheDocument();
		expect(screen.getByText("Forensics")).toBeInTheDocument();
	});

	it("should display student names in input fields", () => {
		render(<DivisionGroupsGrid {...defaultProps} />);

		const codebustersInputs = screen.getAllByDisplayValue("Alice");
		expect(codebustersInputs).toHaveLength(1);

		const diseaseInputs = screen.getAllByDisplayValue("Charlie");
		expect(diseaseInputs).toHaveLength(1);
	});

	it("should call setName when input value changes", () => {
		render(<DivisionGroupsGrid {...defaultProps} />);

		const input = screen.getByDisplayValue("Alice");
		fireEvent.change(input, { target: { value: "Alice Updated" } });

		expect(defaultProps.setName).toHaveBeenCalledWith(
			"B",
			"Codebusters",
			0,
			"Alice Updated",
		);
	});

	it("should disable inputs when not a leader", () => {
		render(<DivisionGroupsGrid {...defaultProps} isLeader={false} />);

		const inputs = screen.getAllByRole("textbox");
		for (const input of inputs) {
			expect(input).toBeDisabled();
		}
	});

	it("should enable inputs when is a leader", () => {
		render(<DivisionGroupsGrid {...defaultProps} isLeader={true} />);

		const inputs = screen.getAllByRole("textbox");
		for (const input of inputs) {
			expect(input).not.toBeDisabled();
		}
	});

	it("should show correct slot counts for different events", () => {
		render(<DivisionGroupsGrid {...defaultProps} />);

		// Codebusters should have 3 slots (2 filled out of 3)
		const codebustersSlots = screen.getAllByText("2/3");
		expect(codebustersSlots.length).toBeGreaterThan(0);

		// Disease Detectives should have 2 slots (1 filled out of 2)
		const diseaseSlots = screen.getAllByText("1/2");
		expect(diseaseSlots.length).toBeGreaterThan(0);
	});

	it("should handle empty roster correctly", () => {
		const emptyTeams = [
			{
				id: "team-1",
				name: "Test Team",
				roster: {},
			},
		];

		render(<DivisionGroupsGrid {...defaultProps} teams={emptyTeams} />);

		const inputs = screen.getAllByPlaceholderText("Name");
		// Division B has 7 groups with many events, each with 2-3 slots
		expect(inputs.length).toBeGreaterThan(0);
	});

	it("should apply correct colors for different groups", () => {
		render(<DivisionGroupsGrid {...defaultProps} />);

		const group1 = screen.getByText("Conflict Block 1").closest("div");
		expect(group1).toHaveClass("bg-blue-50/80", "border-blue-400/80");
	});

	it("should handle dark mode correctly", () => {
		const darkModeProps = {
			...defaultProps,
			darkMode: true,
			getGroupColors: (colorKey: string) => getGroupColors(true, colorKey),
		};

		render(<DivisionGroupsGrid {...darkModeProps} />);

		const group1 = screen.getByText("Conflict Block 1").closest("div");
		expect(group1).toHaveClass("bg-blue-950/30", "border-blue-500/60");
	});

	it("should render last group spanning full width", () => {
		render(<DivisionGroupsGrid {...defaultProps} />);

		const lastGroup = screen.getByText("Conflict Block 7").closest("div");
		expect(lastGroup).toHaveClass("lg:col-span-2");
	});

	it("should show correct event names for division B", () => {
		render(<DivisionGroupsGrid {...defaultProps} />);

		expect(screen.getByText("Codebusters")).toBeInTheDocument();
		expect(screen.getByText("Disease Detectives")).toBeInTheDocument();
		expect(screen.getByText("Remote Sensing")).toBeInTheDocument();
		expect(screen.getByText("Entomology")).toBeInTheDocument();
		expect(screen.getByText("Experimental Design")).toBeInTheDocument();
		expect(screen.getByText("Solar System")).toBeInTheDocument();
	});

	it("should show correct event names for division C", () => {
		render(
			<DivisionGroupsGrid
				{...defaultProps}
				division="C"
				groups={DIVISION_C_GROUPS}
			/>,
		);

		expect(screen.getByText("Anatomy & Physiology")).toBeInTheDocument();
		expect(screen.getByText("Engineering CAD")).toBeInTheDocument();
		expect(screen.getByText("Forensics")).toBeInTheDocument();
		expect(screen.getByText("Codebusters")).toBeInTheDocument();
		expect(screen.getByText("Disease Detectives")).toBeInTheDocument();
		expect(screen.getByText("Remote Sensing")).toBeInTheDocument();
	});

	it("should handle multiple teams correctly", () => {
		const multipleTeams = [
			{
				id: "team-1",
				name: "Team A",
				roster: {
					Codebusters: ["Alice", "Bob"],
				},
			},
			{
				id: "team-2",
				name: "Team B",
				roster: {
					Codebusters: ["Charlie", "Diana"],
				},
			},
		];

		render(
			<DivisionGroupsGrid
				{...defaultProps}
				teams={multipleTeams}
				activeTeamIdx={1}
			/>,
		);

		expect(screen.getByDisplayValue("Charlie")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Diana")).toBeInTheDocument();
	});

	it("should show placeholder text for empty slots", () => {
		render(<DivisionGroupsGrid {...defaultProps} />);

		const placeholders = screen.getAllByPlaceholderText("Name");
		expect(placeholders.length).toBeGreaterThan(0);
	});

	it("should handle roster updates correctly", () => {
		const updatedTeams = [
			{
				id: "team-1",
				name: "Test Team",
				roster: {
					Codebusters: ["Alice", "Bob", "Charlie"],
					"Disease Detectives": ["Diana", "Eve"],
				},
			},
		];

		render(<DivisionGroupsGrid {...defaultProps} teams={updatedTeams} />);

		expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Bob")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Charlie")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Diana")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Eve")).toBeInTheDocument();
	});
});

describe("getGroupColors", () => {
	it("should return correct colors for blue group", () => {
		const colors = getGroupColors(false, "blue");
		expect(colors).toEqual({
			bg: "bg-blue-50/80",
			border: "border-blue-400/80",
			text: "text-blue-900",
		});
	});

	it("should return correct colors for green group", () => {
		const colors = getGroupColors(false, "green");
		expect(colors).toEqual({
			bg: "bg-green-50/80",
			border: "border-green-400/80",
			text: "text-green-900",
		});
	});

	it("should return correct colors for yellow group", () => {
		const colors = getGroupColors(false, "yellow");
		expect(colors).toEqual({
			bg: "bg-yellow-50/80",
			border: "border-yellow-400/80",
			text: "text-yellow-900",
		});
	});

	it("should return correct colors for purple group", () => {
		const colors = getGroupColors(false, "purple");
		expect(colors).toEqual({
			bg: "bg-purple-50/80",
			border: "border-purple-400/80",
			text: "text-purple-900",
		});
	});

	it("should return correct colors for pink group", () => {
		const colors = getGroupColors(false, "pink");
		expect(colors).toEqual({
			bg: "bg-pink-50/80",
			border: "border-pink-400/80",
			text: "text-pink-900",
		});
	});

	it("should return correct colors for indigo group", () => {
		const colors = getGroupColors(false, "indigo");
		expect(colors).toEqual({
			bg: "bg-indigo-50/80",
			border: "border-indigo-400/80",
			text: "text-indigo-900",
		});
	});

	it("should return correct colors for orange group", () => {
		const colors = getGroupColors(false, "orange");
		expect(colors).toEqual({
			bg: "bg-orange-50/80",
			border: "border-orange-400/80",
			text: "text-orange-900",
		});
	});

	it("should return blue colors for unknown color key", () => {
		const colors = getGroupColors(false, "unknown");
		expect(colors).toEqual({
			bg: "bg-blue-50/80",
			border: "border-blue-400/80",
			text: "text-blue-900",
		});
	});

	it("should return dark mode colors when darkMode is true", () => {
		const colors = getGroupColors(true, "blue");
		expect(colors).toEqual({
			bg: "bg-blue-950/30",
			border: "border-blue-500/60",
			text: "text-blue-100",
		});
	});

	it("should return dark mode colors for all color keys", () => {
		const colorKeys = [
			"blue",
			"green",
			"yellow",
			"purple",
			"pink",
			"indigo",
			"orange",
		];

		for (const colorKey of colorKeys) {
			const colors = getGroupColors(true, colorKey);
			expect(colors.bg).toContain("950/30");
			expect(colors.border).toContain("500/60");
			expect(colors.text).toContain("100");
		}
	});
});

describe("DIVISION_B_GROUPS", () => {
	it("should have correct structure", () => {
		expect(DIVISION_B_GROUPS).toHaveLength(7);
		expect(DIVISION_B_GROUPS[0]).toHaveProperty("label", "Conflict Block 1");
		expect(DIVISION_B_GROUPS[0]).toHaveProperty("events");
		expect(DIVISION_B_GROUPS[0]).toHaveProperty("colorKey", "blue");
	});

	it("should have correct events for each group", () => {
		expect(DIVISION_B_GROUPS[0].events).toEqual([
			"Codebusters",
			"Disease Detectives",
			"Remote Sensing",
		]);
		expect(DIVISION_B_GROUPS[1].events).toEqual([
			"Entomology",
			"Experimental Design",
			"Solar System",
		]);
		expect(DIVISION_B_GROUPS[6].events).toEqual([
			"Boomilever",
			"Helicopter",
			"Hovercraft",
			"Mission Possible",
			"Scrambler",
		]);
	});

	it("should have unique color keys", () => {
		const colorKeys = DIVISION_B_GROUPS.map((group) => group.colorKey);
		const uniqueColorKeys = [...new Set(colorKeys)];
		expect(uniqueColorKeys).toHaveLength(colorKeys.length);
	});
});

describe("DIVISION_C_GROUPS", () => {
	it("should have correct structure", () => {
		expect(DIVISION_C_GROUPS).toHaveLength(7);
		expect(DIVISION_C_GROUPS[0]).toHaveProperty("label", "Conflict Block 1");
		expect(DIVISION_C_GROUPS[0]).toHaveProperty("events");
		expect(DIVISION_C_GROUPS[0]).toHaveProperty("colorKey", "blue");
	});

	it("should have correct events for each group", () => {
		expect(DIVISION_C_GROUPS[0].events).toEqual([
			"Anatomy & Physiology",
			"Engineering CAD",
			"Forensics",
		]);
		expect(DIVISION_C_GROUPS[1].events).toEqual([
			"Codebusters",
			"Disease Detectives",
			"Remote Sensing",
		]);
		expect(DIVISION_C_GROUPS[6].events).toEqual([
			"Boomilever",
			"Bungee Drop",
			"Electric Vehicle",
			"Helicopter",
			"Hovercraft",
			"Robot Tour",
		]);
	});

	it("should have unique color keys", () => {
		const colorKeys = DIVISION_C_GROUPS.map((group) => group.colorKey);
		const uniqueColorKeys = [...new Set(colorKeys)];
		expect(uniqueColorKeys).toHaveLength(colorKeys.length);
	});
});
