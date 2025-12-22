import { getTRPCProxyClient } from "@/lib/trpc/client";
import { useCallback } from "react";
import type { QuoteData } from "../types";

interface AssignmentQuestion {
	id?: string;
	question_text?: string;
	question_type?: string;
	parameters?: {
		questionCount: number;
		charLengthMin: number;
		charLengthMax: number;
		division?: string;
		cipherTypes?: string[];
	};
	quote?: string;
	author?: string;
	cipherType?: string;
	difficulty?: number | string;
	division?: string;
	charLength?: number;
	encrypted?: string;
	key?: string;
	kShift?: number;
	plainAlphabet?: string;
	cipherAlphabet?: string;
	matrix?: number[][];
	decryptionMatrix?: number[][];
	portaKeyword?: string;
	nihilistPolybiusKey?: string;
	nihilistCipherKey?: string;
	checkerboardRowKey?: string;
	checkerboardColKey?: string;
	checkerboardPolybiusKey?: string;
	checkerboardUsesIJ?: boolean;
	blockSize?: number;
	columnarKey?: string;
	fractionationTable?: { [key: string]: string };
	caesarShift?: number;
	affineA?: number;
	affineB?: number;
	baconianBinaryType?: string;
	cryptarithmData?: {
		equation: string;
		numericExample: string | null;
		digitGroups: Array<{
			digits: string;
			word: string;
		}>;
	};
	askForKeyword?: boolean;
	hint?: string;
	solution?: string | Record<string, string>;
	correct_answer?: string;
	points?: number;
}

interface CodebustersParams {
	questionCount: number;
	charLengthMin: number;
	charLengthMax: number;
	division?: string;
	cipherTypes?: string[];
}

interface UseAssignmentLoaderProps {
	setQuotes: (quotes: QuoteData[]) => void;
	setTimeLeft: (time: number) => void;
	setIsLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	generateCodebustersQuestionsFromParams: (
		params: CodebustersParams,
	) => Promise<QuoteData[]>;
}

export function useAssignmentLoader({
	setQuotes,
	setTimeLeft,
	setIsLoading,
	setError,
	generateCodebustersQuestionsFromParams,
}: UseAssignmentLoaderProps) {
	const setAssignmentTimeLimit = useCallback(
		(assignment: { time_limit_minutes?: number }) => {
			const timeLimit = assignment.time_limit_minutes || 15;
			setTimeLeft(timeLimit * 60);
		},
		[setTimeLeft],
	);

	const handleParamsBasedQuestions = useCallback(
		async (
			paramsQuestion: AssignmentQuestion,
			assignment: { time_limit_minutes?: number },
		): Promise<boolean> => {
			try {
				if (!paramsQuestion.parameters) {
					return false;
				}
				const generatedQuestions = await generateCodebustersQuestionsFromParams(
					paramsQuestion.parameters,
				);
				setQuotes(generatedQuestions);
				setAssignmentTimeLimit(assignment);
				setIsLoading(false);
				return true;
			} catch (_error) {
				setError("Failed to generate questions for this assignment");
				setIsLoading(false);
				return false;
			}
		},
		[
			setQuotes,
			setAssignmentTimeLimit,
			setIsLoading,
			setError,
			generateCodebustersQuestionsFromParams,
		],
	);

	const handlePreGeneratedQuestions = useCallback(
		(
			questions: AssignmentQuestion[],
			assignment: { time_limit_minutes?: number },
		): void => {
			const codebustersQuotes: QuoteData[] = questions.map(
				(q: AssignmentQuestion, index: number) => ({
					id: q.id || `assignment-${index}`,
					quote: q.quote || q.question_text || "",
					author: q.author || "Unknown",
					cipherType: (q.cipherType ||
						"Random Aristocrat") as QuoteData["cipherType"],
					difficulty:
						typeof q.difficulty === "number" ? q.difficulty : undefined,
					division: q.division || "C",
					charLength: q.charLength || 100,
					encrypted: q.encrypted || "",
					key: q.key || "",
					hint: q.hint || "",
					kShift: q.kShift,
					plainAlphabet: q.plainAlphabet,
					cipherAlphabet: q.cipherAlphabet,
					matrix: q.matrix,
					decryptionMatrix: q.decryptionMatrix,
					portaKeyword: q.portaKeyword,
					nihilistPolybiusKey: q.nihilistPolybiusKey,
					nihilistCipherKey: q.nihilistCipherKey,
					checkerboardRowKey: q.checkerboardRowKey,
					checkerboardColKey: q.checkerboardColKey,
					checkerboardPolybiusKey: q.checkerboardPolybiusKey,
					checkerboardUsesIJ: q.checkerboardUsesIJ,
					blockSize: q.blockSize,
					columnarKey: q.columnarKey,
					fractionationTable: q.fractionationTable,
					caesarShift: q.caesarShift,
					affineA: q.affineA,
					affineB: q.affineB,
					baconianBinaryType: q.baconianBinaryType,
					cryptarithmData: q.cryptarithmData,
					askForKeyword: q.askForKeyword,
					points: typeof q.points === "number" ? q.points : undefined,
					solution:
						typeof q.solution === "object" && q.solution !== null
							? (q.solution as { [key: string]: string })
							: typeof q.correct_answer === "object" &&
									q.correct_answer !== null
								? (q.correct_answer as { [key: string]: string })
								: undefined,
				}),
			);
			setQuotes(codebustersQuotes);
			setAssignmentTimeLimit(assignment);
			setIsLoading(false);
		},
		[setQuotes, setAssignmentTimeLimit, setIsLoading],
	);

	const handleLoadAssignmentQuestions = useCallback(
		async (assignmentId: string) => {
			try {
				const client = getTRPCProxyClient();
				const assignment = await client.teams.getAssignmentDetails.query({
					assignmentId,
				});
				const questions = assignment.questions;
				if (!questions || questions.length === 0) {
					setError("No questions found in this assignment");
					setIsLoading(false);
					return;
				}
				const paramsQuestion = questions.find((q) => {
					const qAny = q as unknown as AssignmentQuestion;
					return (
						qAny.question_type === "codebusters_params" ||
						(q as { questionType?: string }).questionType ===
							"codebusters_params"
					);
				});
				if (paramsQuestion && "parameters" in paramsQuestion) {
					const qAny = paramsQuestion as unknown as AssignmentQuestion;
					if (qAny.parameters) {
						await handleParamsBasedQuestions(qAny, {
							time_limit_minutes: assignment.timeLimitMinutes ?? undefined,
						});
						return;
					}
				}
				handlePreGeneratedQuestions(questions as AssignmentQuestion[], {
					time_limit_minutes: assignment.timeLimitMinutes ?? undefined,
				});
			} catch (_error) {
				setError("Failed to load assignment");
				setIsLoading(false);
			}
		},
		[
			setError,
			setIsLoading,
			handleParamsBasedQuestions,
			handlePreGeneratedQuestions,
		],
	);

	return {
		handleLoadAssignmentQuestions,
	};
}
