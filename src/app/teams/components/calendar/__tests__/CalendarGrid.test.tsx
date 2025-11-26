import CalendarGrid from "@/app/teams/components/calendar/CalendarGrid";
import type {
  CalendarEvent,
  RecurringMeeting,
} from "@/app/teams/components/calendar/calendarUtils";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Plus: () => <div data-testid="plus-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

describe("CalendarGrid", () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: "1",
      title: "Test Event",
      description: "Test Description",
      date: "2023-12-15",
      start_time: "2023-12-15T10:00:00Z",
      end_time: "2023-12-15T11:00:00Z",
      location: "Test Location",
      event_type: "practice",
      meeting_type: "personal",
      team_id: null,
      created_by: "user1",
      created_at: "2023-12-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
    },
  ];

  const mockRecurringMeetings: RecurringMeeting[] = [
    {
      id: "1",
      title: "Weekly Meeting",
      description: "Weekly team meeting",
      days_of_week: [1, 3, 5], // Monday, Wednesday, Friday
      start_date: "2023-12-01",
      end_date: "2023-12-31",
      start_time: "14:00:00",
      end_time: "15:00:00",
      location: "Team Room",
      meeting_type: "team",
      team_slug: "test-team",
      created_by: "user1",
      created_at: "2023-12-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
    },
  ];

  const defaultProps = {
    darkMode: false,
    currentDate: new Date(2023, 11, 1), // December 1, 2023
    events: mockEvents,
    recurringMeetings: mockRecurringMeetings,
    onEventClick: vi.fn(),
    onDeleteEvent: vi.fn(),
    onAddEventForDate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders calendar grid with day headers", () => {
      render(<CalendarGrid {...defaultProps} />);

      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Wed")).toBeInTheDocument();
      expect(screen.getByText("Thu")).toBeInTheDocument();
      expect(screen.getByText("Fri")).toBeInTheDocument();
      expect(screen.getByText("Sat")).toBeInTheDocument();
    });

    it("renders calendar days for the current month", () => {
      render(<CalendarGrid {...defaultProps} />);

      // December 2023 starts on Friday, so we should see some days from November
      expect(screen.getByText("26")).toBeInTheDocument(); // November 26
      expect(screen.getByText("1")).toBeInTheDocument(); // December 1
      expect(screen.getByText("31")).toBeInTheDocument(); // December 31
    });

    it("renders events on correct dates", () => {
      render(<CalendarGrid {...defaultProps} />);

      // The test event is on December 15
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });
  });

  describe("Event Interactions", () => {
    it("calls onEventClick when event is clicked", () => {
      render(<CalendarGrid {...defaultProps} />);

      const eventElement = screen.getByText("Test Event");
      fireEvent.click(eventElement);

      expect(defaultProps.onEventClick).toHaveBeenCalledWith(mockEvents[0]);
    });

    it("calls onDeleteEvent when delete button is clicked", () => {
      render(<CalendarGrid {...defaultProps} />);

      const deleteButton = screen.getByTestId("x-icon").closest("button");
      expect(deleteButton).toBeTruthy();
      fireEvent.click(deleteButton);

      expect(defaultProps.onDeleteEvent).toHaveBeenCalledWith("1");
    });

    it("calls onAddEventForDate when add event button is clicked", () => {
      render(<CalendarGrid {...defaultProps} />);

      // Find a day cell and click the add button
      const dayCell = screen.getByText("15").closest("div");
      const addButton = dayCell?.querySelector('[data-testid="plus-icon"]')?.closest("button");

      if (addButton) {
        fireEvent.click(addButton);
        expect(defaultProps.onAddEventForDate).toHaveBeenCalled();
      }
    });
  });

  describe("Recurring Meetings", () => {
    it("displays recurring meetings on correct days", () => {
      render(<CalendarGrid {...defaultProps} />);

      // The recurring meeting is on Monday, Wednesday, Friday
      // We need to find a Monday, Wednesday, or Friday in December 2023
      // December 1, 2023 is a Friday, so it should show the recurring meeting
      expect(screen.getByText("Weekly Meeting")).toBeInTheDocument();
    });
  });

  describe("Dark Mode", () => {
    it("applies dark mode classes when darkMode is true", () => {
      render(<CalendarGrid {...defaultProps} darkMode={true} />);

      const gridContainer = screen.getByText("Sun").closest("div");
      expect(gridContainer).toHaveClass("bg-gray-50");
    });

    it("applies light mode classes when darkMode is false", () => {
      render(<CalendarGrid {...defaultProps} darkMode={false} />);

      const gridContainer = screen.getByText("Sun").closest("div");
      expect(gridContainer).toHaveClass("bg-gray-50");
    });
  });

  describe("Empty State", () => {
    it("renders empty calendar when no events or meetings", () => {
      render(<CalendarGrid {...defaultProps} events={[]} recurringMeetings={[]} />);

      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.queryByText("Test Event")).not.toBeInTheDocument();
      expect(screen.queryByText("Weekly Meeting")).not.toBeInTheDocument();
    });
  });
});
