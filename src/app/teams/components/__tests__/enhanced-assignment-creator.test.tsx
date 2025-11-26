import EnhancedAssignmentCreator from "@/app/teams/components/EnhancedAssignmentCreator";
import type { AssignmentCreatorProps } from "@/app/teams/components/assignment/assignmentTypes";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAssignment } from "../assignment/assignmentUtils";

// Mock the child components
vi.mock("../assignment/AssignmentDetailsStep", () => ({
  default: ({ onNext, onBack, onError, details, onDetailsChange }: Record<string, unknown>) => (
    <div data-testid="assignment-details-step">
      <button type="button" onClick={onNext}>
        Next: Generate Questions
      </button>
      <button type="button" onClick={onBack}>
        Back
      </button>
      <button type="button" onClick={() => onError("Test error")}>
        Trigger Error
      </button>
      <input
        data-testid="title-input"
        value={details.title}
        onChange={(e) => onDetailsChange({ title: e.target.value })}
      />
    </div>
  ),
}));

vi.mock("../assignment/QuestionGenerationStep", () => ({
  default: ({ onNext, onBack, onGenerateQuestions }: Record<string, unknown>) => (
    <div data-testid="question-generation-step">
      <button type="button" onClick={onNext}>
        Next: Preview Questions
      </button>
      <button type="button" onClick={onBack}>
        Back
      </button>
      <button type="button" onClick={onGenerateQuestions}>
        Generate Questions
      </button>
    </div>
  ),
}));

