"use client";
import { useTheme } from '@/app/contexts/ThemeContext';

export function DocsHomeClient() {
  const { darkMode } = useTheme();
  const subtleText = darkMode ? 'text-gray-300' : 'text-black';
  const badgeBg = darkMode ? 'dark:bg-yellow-900/40' : 'bg-yellow-100';
  const badgeText = darkMode ? 'dark:text-yellow-300' : 'text-yellow-800';
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-bold text-black dark:text-gray-100">Scio.ly Docs</h1>
      <p className={subtleText}>A superior wiki for the 2026 season – curated resources, rules pointers, and printable notesheets.</p>
      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeBg} ${badgeText}`}>In alpha development</span>
    </header>
  );
}


