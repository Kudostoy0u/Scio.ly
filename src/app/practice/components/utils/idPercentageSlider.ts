import type { Settings } from "@/app/practice/types";

export function calculateIdPercentageValue(settings: Settings): number {
  const questionCount = Number.isNaN(settings.questionCount)
    ? 1
    : Math.max(1, settings.questionCount);
  return Math.round(((settings.idPercentage ?? 0) * questionCount) / 100);
}

export function calculateIdPercentageFromValue(value: number, questionCount: number): number {
  return Math.round((value / questionCount) * 100);
}

export function getSliderBackground(darkMode: boolean, settings: Settings): string {
  const questionCount = Number.isNaN(settings.questionCount)
    ? 1
    : Math.max(1, settings.questionCount);
  const percentage = Math.round(((settings.idPercentage ?? 0) * questionCount) / 100);
  const fillPercentage = (percentage / questionCount) * 100;
  const color = darkMode ? "#3b82f6" : "#2563eb";
  const trackColor = darkMode ? "#4b5563" : "#e5e7eb";
  return `linear-gradient(to right, ${color} 0%, ${color} ${fillPercentage}%, ${trackColor} ${fillPercentage}%, ${trackColor} 100%)`;
}

export function getPictureQuestionsDisplay(settings: Settings): string {
  const questionCount = Number.isNaN(settings.questionCount)
    ? 1
    : Math.max(1, settings.questionCount);
  return `${Math.round(((settings.idPercentage ?? 0) * questionCount) / 100)}/${questionCount}`;
}
