/**
 * Practice system type definitions for Science Olympiad platform
 * Comprehensive type definitions for the practice test system
 */

/**
 * Science Olympiad event interface
 * Represents a Science Olympiad event with its metadata
 */
export interface Event {
  /** Unique event identifier */
  id: number;
  /** Event display name */
  name: string;
  /** Subject/category of the event */
  subject: string;
  /** Optional divisions this event is available for */
  divisions?: string[];
  /** Optional event description */
  description?: string;
}

/**
 * Practice test settings interface
 * Defines all configurable parameters for practice tests
 */
export interface Settings {
  /** Number of questions in the test */
  questionCount: number;
  /** Time limit in minutes */
  timeLimit: number;
  /** Array of difficulty levels */
  difficulties: string[];
  /** Question type (multiple-choice, free-response, etc.) */
  types: string;
  /** Division (B or C) */
  division: string;
  /** Tournament name */
  tournament: string;
  /** Array of subtopics to include */
  subtopics: string[];
  /** Optional percentage of ID questions */
  idPercentage?: number;
  /** Optional minimum character length for quotes */
  charLengthMin?: number;
  /** Optional maximum character length for quotes */
  charLengthMax?: number;
  /** Optional flag for pure ID questions only */
  pureIdOnly?: boolean;
  /** Optional filter for Rocks and Minerals: 'rock', 'mineral', or undefined for both */
  rmTypeFilter?: "rock" | "mineral";
}

/**
 * Global window interface extension
 * Adds platform-specific properties to the global window object
 */
declare global {
  interface Window {
    /** Optional mapping of events to their subtopics */
    eventSubtopicsMapping?: Record<string, string[]>;
  }
}
