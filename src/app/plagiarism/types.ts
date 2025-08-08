'use client';

export interface ExtractedQuestion {
  question: string;
  options: string[] | null;
  type: 'mcq' | 'frq';
}

export interface ProcessedQuestions {
  questions: ExtractedQuestion[];
}

export interface OfficialQuestion {
  id: string;
  question: string;
  options: string[];
  answers: string[];
  tournament: string;
  division: string;
  event: string;
  subtopics: string[];
  difficulty: number | string;
}

export interface PlagiarismMatch {
  inputQuestion: ExtractedQuestion;
  matchedQuestion: OfficialQuestion;
  similarity: number;
  matchType: 'question' | 'options';
}

export interface QuestionPlagiarismSummary {
  question: ExtractedQuestion;
  questionIndex: number;
  matches: PlagiarismMatch[];
  highRiskMatches: PlagiarismMatch[];
  mediumRiskMatches: PlagiarismMatch[];
  lowRiskMatches: PlagiarismMatch[];
  totalMatches: number;
  highestSimilarity: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: QuestionPlagiarismSummary | null;
}


