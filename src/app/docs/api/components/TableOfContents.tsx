"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import type React from "react";

export type TocSection = { id: string; title: string; icon: React.ReactNode };

type Props = {
  sections: TocSection[];
  activeSection: string;
  onSelect: (id: string) => void;
};

export default function TableOfContents({ sections, activeSection, onSelect }: Props) {
  const { darkMode } = useTheme();
  return (
    <div
      className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg shadow-sm border p-6 mb-8`}
    >
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
        📋 Table of Contents
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
              activeSection === section.id
                ? darkMode
                  ? "bg-blue-900 text-blue-200"
                  : "bg-blue-100 text-blue-800"
                : darkMode
                  ? "hover:bg-gray-700"
                  : "hover:bg-gray-100"
            }`}
          >
            {section.icon}
            <span className="font-medium">{section.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
