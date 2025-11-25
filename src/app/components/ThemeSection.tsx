"use client";

import { useTheme } from "@/app/contexts/themeContext";
import type React from "react";

type ThemeSectionProps = {
  className?: string;
  children: React.ReactNode;
};

export default function ThemeSection({ className = "", children }: ThemeSectionProps) {
  const { darkMode } = useTheme();
  const base = darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  return <div className={`${base} ${className}`}>{children}</div>;
}
