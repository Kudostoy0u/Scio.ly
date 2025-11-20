import type { Question } from "@/app/utils/geminiService";

export type EditPayload = {
  originalQuestion: Question;
  editedQuestion: Question;
  reason: string;
  event?: string;
  bypass: boolean;
  aiSuggestion?: {
    question: string;
    options?: string[];
    answers: string[];
    answerIndices?: number[];
  };
};

export function buildEditPayload(params: {
  originalQuestion: Question;
  editedQuestion: Question;
  reason: string;
  eventName?: string;
  aiBypass?: boolean;
  aiSuggestion?: {
    question: string;
    options?: string[];
    answers: string[];
    answerIndices?: number[];
  };
}): EditPayload {
  return {
    originalQuestion: params.originalQuestion,
    editedQuestion: params.editedQuestion,
    reason: params.reason,
    event: params.eventName,
    bypass: !!params.aiBypass,
    aiSuggestion: params.aiSuggestion,
  };
}
