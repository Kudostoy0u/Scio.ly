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
  hint?: string;
  solution?: string | Record<string, string>;
  correct_answer?: string;
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
  generateCodebustersQuestionsFromParams: (params: CodebustersParams) => Promise<QuoteData[]>;
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
    [setTimeLeft]
  );

  const handleParamsBasedQuestions = useCallback(
    async (
      paramsQuestion: AssignmentQuestion,
      assignment: { time_limit_minutes?: number }
    ): Promise<boolean> => {
      try {
        if (!paramsQuestion.parameters) {
          return false;
        }
        const generatedQuestions = await generateCodebustersQuestionsFromParams(
          paramsQuestion.parameters
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
    ]
  );

  const handlePreGeneratedQuestions = useCallback(
    (questions: AssignmentQuestion[], assignment: { time_limit_minutes?: number }): void => {
      const codebustersQuotes: QuoteData[] = questions.map(
        (q: AssignmentQuestion, index: number) => ({
          id: q.id || `assignment-${index}`,
          quote: q.quote || q.question_text || "",
          author: q.author || "Unknown",
          cipherType: (q.cipherType || "Random Aristocrat") as QuoteData["cipherType"],
          difficulty: typeof q.difficulty === "number" ? q.difficulty : undefined,
          division: q.division || "C",
          charLength: q.charLength || 100,
          encrypted: q.encrypted || "",
          key: q.key || "",
          hint: q.hint || "",
          solution:
            typeof q.solution === "object" && q.solution !== null
              ? (q.solution as { [key: string]: string })
              : typeof q.correct_answer === "object" && q.correct_answer !== null
                ? (q.correct_answer as { [key: string]: string })
                : undefined,
        })
      );
      setQuotes(codebustersQuotes);
      setAssignmentTimeLimit(assignment);
      setIsLoading(false);
    },
    [setQuotes, setAssignmentTimeLimit, setIsLoading]
  );

  const handleLoadAssignmentQuestions = useCallback(
    async (assignmentId: string) => {
      try {
        const response = await fetch(`/api/assignments/${assignmentId}`);
        if (!response.ok) {
          setError("Failed to load assignment");
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        const assignment = data.assignment;
        const questions = assignment.questions;
        if (!questions || questions.length === 0) {
          setError("No questions found in this assignment");
          setIsLoading(false);
          return;
        }
        const paramsQuestion = questions.find(
          (q: AssignmentQuestion) => q.question_type === "codebusters_params"
        );
        if (paramsQuestion?.parameters) {
          await handleParamsBasedQuestions(paramsQuestion, assignment);
          return;
        }
        handlePreGeneratedQuestions(questions, assignment);
      } catch (_error) {
        setError("Failed to load assignment");
        setIsLoading(false);
      }
    },
    [setError, setIsLoading, handleParamsBasedQuestions, handlePreGeneratedQuestions]
  );

  return {
    handleLoadAssignmentQuestions,
  };
}
