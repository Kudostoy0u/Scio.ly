import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlacklistedQuestionCard, QuestionCard } from "./QuestionCards";

describe("QuestionCards", () => {
	it("renders MCQ with correct option highlighted", () => {
		const q = JSON.stringify({
			question: "What is 2 + 2?",
			options: ["3", "4", "5"],
			answers: [1],
			difficulty: 0.2,
		});
		render(<QuestionCard questionData={q} darkMode={false} />);
		expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();
		expect(screen.getAllByText("✓ Correct")[0]).toBeInTheDocument();
	});

	it("renders FRQ with answer shown", () => {
		const q = JSON.stringify({
			question: "Name the process plants use to make food.",
			answers: ["Photosynthesis"],
			difficulty: 0.5,
		});
		render(<BlacklistedQuestionCard questionData={q} darkMode={true} />);
		expect(screen.getByText("Question")).toBeInTheDocument();
		expect(screen.getByText("Photosynthesis")).toBeInTheDocument();
	});
});
