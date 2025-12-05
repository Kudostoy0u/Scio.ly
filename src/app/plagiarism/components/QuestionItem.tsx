"use client";

import type {
	ExtractedQuestion,
	QuestionPlagiarismSummary,
} from "@/app/plagiarism/types";
import { memo } from "react";

const getRiskColor = (riskLevel: string | null) => {
	if (riskLevel === "high") {
		return "bg-red-100 text-red-700 border-red-200";
	}
	if (riskLevel === "medium") {
		return "bg-orange-100 text-orange-700 border-orange-200";
	}
	if (riskLevel === "low") {
		return "bg-yellow-100 text-yellow-700 border-yellow-200";
	}
	return "bg-green-100 text-green-700 border-green-200";
};

const getRiskText = (riskLevel: string | null) => {
	if (riskLevel === "high") {
		return "High Risk";
	}
	if (riskLevel === "medium") {
		return "Medium Risk";
	}
	if (riskLevel === "low") {
		return "Low Risk";
	}
	return "No Risk";
};

export const QuestionItem = memo(
	({
		question,
		index,
		questionSummaries,
		onOpenModal,
	}: {
		question: ExtractedQuestion;
		index: number;
		questionSummaries: QuestionPlagiarismSummary[];
		onOpenModal: (summary: QuestionPlagiarismSummary) => void;
	}) => {
		const summary = questionSummaries.find(
			(s) => s && s.questionIndex === index,
		);
		const hasMatches = Boolean(summary?.matches && summary.matches.length > 0);

		const getRiskLevel = (questionIndex: number): string | null => {
			const s = questionSummaries.find(
				(ss) => ss && ss.questionIndex === questionIndex,
			);
			if (!s?.matches || s.matches.length === 0) {
				return null;
			}
			const highest = s.highestSimilarity;
			if (highest >= 0.95) {
				return "high";
			}
			if (highest >= 0.85) {
				return "medium";
			}
			if (highest >= 0.4) {
				return "low";
			}
			return null;
		};

		const riskLevel = hasMatches ? getRiskLevel(index) : null;

		return (
			<div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
				<div className="flex items-start gap-4">
					<span className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm">
						{index + 1}
					</span>
					<div className="flex-1 min-w-0">
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1 min-w-0">
								<p className="text-slate-800 font-medium text-base leading-relaxed break-words">
									{question.question}
								</p>
							</div>
							{(() => {
								if (!summary) {
									return (
										<span className="ml-4 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
												Analyzing...
											</div>
										</span>
									);
								}

								if (riskLevel && hasMatches) {
									return (
										<button
											type="button"
											onClick={() => onOpenModal(summary)}
											className={`ml-4 flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium border-2 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 ${getRiskColor(riskLevel)}`}
										>
											{getRiskText(riskLevel)}
											<svg
												className="w-3 h-3"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												role="img"
												aria-label="View details"
											>
												<title>View details</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 5l7 7-7 7"
												/>
											</svg>
										</button>
									);
								}

								if (hasMatches) {
									return (
										<span className="ml-4 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
											No Risk
										</span>
									);
								}

								return (
									<span className="ml-4 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
										No Matches
									</span>
								);
							})()}
						</div>

						{question.type === "mcq" && question.options && (
							<div className="space-y-2 mb-4">
								<div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
									Options
								</div>
								{question.options.map((option: string, optIndex: number) => (
									<div
										key={`${index}-option-${optIndex}-${option.slice(0, 10)}`}
										className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
									>
										<div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
											<div className="w-2 h-2 rounded-full bg-slate-400" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm text-slate-700 leading-relaxed break-words">
												{option}
											</p>
										</div>
									</div>
								))}
							</div>
						)}

						<div className="flex items-center gap-2">
							<span
								className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
									question.type === "mcq"
										? "bg-blue-50 text-blue-700 border-blue-200"
										: "bg-green-50 text-green-700 border-green-200"
								}`}
							>
								{question.type === "mcq" ? "Multiple Choice" : "Free Response"}
							</span>
							{summary && hasMatches && (
								<span className="text-xs text-slate-500">
									{summary.matches.length} match
									{summary.matches.length !== 1 ? "es" : ""} found
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

QuestionItem.displayName = "QuestionItem";
