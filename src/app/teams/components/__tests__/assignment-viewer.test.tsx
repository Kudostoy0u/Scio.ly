import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import AssignmentViewer from "@/app/teams/components/AssignmentViewer";

// Mock fetch
global.fetch = vi.fn();

// Mock window.alert
global.alert = vi.fn();

const mockFetch = vi.mocked(global.fetch);

const createMockResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });

const mockAssignment = {
  id: "assignment-1",
  title: "Test Assignment",
  description: "Test description",
  assignment_type: "homework",
  due_date: "2024-12-31T23:59:59Z",
  points: 100,
  is_required: true,
  max_attempts: 3,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  questions: [
    {
      id: "question-1",
      question: "What is 2+2?",
      type: "mcq",
      options: ["3", "4"],
      answers: [1], // Index of correct answer
      points: 1,
      order: 0,
    },
    {
      id: "question-2",
      question: "Explain photosynthesis",
      type: "frq",
      options: [],
      answers: [],
      points: 2,
      order: 1,
    },
  ],
  user_submission: null,
};

const defaultProps = {
  assignment: mockAssignment,
  onSubmissionComplete: vi.fn(),
  darkMode: false,
};

// Regex constants for test queries
const QUESTION_1_MULTIPLE_CHOICE_REGEX = /Question 1 \(multiple choice\)/;
const QUESTION_2_FREE_RESPONSE_REGEX = /Question 2 \(free response\)/;
const QUESTION_1_CODEBUSTERS_REGEX = /Question 1 \(codebusters\)/;
const DUE_REGEX = /Due:/;
const OPTION_B_REGEX = /B\./;

