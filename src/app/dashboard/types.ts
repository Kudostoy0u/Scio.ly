import { User } from '@supabase/supabase-js';

export interface ContactFormData {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export interface DailyData {
  date: string;
  count: number;
}

export interface WeeklyData {
  questions: DailyData[];
  accuracy: number;
}

export interface HistoricalMetrics {
  questionsAttempted: number;
  correctAnswers: number;
  eventsPracticed: string[];
}

export interface Metrics {
  questionsAttempted: number;
  correctAnswers: number;
  eventsPracticed: string[];
  accuracy: number;
}

export interface WelcomeMessageProps {
  darkMode: boolean;
  currentUser: User | null;
  setDarkMode: (value: boolean) => void;
  greetingName?: string;
}

export interface NumberAnimationProps {
  value: number;
  className: string;
}

export interface AnimatedAccuracyProps {
  value: number;
  darkMode: boolean;
  className?: string;
} 