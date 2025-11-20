import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarHeader from "@/app/teams/components/calendar/CalendarHeader";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Plus: () => <div data-testid="plus-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Repeat: () => <div data-testid="repeat-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
}));

describe("CalendarHeader", () => {
  const defaultProps = {
    darkMode: false,
    currentDate: new Date(2023, 11, 1), // December 1, 2023
    showListView: false,
    eventTypeFilter: "all",
    isCaptain: true,
    onPreviousMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onToggleView: vi.fn(),
    onEventTypeFilterChange: vi.fn(),
    onAddEvent: vi.fn(),
    onAddRecurring: vi.fn(),
    onShowSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders calendar title", () => {
      render(<CalendarHeader {...defaultProps} />);
      expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
    });

    it("renders current month and year", () => {
      render(<CalendarHeader {...defaultProps} />);
      expect(screen.getByText("December 2023")).toBeInTheDocument();
    });

    it("renders navigation buttons", () => {
      render(<CalendarHeader {...defaultProps} />);
      expect(screen.getByTestId("chevron-left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("chevron-right-icon")).toBeInTheDocument();
    });

    it("renders view toggle buttons", () => {
      render(<CalendarHeader {...defaultProps} />);
      expect(screen.getByText("Calendar")).toBeInTheDocument();
      expect(screen.getByText("List")).toBeInTheDocument();
    });

    it("renders action buttons for captains", () => {
      render(<CalendarHeader {...defaultProps} />);
      expect(screen.getByText("Add Event")).toBeInTheDocument();
      expect(screen.getByText("Recurring")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("does not render recurring button for non-captains", () => {
      render(<CalendarHeader {...defaultProps} isCaptain={false} />);
      expect(screen.queryByText("Recurring")).not.toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("calls onPreviousMonth when previous button is clicked", () => {
      render(<CalendarHeader {...defaultProps} />);
      const prevButton = screen.getByTestId("chevron-left-icon").closest("button");
      fireEvent.click(prevButton!);
      expect(defaultProps.onPreviousMonth).toHaveBeenCalledTimes(1);
    });

    it("calls onNextMonth when next button is clicked", () => {
      render(<CalendarHeader {...defaultProps} />);
      const nextButton = screen.getByTestId("chevron-right-icon").closest("button");
      fireEvent.click(nextButton!);
      expect(defaultProps.onNextMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe("View Toggle", () => {
    it("calls onToggleView when List button is clicked", () => {
      render(<CalendarHeader {...defaultProps} />);
      const listButton = screen.getByText("List");
      fireEvent.click(listButton);
      expect(defaultProps.onToggleView).toHaveBeenCalledWith(true);
    });

    it("calls onToggleView when Calendar button is clicked", () => {
      render(<CalendarHeader {...defaultProps} showListView={true} />);
      const calendarButton = screen.getByText("Calendar");
      fireEvent.click(calendarButton);
      expect(defaultProps.onToggleView).toHaveBeenCalledWith(false);
    });
  });

  describe("Action Buttons", () => {
    it("calls onAddEvent when Add Event button is clicked", () => {
      render(<CalendarHeader {...defaultProps} />);
      const addEventButton = screen.getByText("Add Event");
      fireEvent.click(addEventButton);
      expect(defaultProps.onAddEvent).toHaveBeenCalledTimes(1);
    });

    it("calls onAddRecurring when Recurring button is clicked", () => {
      render(<CalendarHeader {...defaultProps} />);
      const recurringButton = screen.getByText("Recurring");
      fireEvent.click(recurringButton);
      expect(defaultProps.onAddRecurring).toHaveBeenCalledTimes(1);
    });

    it("calls onShowSettings when Settings button is clicked", () => {
      render(<CalendarHeader {...defaultProps} />);
      const settingsButton = screen.getByText("Settings");
      fireEvent.click(settingsButton);
      expect(defaultProps.onShowSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe("Dark Mode", () => {
    it("applies dark mode classes when darkMode is true", () => {
      render(<CalendarHeader {...defaultProps} darkMode={true} />);
      const title = screen.getByText("Upcoming Events");
      expect(title).toHaveClass("text-white");
    });

    it("applies light mode classes when darkMode is false", () => {
      render(<CalendarHeader {...defaultProps} darkMode={false} />);
      const title = screen.getByText("Upcoming Events");
      expect(title).toHaveClass("text-gray-900");
    });
  });
});