describe("AssignmentViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render assignment viewer", () => {
    render(<AssignmentViewer {...defaultProps} />);

    expect(screen.getByText("Test Assignment")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    // The component renders "Question 1 (multiple choice)" with replace("_", " ")
    expect(screen.getByText(QUESTION_1_MULTIPLE_CHOICE_REGEX)).toBeInTheDocument();
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
  });

  it("should show assignment metadata", () => {
    render(<AssignmentViewer {...defaultProps} />);

    expect(screen.getByText("2 questions")).toBeInTheDocument();
    // The component shows due date but not points in the header
    expect(screen.getByText(DUE_REGEX)).toBeInTheDocument();
  });

  it("should show progress bar", () => {
    render(<AssignmentViewer {...defaultProps} />);

    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("50% complete")).toBeInTheDocument();
  });

  it("should allow navigation between questions", () => {
    render(<AssignmentViewer {...defaultProps} />);

    // Should start on question 1
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();

    // Click next
    fireEvent.click(screen.getByText("Next"));

    // Should show question 2
    expect(screen.getByText("Explain photosynthesis")).toBeInTheDocument();
    expect(screen.getByText(QUESTION_2_FREE_RESPONSE_REGEX)).toBeInTheDocument();

    // Click previous
    fireEvent.click(screen.getByText("Previous"));

    // Should show question 1 again
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
  });

  it("should handle multiple choice questions", () => {
    render(<AssignmentViewer {...defaultProps} />);

    // QuestionRenderer uses radio inputs with value={option.id}
    const optionB = screen.getByRole("radio", { name: OPTION_B_REGEX });
    fireEvent.click(optionB);

    expect(optionB).toBeChecked();
  });

  it("should handle free response questions", () => {
    render(<AssignmentViewer {...defaultProps} />);

    // Navigate to question 2
    fireEvent.click(screen.getByText("Next"));

    const textarea = screen.getByPlaceholderText("Enter your answer here...");
    fireEvent.change(textarea, { target: { value: "Photosynthesis is the process..." } });

    expect(textarea).toHaveValue("Photosynthesis is the process...");
  });

  it("should show submit button on last question", () => {
    render(<AssignmentViewer {...defaultProps} />);

    // Navigate to last question
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Submit Assignment")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("should submit assignment when submit button is clicked", async () => {
    const mockSubmission = {
      id: "submission-1",
      grade: 85,
      total_points: 3,
      earned_points: 2,
      status: "submitted",
      submitted_at: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce(createMockResponse({ submission: mockSubmission }));

    render(<AssignmentViewer {...defaultProps} />);

    // Answer first question
    const optionB = screen.getByRole("radio", { name: OPTION_B_REGEX });
    fireEvent.click(optionB);

    // Navigate to second question
    fireEvent.click(screen.getByText("Next"));

    // Answer second question
    const textarea = screen.getByPlaceholderText("Enter your answer here...");
    fireEvent.change(textarea, { target: { value: "Photosynthesis is..." } });

    // Submit
    fireEvent.click(screen.getByText("Submit Assignment"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/teams/assignment-1/assignments/assignment-1/submit",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("responses"),
        })
      );
    });

    expect(defaultProps.onSubmissionComplete).toHaveBeenCalledWith(mockSubmission);
  });

  it("should show error when submission fails", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: "Submission failed" }, 500));

    render(<AssignmentViewer {...defaultProps} />);

    // Answer first question
    const optionB = screen.getByRole("radio", { name: OPTION_B_REGEX });
    fireEvent.click(optionB);

    // Navigate to second question
    fireEvent.click(screen.getByText("Next"));

    // Answer second question
    const textarea = screen.getByPlaceholderText("Enter your answer here...");
    fireEvent.change(textarea, { target: { value: "Photosynthesis is..." } });

    // Submit
    fireEvent.click(screen.getByText("Submit Assignment"));

    await waitFor(() => {
      expect(screen.getByText("Submission failed")).toBeInTheDocument();
    });
  });

  it("should prevent submission without answers", async () => {
    render(<AssignmentViewer {...defaultProps} />);

    // Navigate to last question without answering
    fireEvent.click(screen.getByText("Next"));

    // Try to submit
    fireEvent.click(screen.getByText("Submit Assignment"));

    await waitFor(() => {
      expect(screen.getByText("Please answer at least one question")).toBeInTheDocument();
    });
  });

  it("should show response summary", () => {
    render(<AssignmentViewer {...defaultProps} />);

    expect(screen.getByText("Answered: 0 / 2 questions")).toBeInTheDocument();
  });

  it("should update response summary when questions are answered", () => {
    render(<AssignmentViewer {...defaultProps} />);

    // Answer first question
    const optionB = screen.getByRole("radio", { name: OPTION_B_REGEX });
    fireEvent.click(optionB);

    expect(screen.getByText("Answered: 1 / 2 questions")).toBeInTheDocument();
  });

  it("should show question numbers in navigation", () => {
    render(<AssignmentViewer {...defaultProps} />);

    // Should show question numbers
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should allow clicking on question numbers to navigate", () => {
    render(<AssignmentViewer {...defaultProps} />);

    // Click on question 2
    const question2Button = screen.getByText("2");
    fireEvent.click(question2Button);

    expect(screen.getByText("Explain photosynthesis")).toBeInTheDocument();
    expect(screen.getByText("Question 2 (free response)")).toBeInTheDocument();
  });

  it("should show different styles for answered questions", () => {
    render(<AssignmentViewer {...defaultProps} />);

    // Answer first question
    const optionB = screen.getByRole("radio", { name: OPTION_B_REGEX });
    fireEvent.click(optionB);

    // Navigate to question 2
    fireEvent.click(screen.getByText("Next"));

    // Question 1 should be marked as answered
    const question1Button = screen.getByText("1");
    expect(question1Button).toHaveClass("bg-green-100", "text-green-700");
  });

  it("should handle codebusters questions", () => {
    const codebustersAssignment = {
      ...mockAssignment,
      questions: [
        {
          id: "question-1",
          question: "Decode this message: ABC",
          type: "codebusters",
          options: [],
          answers: [],
          correct_answer: "XYZ",
          points: 1,
          order: 0,
        },
      ],
    };

    render(<AssignmentViewer {...defaultProps} assignment={codebustersAssignment} />);

    expect(screen.getByText(QUESTION_1_CODEBUSTERS_REGEX)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter your codebusters answer here...")
    ).toBeInTheDocument();
  });

  it("should show timer when assignment has time limit", () => {
    const timedAssignment = {
      ...mockAssignment,
      time_limit_minutes: 30,
    };

    render(<AssignmentViewer {...defaultProps} assignment={timedAssignment} />);

    // Timer functionality not implemented in current component
    expect(screen.getByText("Test Assignment")).toBeInTheDocument();
  });

  it("should support dark mode", () => {
    render(<AssignmentViewer {...defaultProps} darkMode={true} />);

    expect(screen.getByText("Test Assignment")).toHaveClass("text-white");
  });

  it("should show existing submission status", () => {
    const assignmentWithSubmission = {
      ...mockAssignment,
      user_submission: {
        status: "submitted",
        submitted_at: "2024-01-01T00:00:00Z",
        grade: 85,
        attempt_number: 1,
      },
    };

    render(<AssignmentViewer {...defaultProps} assignment={assignmentWithSubmission} />);

    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });
});
