import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EventModal from "@/app/teams/components/calendar/EventModal";
import type { EventForm, UserTeam } from "@/app/teams/components/calendar/calendarUtils";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  X: () => <div data-testid="x-icon" />,
}));

describe("EventModal", () => {
  const mockUserTeams: UserTeam[] = [
    {
      id: "team1",
      name: "Test Team 1",
      slug: "test-team-1",
      school: "Test School",
      user_role: "captain",
    },
    {
      id: "team2",
      name: "Test Team 2",
      slug: "test-team-2",
      school: "Test School",
      user_role: "co_captain",
    },
  ];

  const defaultEventForm: EventForm = {
    title: "",
    description: "",
    date: "2023-12-15",
    start_time: "10:00",
    end_time: "11:00",
    location: "",
    event_type: "practice",
    meeting_type: "personal",
    selected_team_id: "",
  };

  const defaultProps = {
    darkMode: false,
    showModal: true,
    selectedEvent: null,
    eventForm: defaultEventForm,
    userTeams: mockUserTeams,
    onClose: vi.fn(),
    onFormChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders modal when showModal is true", () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByText("Create Event")).toBeInTheDocument();
      expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date/)).toBeInTheDocument();
    });

    it("does not render modal when showModal is false", () => {
      render(<EventModal {...defaultProps} showModal={false} />);

      expect(screen.queryByText("Create Event")).not.toBeInTheDocument();
    });

    it("renders edit mode when selectedEvent is provided", () => {
      const selectedEvent = {
        id: "1",
        title: "Existing Event",
        description: "Existing Description",
        date: "2023-12-15",
        start_time: "2023-12-15T10:00:00Z",
        end_time: "2023-12-15T11:00:00Z",
        location: "Existing Location",
        event_type: "tournament",
        meeting_type: "team",
        team_id: "team1",
        created_by: "user1",
        created_at: "2023-12-01T00:00:00Z",
        updated_at: "2023-12-01T00:00:00Z",
      };

      render(<EventModal {...defaultProps} selectedEvent={selectedEvent} />);

      expect(screen.getByText("Edit Event")).toBeInTheDocument();
    });
  });

  describe("Form Fields", () => {
    it("renders all required form fields", () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
      expect(screen.getByLabelText(/Date/)).toBeInTheDocument();
      expect(screen.getByLabelText("Start Time")).toBeInTheDocument();
      expect(screen.getByLabelText("End Time")).toBeInTheDocument();
      expect(screen.getByLabelText("Location")).toBeInTheDocument();
    });

    it("renders event type selector", () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByLabelText("Event Type")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Practice")).toBeInTheDocument();
    });

    it("renders meeting type selector", () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByLabelText("Meeting Type")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Personal")).toBeInTheDocument();
    });
  });

  describe("Team Selection", () => {
    it("shows team selector when meeting type is team", () => {
      const teamForm = { ...defaultEventForm, meeting_type: "team" as const };
      render(<EventModal {...defaultProps} eventForm={teamForm} />);

      expect(screen.getByLabelText("Meeting Type")).toBeInTheDocument();
    });

    it("does not show team selector when meeting type is personal", () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.queryByLabelText("Team")).not.toBeInTheDocument();
    });

    it("displays available teams in selector", () => {
      const teamForm = { ...defaultEventForm, meeting_type: "team" as const };
      render(<EventModal {...defaultProps} eventForm={teamForm} />);

      expect(screen.getByText("Test School - Test Team 1")).toBeInTheDocument();
      expect(screen.getByText("Test School - Test Team 2")).toBeInTheDocument();
    });
  });

  describe("Form Interactions", () => {
    it("calls onFormChange when form fields are updated", () => {
      render(<EventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText(/Title/);
      fireEvent.change(titleInput, { target: { value: "New Title" } });

      expect(defaultProps.onFormChange).toHaveBeenCalledWith({ title: "New Title" });
    });

    it("calls onFormChange when event type is changed", () => {
      render(<EventModal {...defaultProps} />);

      const eventTypeSelect = screen.getByLabelText("Event Type");
      fireEvent.change(eventTypeSelect, { target: { value: "tournament" } });

      expect(defaultProps.onFormChange).toHaveBeenCalledWith({ event_type: "tournament" });
    });

    it("calls onFormChange when meeting type is changed", () => {
      render(<EventModal {...defaultProps} />);

      const meetingTypeSelect = screen.getByLabelText("Meeting Type");
      fireEvent.change(meetingTypeSelect, { target: { value: "team" } });

      expect(defaultProps.onFormChange).toHaveBeenCalledWith({
        meeting_type: "team",
        selected_team_id: "",
      });
    });
  });

  describe("Modal Actions", () => {
    it("calls onClose when cancel button is clicked", () => {
      render(<EventModal {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when X button is clicked", () => {
      render(<EventModal {...defaultProps} />);

      const closeButton = screen.getByTestId("x-icon").closest("button");
      fireEvent.click(closeButton!);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onSubmit when create button is clicked", () => {
      render(<EventModal {...defaultProps} />);

      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    });

    it("shows update button when editing existing event", () => {
      const selectedEvent = {
        id: "1",
        title: "Existing Event",
        description: "Existing Description",
        date: "2023-12-15",
        start_time: "2023-12-15T10:00:00Z",
        end_time: "2023-12-15T11:00:00Z",
        location: "Existing Location",
        event_type: "tournament",
        meeting_type: "team",
        team_id: "team1",
        created_by: "user1",
        created_at: "2023-12-01T00:00:00Z",
        updated_at: "2023-12-01T00:00:00Z",
      };

      render(<EventModal {...defaultProps} selectedEvent={selectedEvent} />);

      expect(screen.getByText("Update")).toBeInTheDocument();
    });
  });

  describe("Dark Mode", () => {
    it("applies dark mode classes when darkMode is true", () => {
      render(<EventModal {...defaultProps} darkMode={true} />);

      const modal = screen.getByText("Create Event").closest(".max-w-md");
      expect(modal).toHaveClass("bg-gray-800");
    });

    it("applies light mode classes when darkMode is false", () => {
      render(<EventModal {...defaultProps} darkMode={false} />);

      const modal = screen.getByText("Create Event").closest(".max-w-md");
      expect(modal).toHaveClass("bg-white");
    });
  });
});
