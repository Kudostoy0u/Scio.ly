export interface Event {
  id: number;
  name: string;
  subject: string;
  divisions?: string[];
  description?: string;
}

export interface Settings {
  questionCount: number;
  timeLimit: number;
  difficulties: string[];
  types: string;
  division: string;
  tournament: string;
  subtopics: string[];
  idPercentage?: number; // Rocks & Minerals: % of ID questions
  charLengthMin?: number; // Codebusters: minimum character length for quotes
  charLengthMax?: number; // Codebusters: maximum character length for quotes
}

// Extend window interface for event subtopics mapping
declare global {
  interface Window {
    eventSubtopicsMapping?: Record<string, string[]>;
  }
} 