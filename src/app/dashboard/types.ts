import type { User } from "@supabase/supabase-js";

/**
 * Dashboard type definitions for Science Olympiad platform
 * Comprehensive type definitions for the dashboard system
 */

/**
 * Contact form data interface
 * Contains all fields for contact form submissions
 */
export interface ContactFormData {
  /** Contact person's name */
  name: string;
  /** Contact person's email */
  email: string;
  /** Contact topic/subject */
  topic: string;
  /** Contact message */
  message: string;
}

/**
 * Daily data interface for analytics
 * Represents daily activity metrics
 */
export interface DailyData {
  /** Date string */
  date: string;
  /** Activity count for the day */
  count: number;
}

/**
 * Weekly data interface for analytics
 * Contains weekly activity and accuracy metrics
 */
export interface WeeklyData {
  /** Array of daily question data */
  questions: DailyData[];
  /** Weekly accuracy percentage */
  accuracy: number;
}

/**
 * Historical metrics interface
 * Contains user's historical performance data
 */
export interface HistoricalMetrics {
  /** Total questions attempted */
  questionsAttempted: number;
  /** Total correct answers */
  correctAnswers: number;
  /** Events that have been practiced */
  eventsPracticed: string[];
}

/**
 * Current metrics interface
 * Contains current user performance metrics
 */
export interface Metrics {
  /** Total questions attempted */
  questionsAttempted: number;
  /** Total correct answers */
  correctAnswers: number;
  /** Events that have been practiced */
  eventsPracticed: string[];
  /** Current accuracy percentage */
  accuracy: number;
}

/**
 * Welcome message component props
 * Props for the dashboard welcome message component
 */
export interface WelcomeMessageProps {
  /** Whether dark mode is enabled */
  darkMode: boolean;
  /** Current authenticated user */
  currentUser: User | null;
  /** Function to set dark mode */
  setDarkMode: (value: boolean) => void;
  /** Optional greeting name */
  greetingName?: string;
  /** Optional loading state */
  isLoading?: boolean;
}

/**
 * Number animation component props
 * Props for animated number display components
 */
export interface NumberAnimationProps {
  /** Numeric value to animate */
  value: number;
  /** CSS class name for styling */
  className: string;
}

/**
 * Animated accuracy component props
 * Props for animated accuracy display components
 */
export interface AnimatedAccuracyProps {
  /** Accuracy value to display */
  value: number;
  /** Whether dark mode is enabled */
  darkMode: boolean;
  /** Optional CSS class name */
  className?: string;
}
