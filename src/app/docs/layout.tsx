"use client";
import type { ReactNode } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';

export default function DocsLayout({ children }: { children: ReactNode }) {
  const { darkMode } = useTheme();
  const textClass = darkMode ? 'text-gray-100' : 'text-black';
  const borderColor = darkMode ? 'border-gray-800' : 'border-gray-200';
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-white';

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <Header />
      <section className={`max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16 ${textClass}`}>
        {/* Optional container accent to mirror dashboard cards */}
        <div className={`[&_.card]:rounded-lg [&_.card]:border ${borderColor}`}>
          {children}
        </div>
      </section>
    </div>
  );
}