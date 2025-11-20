import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event, Settings } from "@/app/types";
import TestConfiguration from "./TestConfiguration";

// Mock dependencies
vi.mock("@/app/contexts/ThemeContext", () => ({
  useTheme: () => ({ darkMode: false }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockEvent: Event = {
  id: 1,
  name: "Astronomy",
  slug: "astronomy",
  subject: "Earth & Space",
  division: "C",
  currentYear: true,
};

const defaultSettings: Settings = {
  questionCount: 25,
  difficulties: [],
  timeLimit: 50,
  types: "all",
  subtopics: [],
  division: "C",
  tournament: "all",
};

describe("TestConfiguration", () => {
  const mockOnSettingsChange = vi.fn();
  const mockOnGenerateTest = vi.fn();
  const mockOnUnlimited = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    SyncLocalStorage.clear();
  });

  it("renders all configuration inputs", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    expect(screen.getByLabelText(/number of questions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
    expect(screen.getByText(/generate test/i)).toBeInTheDocument();
  });

  it("updates question count on input change", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    const questionInput = screen.getByLabelText(/number of questions/i);
    fireEvent.change(questionInput, { target: { value: "30" } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ questionCount: 30 })
    );
  });

  it("prevents question count above 200", async () => {
    const { toast } = await import("react-toastify");

    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    const questionInput = screen.getByLabelText(/number of questions/i);
    fireEvent.change(questionInput, { target: { value: "250" } });

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith("You cannot select more than 200 questions");
    });
    expect(mockOnSettingsChange).not.toHaveBeenCalled();
  });

  it("enforces minimum question count of 1", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    const questionInput = screen.getByLabelText(/number of questions/i);
    fireEvent.change(questionInput, { target: { value: "0" } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ questionCount: 1 })
    );
  });

  it("updates time limit and clamps to valid range", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    const timeInput = screen.getByLabelText(/time limit/i);

    // Test normal value
    fireEvent.change(timeInput, { target: { value: "60" } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ timeLimit: 60 }));

    // Test value above maximum
    fireEvent.change(timeInput, { target: { value: "150" } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ timeLimit: 120 }));

    // Test value below minimum
    fireEvent.change(timeInput, { target: { value: "0" } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ timeLimit: 1 }));
  });

  it("saves settings to localStorage", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    const questionInput = screen.getByLabelText(/number of questions/i);
    fireEvent.change(questionInput, { target: { value: "40" } });

    expect(SyncLocalStorage.getItem("defaultQuestionCount")).toBe("40");
  });

  it("uses different localStorage key for Codebusters", () => {
    const codebustersEvent: Event = {
      ...mockEvent,
      name: "Codebusters",
      slug: "codebusters",
    };

    render(
      <TestConfiguration
        selectedEvent={codebustersEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    const questionInput = screen.getByLabelText(/number of questions/i);
    fireEvent.change(questionInput, { target: { value: "15" } });

    expect(SyncLocalStorage.getItem("codebustersQuestionCount")).toBe("15");
  });

  it("calls onGenerateTest when generate button is clicked", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    const generateButton = screen.getByText(/generate test/i);
    fireEvent.click(generateButton);

    expect(mockOnGenerateTest).toHaveBeenCalled();
  });

  it("calls onUnlimited when unlimited button is clicked", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
        hideUnlimited={false}
      />
    );

    const unlimitedButton = screen.getByText(/unlimited/i);
    fireEvent.click(unlimitedButton);

    expect(mockOnUnlimited).toHaveBeenCalled();
  });

  it("hides unlimited button when hideUnlimited is true", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
        hideUnlimited={true}
      />
    );

    expect(screen.queryByText(/unlimited/i)).not.toBeInTheDocument();
  });

  it("displays custom generate label", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
        generateLabel="Start Practice"
      />
    );

    expect(screen.getByText("Start Practice")).toBeInTheDocument();
  });

  it("renders difficulty configuration section", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    // Check that difficulty section exists
    expect(screen.getByText(/all difficulties/i)).toBeInTheDocument();
  });

  it("renders subtopic configuration section", () => {
    render(
      <TestConfiguration
        selectedEvent={mockEvent}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        onGenerateTest={mockOnGenerateTest}
        onUnlimited={mockOnUnlimited}
      />
    );

    // Check that subtopic section exists
    expect(screen.getByText(/all subtopics/i)).toBeInTheDocument();
  });
});
