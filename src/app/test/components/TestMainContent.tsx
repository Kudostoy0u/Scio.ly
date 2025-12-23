import type { Question } from "@/app/utils/geminiService";
import type React from "react";
import QuestionCard from "./QuestionCard";
import QuestionCardSkeleton from "./QuestionCardSkeleton";
import TestCodebustersMessage from "./TestCodebustersMessage";

interface TestMainContentProps {
	isLoading: boolean;
	isResetting: boolean;
	fetchError: string | null;
	routerData: Record<string, unknown>;
	darkMode: boolean;
	data: Question[];
	userAnswers: Record<number, (string | null)[] | null>;
	isSubmitted: boolean;
	gradingResults: Record<number, number>;
	explanations: Record<number, string>;
	loadingExplanation: Record<number, boolean>;
	submittedReports: Record<number, boolean>;
	submittedEdits: Record<number, boolean>;
	gradingFRQs: Record<number, boolean>;
	handleAnswerChange: (
		index: number,
		answer: string | null,
		multiselect?: boolean,
	) => void;
	handleBookmarkChange: (questionText: string, isBookmarked: boolean) => void;
	handleReportSubmitted: (index: number) => void;
	handleEditSubmitted: (index: number) => void;
	handleEditOpen: (question: Question) => void;
	handleQuestionRemoved: (index: number) => void;
	handleGetExplanation: (
		index: number,
		question: Question,
		userAnswer: (string | null)[],
	) => void;
	isOffline: boolean;
	isPreview: boolean;
	isQuestionBookmarked: (question: Question) => boolean;
}

const TestMainContent: React.FC<TestMainContentProps> = ({
	isLoading,
	isResetting,
	fetchError,
	routerData,
	darkMode,
	data,
	userAnswers,
	isSubmitted,
	gradingResults,
	explanations,
	loadingExplanation,
	submittedReports,
	submittedEdits,
	gradingFRQs,
	handleAnswerChange,
	handleBookmarkChange,
	handleReportSubmitted,
	handleEditSubmitted,
	handleEditOpen,
	handleQuestionRemoved,
	handleGetExplanation,
	isOffline,
	isPreview,
	isQuestionBookmarked,
}) => {
	if ((isLoading && data.length === 0) || isResetting) {
		// Show 10 skeleton cards when loading with no data, or when resetting
		const skeletonKeys = [
			"skeleton-0",
			"skeleton-1",
			"skeleton-2",
			"skeleton-3",
			"skeleton-4",
			"skeleton-5",
			"skeleton-6",
			"skeleton-7",
			"skeleton-8",
			"skeleton-9",
		];
		return (
			<>
				{skeletonKeys.map((skeletonKey, index) => (
					<QuestionCardSkeleton
						key={skeletonKey}
						index={index}
						darkMode={darkMode}
						eventName={(routerData.eventName as string) || "Unknown Event"}
					/>
				))}
			</>
		);
	}

	if (fetchError) {
		return <div className="text-red-600 text-center">{fetchError}</div>;
	}

	if (
		routerData.eventName === "Codebusters" &&
		routerData.types === "multiple-choice"
	) {
		return <TestCodebustersMessage darkMode={darkMode} />;
	}

	return (
		<>
			{data.map((question, index) => {
				const isBookmarked = isQuestionBookmarked(question);
				const questionKey = question.id
					? `${question.id}-${index}`
					: `question-${index}-${question.question.substring(0, 50)}`;

				return (
					<QuestionCard
						key={questionKey}
						question={question}
						index={index}
						userAnswers={userAnswers[index] || []}
						isSubmitted={isSubmitted}
						darkMode={darkMode}
						eventName={(routerData.eventName as string) || "Unknown Event"}
						isBookmarked={isBookmarked}
						gradingResults={gradingResults}
						explanations={explanations}
						loadingExplanation={loadingExplanation}
						submittedReports={submittedReports}
						submittedEdits={submittedEdits}
						gradingFRQs={gradingFRQs}
						onAnswerChange={handleAnswerChange}
						onBookmarkChange={handleBookmarkChange}
						onReportSubmitted={handleReportSubmitted}
						onEditSubmitted={handleEditSubmitted}
						onEdit={handleEditOpen}
						onQuestionRemoved={handleQuestionRemoved}
						onGetExplanation={handleGetExplanation}
						isOffline={isOffline}
						hideResultText={isPreview}
						isAssignmentMode={!!routerData.assignmentMode}
					/>
				);
			})}
		</>
	);
};

export default TestMainContent;
