import type { Event } from "@/app/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventList from "./EventList";

// Mock the theme context
vi.mock("@/app/contexts/themeContext", () => ({
  useTheme: () => ({ darkMode: false }),
}));

const LOADING_REGEX = /loading/i;
const SORT_REGEX = /sort/i;
const ALL_REGEX = /all/i;
const AVAILABLE_EVENTS_REGEX = /available events/i;

const mockEvents: Event[] = [
  {
    id: 1,
    name: "Anatomy & Physiology",
    slug: "anatomy-physiology",
    subject: "Life Science",
    division: "C",
    currentYear: true,
  },
  {
    id: 2,
    name: "Astronomy",
    slug: "astronomy",
    subject: "Earth & Space",
    division: "C",
    currentYear: true,
  },
  {
    id: 3,
    name: "Chemistry Lab",
    slug: "chemistry-lab",
    subject: "Physical Science",
    division: "C",
    currentYear: true,
  },
];

describe("EventList", () => {
  const mockOnEventSelect = vi.fn();
  const mockOnSortChange = vi.fn();
  const mockOnViewModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all events", () => {
    render(
      <EventList
        events={mockEvents}
        selectedEvent={null}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={null}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    expect(screen.getByText("Anatomy & Physiology")).toBeInTheDocument();
    expect(screen.getByText("Astronomy")).toBeInTheDocument();
    expect(screen.getByText("Chemistry Lab")).toBeInTheDocument();
  });

  it("displays loading state", () => {
    render(
      <EventList
        events={[]}
        selectedEvent={null}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={true}
        error={null}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    expect(screen.getByText(LOADING_REGEX)).toBeInTheDocument();
  });

  it("displays error state", () => {
    const errorMessage = "Failed to load events";
    render(
      <EventList
        events={[]}
        selectedEvent={null}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={errorMessage}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("calls onEventSelect when an event is clicked", () => {
    render(
      <EventList
        events={mockEvents}
        selectedEvent={null}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={null}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const astronomyElement = screen.getByText("Astronomy").closest("li");
    if (astronomyElement) {
      fireEvent.click(astronomyElement);
    }
    expect(mockOnEventSelect).toHaveBeenCalledWith(2);
  });

  it("sorts events alphabetically", () => {
    const { container } = render(
      <EventList
        events={mockEvents}
        selectedEvent={null}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={null}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const eventNames = Array.from(container.querySelectorAll('[id^="event-"]')).map(
      (el) => el.textContent
    );

    // Should be in alphabetical order
    expect(eventNames[0]).toContain("Anatomy");
    expect(eventNames[1]).toContain("Astronomy");
    expect(eventNames[2]).toContain("Chemistry");
  });

  it("sorts events by subject", () => {
    render(
      <EventList
        events={mockEvents}
        selectedEvent={null}
        sortOption="subject"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={null}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const sortSelect = screen.getByLabelText(SORT_REGEX);
    expect(sortSelect).toHaveValue("subject");
  });

  it("changes sort option when dropdown is changed", () => {
    render(
      <EventList
        events={mockEvents}
        selectedEvent={null}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={null}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const sortSelect = screen.getByLabelText(SORT_REGEX);
    fireEvent.change(sortSelect, { target: { value: "subject" } });

    expect(mockOnSortChange).toHaveBeenCalledWith("subject");
  });

  it("highlights selected event", () => {
    render(
      <EventList
        events={mockEvents}
        selectedEvent={2}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={null}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const astronomyItem = screen.getByText("Astronomy").closest("li");
    expect(astronomyItem).toHaveClass("bg-blue-50", "border-l-4", "border-blue-500");
  });

  it("toggles view mode between current and all", () => {
    render(
      <EventList
        events={mockEvents}
        selectedEvent={null}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={null}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const allButton = screen.getByTitle(ALL_REGEX);
    fireEvent.click(allButton);

    expect(mockOnViewModeChange).toHaveBeenCalledWith("all");
  });

  it("shows offline indicator when offline", () => {
    render(
      <EventList
        events={mockEvents}
        selectedEvent={null}
        sortOption="alphabetical"
        onEventSelect={mockOnEventSelect}
        onSortChange={mockOnSortChange}
        loading={false}
        error={null}
        isOffline={true}
        downloadedSlugs={new Set(["astronomy"])}
        viewMode="current"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    // Should show download indicators for offline mode
    expect(screen.getByText(AVAILABLE_EVENTS_REGEX)).toBeInTheDocument();
  });
});
