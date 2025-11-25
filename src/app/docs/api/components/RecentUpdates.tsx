"use client";

import { useTheme } from "@/app/contexts/themeContext";

export default function RecentUpdates() {
  const { darkMode } = useTheme();
  return (
    <div
      className={`${darkMode ? "bg-blue-900" : "bg-blue-50"} rounded-lg border ${darkMode ? "border-blue-700" : "border-blue-200"} p-4 mb-6`}
    >
      <h3 className={`text-lg font-semibold mb-2 ${darkMode ? "text-blue-100" : "text-blue-900"}`}>
        🔄 Recent API Updates
      </h3>
      <p className={`text-sm ${darkMode ? "text-blue-200" : "text-blue-800"}`}>
        <strong>Simplified Explanations API:</strong> The AI explanations endpoint has been
        streamlined to use simple JSON request/response patterns. Streaming functionality has been
        removed for improved reliability and easier integration. See the{" "}
        <a href="#ai" className="underline font-medium">
          AI-Powered Features
        </a>{" "}
        section for details.
      </p>
    </div>
  );
}
