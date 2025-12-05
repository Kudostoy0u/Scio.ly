"use client";
import type {
	ProcessedQuestions,
	QuestionPlagiarismSummary,
} from "@/app/plagiarism/types";
import type React from "react";
import { QuestionItem } from "./QuestionItem";

export default function AnalysisList({
	extractedQuestions,
	questionSummaries,
	onOpenModal,
	analysisScrollRef,
	onScroll,
}: {
	extractedQuestions: ProcessedQuestions | null;
	questionSummaries: QuestionPlagiarismSummary[];
	onOpenModal: (summary: QuestionPlagiarismSummary) => void;
	analysisScrollRef: React.RefObject<HTMLDivElement | null>;
	onScroll: () => void;
}) {
	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold text-slate-800">Analysis</h2>
				{extractedQuestions && (
					<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
						{extractedQuestions.questions.length} questions
					</span>
				)}
			</div>
			<div
				className="max-h-96 overflow-y-auto space-y-4"
				ref={analysisScrollRef}
				onScroll={onScroll}
			>
				{extractedQuestions ? (
					extractedQuestions.questions.map((question, index) => (
						<QuestionItem
							key={`question-${index}-${question.question.slice(0, 20)}`}
							question={question}
							index={index}
							questionSummaries={questionSummaries}
							onOpenModal={onOpenModal}
						/>
					))
				) : (
					<div className="text-center py-8 text-slate-500">
						<p>Questions will appear here after analysis</p>
					</div>
				)}
			</div>
		</div>
	);
}
