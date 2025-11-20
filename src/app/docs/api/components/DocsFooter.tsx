"use client";

import { useTheme } from "@/app/contexts/ThemeContext";

export default function DocsFooter() {
  const { darkMode } = useTheme();
  return (
    <div className={`mt-16 pt-8 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            Error Codes
          </h3>
          <div className={`space-y-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            <div>
              •{" "}
              <code className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}>
                400
              </code>{" "}
              - Bad Request (invalid parameters)
            </div>
            <div>
              •{" "}
              <code className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}>
                404
              </code>{" "}
              - Not Found (resource doesn&apos;t exist)
            </div>
            <div>
              •{" "}
              <code className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}>
                429
              </code>{" "}
              - Too Many Requests (rate limit exceeded)
            </div>
            <div>
              •{" "}
              <code className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}>
                500
              </code>{" "}
              - Internal Server Error
            </div>
            <div>
              •{" "}
              <code className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}>
                503
              </code>{" "}
              - Service Unavailable (AI service down)
            </div>
          </div>
        </div>
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            Best Practices
          </h3>
          <div className={`space-y-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            <div>• Implement exponential backoff for rate-limited endpoints</div>
            <div>• Cache metadata endpoints (events, tournaments, subtopics)</div>
            <div>• Use appropriate limits to avoid overwhelming the system</div>
            <div>• Handle errors gracefully with user-friendly messages</div>
            <div>• Validate input data before sending requests</div>
          </div>
        </div>
      </div>
    </div>
  );
}
