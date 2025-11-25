import type React from "react";

interface AboutSectionProps {
  darkMode: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AboutSection({ darkMode, children, className = "" }: AboutSectionProps) {
  return (
    <section
      className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto ${darkMode ? "bg-gray-800/50 backdrop-blur-sm" : "bg-white/90 shadow-lg backdrop-blur-sm"} ${className}`}
    >
      {children}
    </section>
  );
}
