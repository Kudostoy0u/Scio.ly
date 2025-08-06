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
}

// Extend window interface for event subtopics mapping
declare global {
  interface Window {
    eventSubtopicsMapping?: Record<string, string[]>;
  }
} 