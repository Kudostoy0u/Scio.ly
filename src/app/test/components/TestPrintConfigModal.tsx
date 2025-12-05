import { PrintConfigModal } from "@/app/components/PrintConfigModal";
import type { Question } from "@/app/utils/geminiService";
import type React from "react";

interface TestPrintConfigModalProps {
	isOpen: boolean;
	onClose: () => void;
	onPrint: () => void;
	questions: Question[];
	tournamentName: string;
	setTournamentName: (name: string) => void;
	questionPoints: { [key: number]: number };
	setQuestionPoints: (points: { [key: number]: number }) => void;
	darkMode: boolean;
}

const getSuggestedPoints = (question: Question): number => {
	if (question.options && question.options.length > 0) {
		return 2;
	}
	return 5;
};

const getQuestionType = (question: Question): string => {
	if (question.options && question.options.length > 0) {
		return "Multiple Choice";
	}
	return "Free Response";
};

export const TestPrintConfigModal: React.FC<TestPrintConfigModalProps> = (
	props,
) => {
	return (
		<PrintConfigModal
			{...props}
			items={props.questions}
			title="Print Test Configuration"
			renderQuestionInfo={(question) => {
				const questionType = getQuestionType(question);
				const suggestedPoints = getSuggestedPoints(question);

				return {
					label: questionType,
					metadata: (
						<div>
							<span
								className={`${props.darkMode ? "text-gray-400" : "text-gray-600"}`}
							>
								Suggested:{" "}
							</span>
							<span
								className={`font-medium ${props.darkMode ? "text-white" : "text-gray-900"}`}
							>
								{suggestedPoints} pts
							</span>
						</div>
					),
					suggestedPoints,
				};
			}}
			getEffectivePoints={(question, index) => {
				const suggestedPoints = getSuggestedPoints(question);
				return props.questionPoints[index] || suggestedPoints;
			}}
		/>
	);
};