vi.mock("../assignment/QuestionPreviewStep", () => ({
  default: ({ onNext, onBack }: Record<string, unknown>) => (
    <div data-testid="question-preview-step">
      <button type="button" onClick={onNext}>
        Next: Select Roster
      </button>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}));

vi.mock("../assignment/RosterSelectionStep", () => ({
  default: ({ onBack, onCreateAssignment }: Record<string, unknown>) => (
    <div data-testid="roster-selection-step">
      <button type="button" onClick={onBack}>
        Back
      </button>
      <button type="button" onClick={onCreateAssignment}>
        Create Assignment
      </button>
    </div>
  ),
}));

// Mock the utility functions
const fetchRosterMembers = vi.fn();
const getEventSubtopics = vi.fn(() => ["Subtopic 1", "Subtopic 2"]);
const getEventCapabilitiesForEvent = vi.fn(() => ({
  supportsPictureQuestions: true,
  supportsIdentificationOnly: false,
}));
const generateQuestions = vi.fn();
vi.mock("../assignment/assignmentUtils", () => ({
  getAvailableEvents: vi.fn(() => ["Test Event 1", "Test Event 2"]),
  getEventSubtopics,
  getEventCapabilitiesForEvent,
  generateQuestions,
  fetchRosterMembers,
  createAssignment: vi.fn(),
}));

// Mock react-toastify
const toast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock("react-toastify", () => ({
  toast,
}));

describe("EnhancedAssignmentCreator", () => {
  const mockProps: AssignmentCreatorProps = {
    teamId: "team123",
    subteamId: "subteam456",
    onAssignmentCreated: vi.fn(),
    onCancel: vi.fn(),
    darkMode: false,
    prefillEventName: "Test Event",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders assignment creator modal", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      expect(screen.getByText("Create Assignment")).toBeInTheDocument();
      expect(screen.getByTestId("assignment-details-step")).toBeInTheDocument();
    });

    it("renders progress indicator", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("renders step labels", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Questions")).toBeInTheDocument();
      expect(screen.getByText("Preview")).toBeInTheDocument();
      expect(screen.getByText("Roster")).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      const closeButton = screen.getByRole("button", { name: "" });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe("Step Navigation", () => {
    it("starts at step 1", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      expect(screen.getByTestId("assignment-details-step")).toBeInTheDocument();
      expect(screen.queryByTestId("question-generation-step")).not.toBeInTheDocument();
    });

    it("navigates to step 2 when next is clicked", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      const nextButton = screen.getByText("Next: Generate Questions");
      fireEvent.click(nextButton);

      expect(screen.getByTestId("question-generation-step")).toBeInTheDocument();
      expect(screen.queryByTestId("assignment-details-step")).not.toBeInTheDocument();
    });

    it("navigates back to step 1 when back is clicked from step 2", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Go to step 2
      const nextButton = screen.getByText("Next: Generate Questions");
      fireEvent.click(nextButton);

      // Go back to step 1
      const backButton = screen.getByText("Back");
      fireEvent.click(backButton);

      expect(screen.getByTestId("assignment-details-step")).toBeInTheDocument();
      expect(screen.queryByTestId("question-generation-step")).not.toBeInTheDocument();
    });

    it("navigates through all steps", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Step 1 -> 2
      fireEvent.click(screen.getByText("Next: Generate Questions"));
      expect(screen.getByTestId("question-generation-step")).toBeInTheDocument();

      // Step 2 -> 3
      fireEvent.click(screen.getByText("Next: Preview Questions"));
      expect(screen.getByTestId("question-preview-step")).toBeInTheDocument();

      // Step 3 -> 4
      fireEvent.click(screen.getByText("Next: Select Roster"));
      expect(screen.getByTestId("roster-selection-step")).toBeInTheDocument();
    });
  });

  describe("Data Management", () => {
    it("loads roster members on mount", async () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      await waitFor(() => {
        expect(fetchRosterMembers).toHaveBeenCalledWith("team123", "subteam456");
      });
    });

    it("updates subtopics when event changes", async () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      const titleInput = screen.getByTestId("title-input");
      fireEvent.change(titleInput, { target: { value: "New Title" } });

      await waitFor(() => {
        expect(getEventSubtopics).toHaveBeenCalled();
        expect(getEventCapabilitiesForEvent).toHaveBeenCalled();
      });
    });
  });

  describe("Question Generation", () => {
    it("generates questions when generate button is clicked", async () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Navigate to step 2
      fireEvent.click(screen.getByText("Next: Generate Questions"));

      // Click generate questions
      fireEvent.click(screen.getByText("Generate Questions"));

      await waitFor(() => {
        expect(generateQuestions).toHaveBeenCalled();
      });
    });

    it("shows success toast when questions are generated", async () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Navigate to step 2
      fireEvent.click(screen.getByText("Next: Generate Questions"));

      // Click generate questions
      fireEvent.click(screen.getByText("Generate Questions"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Generated 1 questions successfully!");
      });
    });

    it("shows error toast when question generation fails", async () => {
      generateQuestions.mockRejectedValueOnce(new Error("Generation failed"));

      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Navigate to step 2
      fireEvent.click(screen.getByText("Next: Generate Questions"));

      // Click generate questions
      fireEvent.click(screen.getByText("Generate Questions"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("Assignment Creation", () => {
    it("creates assignment when create button is clicked", async () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Navigate to step 4
      fireEvent.click(screen.getByText("Next: Generate Questions"));
      fireEvent.click(screen.getByText("Next: Preview Questions"));
      fireEvent.click(screen.getByText("Next: Select Roster"));

      // Click create assignment
      fireEvent.click(screen.getByText("Create Assignment"));

      await waitFor(() => {
        expect(createAssignment).toHaveBeenCalled();
      });
    });

    it("calls onAssignmentCreated when assignment is created successfully", async () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Navigate to step 4
      fireEvent.click(screen.getByText("Next: Generate Questions"));
      fireEvent.click(screen.getByText("Next: Preview Questions"));
      fireEvent.click(screen.getByText("Next: Select Roster"));

      // Click create assignment
      fireEvent.click(screen.getByText("Create Assignment"));

      await waitFor(() => {
        expect(mockProps.onAssignmentCreated).toHaveBeenCalledWith({
          id: "assignment123",
          title: "Test Assignment",
        });
      });
    });

    it("shows success toast when assignment is created", async () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Navigate to step 4
      fireEvent.click(screen.getByText("Next: Generate Questions"));
      fireEvent.click(screen.getByText("Next: Preview Questions"));
      fireEvent.click(screen.getByText("Next: Select Roster"));

      // Click create assignment
      fireEvent.click(screen.getByText("Create Assignment"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Assignment created successfully!");
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error message when error occurs", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      const errorButton = screen.getByText("Trigger Error");
      fireEvent.click(errorButton);

      expect(screen.getByText("Test error")).toBeInTheDocument();
    });

    it("clears error when navigating between steps", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      // Trigger error
      const errorButton = screen.getByText("Trigger Error");
      fireEvent.click(errorButton);

      expect(screen.getByText("Test error")).toBeInTheDocument();

      // Navigate to next step
      const nextButton = screen.getByText("Next: Generate Questions");
      fireEvent.click(nextButton);

      expect(screen.queryByText("Test error")).not.toBeInTheDocument();
    });
  });

  describe("Dark Mode", () => {
    it("applies dark mode classes when darkMode is true", () => {
      render(<EnhancedAssignmentCreator {...mockProps} darkMode={true} />);

      const modal = screen.getByText("Create Assignment").closest("div");
      expect(modal).toHaveClass("bg-gray-800");
    });

    it("applies light mode classes when darkMode is false", () => {
      render(<EnhancedAssignmentCreator {...mockProps} darkMode={false} />);

      const modal = screen.getByText("Create Assignment").closest("div");
      expect(modal).toHaveClass("bg-white");
    });
  });

  describe("Close Functionality", () => {
    it("calls onCancel when close button is clicked", () => {
      render(<EnhancedAssignmentCreator {...mockProps} />);

      const closeButton = screen.getByRole("button", { name: "" });
      fireEvent.click(closeButton);

      expect(mockProps.onCancel).toHaveBeenCalled();
    });
  });

  describe("Prefill Event Name", () => {
    it("uses prefill event name when provided", () => {
      render(<EnhancedAssignmentCreator {...mockProps} prefillEventName="Prefilled Event" />);

      // The component should start with the prefill event name
      expect(screen.getByTestId("assignment-details-step")).toBeInTheDocument();
    });
  });
});
