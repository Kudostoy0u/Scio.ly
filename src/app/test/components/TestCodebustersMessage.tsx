import type React from "react";

interface TestCodebustersMessageProps {
  darkMode: boolean;
}

const TestCodebustersMessage: React.FC<TestCodebustersMessageProps> = ({ darkMode }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <p className={`text-xl font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
        No MCQs available for this event
      </p>
      <p className={`text-base ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
        Please select &quot;MCQ + FRQ&quot; in the dashboard to practice this event
      </p>
    </div>
  );
};

export default TestCodebustersMessage;
