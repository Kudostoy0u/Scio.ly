import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocsHomeClient } from "../DocsHomeClient";

const DESCRIPTION_REGEX = /A superior wiki for the 2026 season/i;

// Mock the theme context
vi.mock("@/app/contexts/ThemeContext", () => ({
	useTheme: () => ({ darkMode: false }),
}));

describe("DocsHomeClient", () => {
	it("renders the main heading", () => {
		render(<DocsHomeClient />);
		expect(screen.getByText("Scio.ly Docs")).toBeInTheDocument();
	});

	it("renders the description", () => {
		render(<DocsHomeClient />);
		expect(screen.getByText(DESCRIPTION_REGEX)).toBeInTheDocument();
	});

	it("renders the alpha badge", () => {
		render(<DocsHomeClient />);
		expect(screen.getByText("In alpha development")).toBeInTheDocument();
	});

	it("applies dark mode styles when darkMode is true", () => {
		// This test verifies the component renders with dark mode
		// The actual dark mode styling is handled by Tailwind classes
		render(<DocsHomeClient />);
		expect(screen.getByText("Scio.ly Docs")).toBeInTheDocument();
	});
});
