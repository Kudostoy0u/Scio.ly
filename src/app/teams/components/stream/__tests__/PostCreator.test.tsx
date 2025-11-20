import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PostCreator from "@/app/teams/components/stream/PostCreator";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Send: () => <div data-testid="send-icon" />,
  Paperclip: () => <div data-testid="paperclip-icon" />,
}));

describe("PostCreator", () => {
  const defaultProps = {
    darkMode: false,
    newPostContent: "",
    onContentChange: vi.fn(),
    onSubmit: vi.fn(),
    posting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders post creation form", () => {
      render(<PostCreator {...defaultProps} />);

      expect(screen.getByPlaceholderText("What's happening with the team?")).toBeInTheDocument();
      expect(screen.getByText("Post")).toBeInTheDocument();
    });

    it("renders send icon", () => {
      render(<PostCreator {...defaultProps} />);

      expect(screen.getByTestId("send-icon")).toBeInTheDocument();
    });
  });

  describe("Form Interactions", () => {
    it("calls onContentChange when textarea content changes", () => {
      render(<PostCreator {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("What's happening with the team?");
      fireEvent.change(textarea, { target: { value: "New post content" } });

      expect(defaultProps.onContentChange).toHaveBeenCalledWith("New post content");
    });

    it("calls onSubmit when post button is clicked", () => {
      render(<PostCreator {...defaultProps} newPostContent="Test content" />);

      const postButton = screen.getByText("Post");
      fireEvent.click(postButton);

      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    });

    it("calls onSubmit when post button is clicked (form submission)", () => {
      render(<PostCreator {...defaultProps} newPostContent="Test content" />);

      const postButton = screen.getByText("Post");
      fireEvent.click(postButton);

      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Button States", () => {
    it("disables post button when content is empty", () => {
      render(<PostCreator {...defaultProps} newPostContent="" />);

      const postButton = screen.getByText("Post").closest("button");
      expect(postButton).toBeDisabled();
    });

    it("enables post button when content is not empty", () => {
      render(<PostCreator {...defaultProps} newPostContent="Some content" />);

      const postButton = screen.getByText("Post").closest("button");
      expect(postButton).not.toBeDisabled();
    });

    it("shows loading state when posting", () => {
      render(<PostCreator {...defaultProps} posting={true} />);

      const postButton = screen.getByText("Posting...").closest("button");
      expect(postButton).toBeInTheDocument();
      expect(postButton).toBeDisabled();
    });

    it("shows normal state when not posting", () => {
      render(<PostCreator {...defaultProps} posting={false} newPostContent="Some content" />);

      const postButton = screen.getByText("Post").closest("button");
      expect(postButton).toBeInTheDocument();
      expect(postButton).not.toBeDisabled();
    });
  });

  describe("Content Display", () => {
    it("displays current content in textarea", () => {
      render(<PostCreator {...defaultProps} newPostContent="Existing content" />);

      const textarea = screen.getByPlaceholderText("What's happening with the team?");
      expect(textarea).toHaveValue("Existing content");
    });

    it("updates textarea when content prop changes", () => {
      const { rerender } = render(
        <PostCreator {...defaultProps} newPostContent="Initial content" />
      );

      let textarea = screen.getByPlaceholderText("What's happening with the team?");
      expect(textarea).toHaveValue("Initial content");

      rerender(<PostCreator {...defaultProps} newPostContent="Updated content" />);

      textarea = screen.getByPlaceholderText("What's happening with the team?");
      expect(textarea).toHaveValue("Updated content");
    });
  });

  describe("Dark Mode", () => {
    it("applies dark mode classes when darkMode is true", () => {
      render(<PostCreator {...defaultProps} darkMode={true} />);

      const textarea = screen.getByPlaceholderText("What's happening with the team?");
      expect(textarea).toHaveClass("bg-gray-700");
    });

    it("applies light mode classes when darkMode is false", () => {
      render(<PostCreator {...defaultProps} darkMode={false} />);

      const textarea = screen.getByPlaceholderText("What's happening with the team?");
      expect(textarea).toHaveClass("bg-white");
    });
  });

  describe("Accessibility", () => {
    it("has proper form structure", () => {
      render(<PostCreator {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("What's happening with the team?");
      expect(textarea).toBeInTheDocument();
    });

    it("has proper button structure", () => {
      render(<PostCreator {...defaultProps} />);

      const postButton = screen.getByText("Post").closest("button");
      expect(postButton).toBeInTheDocument();
    });
  });
});
