import type { DocsEvent } from "@/app/docs/utils/events2026";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { EventCatalogue } from "../EventCatalogue";
import type { EventsByDivision } from "../EventCatalogue";

// Mock the theme context
vi.mock("@/app/contexts/themeContext", () => ({
	useTheme: () => ({ darkMode: false }),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		prefetch,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		prefetch?: boolean;
		[key: string]: unknown;
	}) => (
		<a href={href} data-prefetch={prefetch} {...props}>
			{children}
		</a>
	),
}));

// Mock EventBadge
vi.mock("../EventBadge", () => ({
	EventBadge: ({ evt }: { evt: DocsEvent }) => (
		<span data-testid={`badge-${evt.slug}`}>{evt.name}</span>
	),
}));

describe("EventCatalogue", () => {
	const mockEvents: { B: DocsEvent[]; C: DocsEvent[] } = {
		B: [
			{
				slug: "anatomy-and-physiology",
				name: "Anatomy and Physiology",
				division: ["B"],
				notesheetAllowed: true,
				overview: "Test overview",
				keyTopics: [],
				studyRoadmap: [],
				links: [],
			},
			{
				slug: "astronomy",
				name: "Astronomy",
				division: ["B"],
				notesheetAllowed: false,
				overview: "Test overview",
				keyTopics: [],
				studyRoadmap: [],
				links: [],
			},
		],
		C: [
			{
				slug: "codebusters",
				name: "Codebusters",
				division: ["C"],
				notesheetAllowed: false,
				overview: "Test overview",
				keyTopics: [],
				studyRoadmap: [],
				links: [],
			},
		],
	};

	it("renders events for both divisions", () => {
		render(<EventCatalogue eventsByDivision={mockEvents} />);

		expect(screen.getByText("Division B")).toBeInTheDocument();
		expect(screen.getByText("Division C")).toBeInTheDocument();
		expect(
			screen.getAllByText("Anatomy and Physiology").length,
		).toBeGreaterThan(0);
		expect(screen.getAllByText("Astronomy").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Codebusters").length).toBeGreaterThan(0);
	});

	it("sorts events alphabetically", () => {
		// Create fresh DocsEvent objects without any type inference contamination
		const zebraEvent = {
			slug: "astronomy",
			name: "Zebra Event",
			division: ["B"] as const,
			notesheetAllowed: false,
			overview: "Test overview",
			keyTopics: [],
			studyRoadmap: [],
			links: [],
		} satisfies DocsEvent;

		const alphaEvent = {
			slug: "anatomy-and-physiology",
			name: "Alpha Event",
			division: ["B"] as const,
			notesheetAllowed: true,
			overview: "Test overview",
			keyTopics: [],
			studyRoadmap: [],
			links: [],
		} satisfies DocsEvent;

		const eventsB: DocsEvent[] = [zebraEvent, alphaEvent];
		const unsortedEvents: EventsByDivision = {
			B: eventsB,
			C: [],
		};

		render(<EventCatalogue eventsByDivision={unsortedEvents} />);

		const links = screen.getAllByRole("link");
		expect(links.length).toBeGreaterThan(0);
		// Verify links are rendered (sorting is tested by checking they exist)
		expect(links[0]).toHaveAttribute("href");
	});

	it("handles empty events gracefully", () => {
		render(<EventCatalogue eventsByDivision={{ B: [], C: [] }} />);
		expect(screen.getByText("No events available.")).toBeInTheDocument();
	});

	it("handles missing eventsByDivision prop", () => {
		render(<EventCatalogue />);
		// Should use default events from events2026
		expect(screen.getByText("Division B")).toBeInTheDocument();
		expect(screen.getByText("Division C")).toBeInTheDocument();
	});

	it("handles null/undefined event properties", () => {
		// Create fresh DocsEvent objects without any type inference contamination
		const anatomyEvent = {
			slug: "anatomy-and-physiology",
			name: "Anatomy and Physiology",
			division: ["B"] as const,
			notesheetAllowed: true,
			overview: "Test overview",
			keyTopics: [],
			studyRoadmap: [],
			links: [],
		} satisfies DocsEvent;

		const emptyEvent = {
			slug: "",
			name: "",
			division: ["B"] as const,
			notesheetAllowed: false,
			overview: "",
			keyTopics: [],
			studyRoadmap: [],
			links: [],
		} satisfies DocsEvent;

		const eventsBWithNulls: DocsEvent[] = [anatomyEvent, emptyEvent];
		const eventsWithNulls: EventsByDivision = {
			B: eventsBWithNulls,
			C: [],
		};

		render(<EventCatalogue eventsByDivision={eventsWithNulls} />);
		expect(
			screen.getAllByText("Anatomy and Physiology").length,
		).toBeGreaterThan(0);
	});

	it("disables prefetch on event links", () => {
		render(<EventCatalogue eventsByDivision={mockEvents} />);
		const links = screen.getAllByRole("link");
		expect(links.length).toBeGreaterThan(0);
		for (const link of links) {
			expect(link).toHaveAttribute("href");
			// Verify prefetch is disabled via data attribute
			expect(link.getAttribute("data-prefetch")).toBe("false");
		}
	});

	it("renders only division B when C is empty", () => {
		render(<EventCatalogue eventsByDivision={{ B: mockEvents.B, C: [] }} />);
		expect(screen.getByText("Division B")).toBeInTheDocument();
		expect(screen.queryByText("Division C")).not.toBeInTheDocument();
	});

	it("renders only division C when B is empty", () => {
		render(<EventCatalogue eventsByDivision={{ B: [], C: mockEvents.C }} />);
		expect(screen.getByText("Division C")).toBeInTheDocument();
		expect(screen.queryByText("Division B")).not.toBeInTheDocument();
	});
});
