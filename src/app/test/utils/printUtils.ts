// This file previously contained barrel exports which have been removed for performance.
// Import functions directly from their respective files:
// - createTestPrintStyles from "./print/styles"
// - createTestPrintContent from "./print/content"
// - setupTestPrintWindow from "./print/setupWindow"
// - TestPrintConfig type from "./print/content"

import type { Question } from "@/app/utils/geminiService";

import { createTestPrintContent } from "./print/content";
import { setupTestPrintWindow } from "./print/setupWindow";
import { createTestPrintStyles } from "./print/styles";

// Helper function for printing test
export async function handleActualPrintHelper(
	tournamentName: string,
	data: Question[],
	questionPoints: { [key: number]: number },
	setPrintModalOpen: (open: boolean) => void,
	toast: { error: (message: string) => void },
) {
	if (!tournamentName.trim()) {
		toast.error("Tournament name is required");
		return;
	}

	const formatQuestionsForPrint = () => {
		let questionsHtml = "";

		for (const [index, question] of data.entries()) {
			const points =
				questionPoints[index] ||
				(question.options && question.options.length > 0 ? 2 : 5);

			questionsHtml += `<div class="question">`;

			questionsHtml += `<div class="question-header">${index + 1}. ${question.question} [${points} pts]</div>`;

			if (question.imageUrl || question.imageData) {
				questionsHtml += `<div class="question-image">
          <img src="${question.imageData || question.imageUrl}" alt="Question Image" />
        </div>`;
			}

			if (question.options && question.options.length > 0) {
				questionsHtml += `<div class="question-options">`;
				for (const [optionIndex, option] of question.options.entries()) {
					const letter = String.fromCharCode(97 + optionIndex); // a, b, c, d...
					questionsHtml += `<div class="option">${letter}. ${option}</div>`;
				}
				questionsHtml += "</div>";
			} else {
				questionsHtml += `<div class="answer-space">
          <div class="answer-line">Answer: _________________________________________________</div>
          <div class="answer-line">_______________________________________________________</div>
          <div class="answer-line">_______________________________________________________</div>
        </div>`;
			}

			questionsHtml += "</div>";
		}

		return questionsHtml;
	};

	const createAnswerKey = () => {
		let answerKeyHtml = '<div class="answer-key"><h2>Answer Key</h2>';

		for (const [index, question] of data.entries()) {
			if (question.answers && question.answers.length > 0) {
				answerKeyHtml += `<div class="answer-item">${index + 1}. ${question.answers.join(", ")}</div>`;
			}
		}

		answerKeyHtml += "</div>";
		return answerKeyHtml;
	};

	const getStylesheets = () => {
		return "";
	};

	const printStyles = createTestPrintStyles(getStylesheets);

	const printContent = createTestPrintContent(
		{
			tournamentName,
			questionsHtml: formatQuestionsForPrint() + createAnswerKey(),
			questionPoints,
		},
		printStyles,
	);

	try {
		await setupTestPrintWindow(printContent);
	} catch (err) {
		toast.error(err instanceof Error ? err.message : "Failed to print test");
	}

	setPrintModalOpen(false);
}
