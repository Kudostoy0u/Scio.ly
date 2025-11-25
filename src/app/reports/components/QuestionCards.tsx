"use client";
// biome-ignore lint/style/useFilenamingConvention: Component file follows PascalCase convention
import { parseQuestion } from "@/app/reports/utils/parseQuestion";

export const BlacklistedQuestionCard = ({
  questionData,
  darkMode,
}: { questionData: string | unknown; darkMode: boolean }) => {
  const question = parseQuestion(questionData);
  if (!question) {
    return (
      <div
        className={`p-4 rounded-md ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}
      >
        Invalid question format
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-semibold text-lg mb-2">Question</h3>
      <p className="mb-4 break-words whitespace-normal overflow-x-auto">{question.question}</p>
      {question.options && question.options.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Options:</h4>
          <div className="space-y-2">
            {question.options.map((option, idx) => {
              const isCorrect =
                question.answers.includes(idx) ||
                (typeof question.answers[0] === "string" && question.answers.includes(option));
              return (
                <div
                  key={`option-${idx}-${String(option).slice(0, 20)}`}
                  className={`p-2 rounded-md ${darkMode ? (isCorrect ? "bg-green-800/30" : "bg-gray-600") : isCorrect ? "bg-green-100" : "bg-gray-200"}`}
                >
                  <span className="mr-2">{idx + 1}.</span>
                  {option}
                  {isCorrect && (
                    <span className={`ml-2 ${darkMode ? "text-green-400" : "text-green-600"}`}>
                      ✓ Correct
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(!question.options || question.options.length === 0) && question.answers.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Answer:</h4>
          <div className={`p-2 rounded-md ${darkMode ? "bg-green-800/30" : "bg-green-100"}`}>
            {Array.isArray(question.answers)
              ? question.answers.join(", ")
              : String(question.answers)}
          </div>
        </div>
      )}
      {question.difficulty !== undefined && (
        <div className="mt-4 flex items-center">
          <span className="text-sm">Difficulty: </span>
          <div className="ml-2 w-24 h-2 bg-gray-300 rounded-full overflow-hidden">
            <div
              className={`h-full ${question.difficulty < 0.3 ? "bg-green-500" : question.difficulty < 0.7 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${question.difficulty * 100}%` }}
            />
          </div>
          <span className="ml-2 text-xs">
            {question.difficulty < 0.3 ? "Easy" : question.difficulty < 0.7 ? "Medium" : "Hard"} (
            {Math.round(question.difficulty * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
};

export const QuestionCard = ({
  questionData,
  darkMode,
  type = "normal",
  className,
}: {
  questionData: string | unknown;
  darkMode: boolean;
  type?: "normal" | "original" | "edited";
  className?: string;
}) => {
  const question = parseQuestion(questionData);
  if (!question) {
    return (
      <div
        className={`p-4 rounded-md ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}
      >
        Invalid question format
      </div>
    );
  }
  return (
    <div
      className={`${darkMode ? "text-white" : "text-black"} ${type === "original" ? "original-question" : type === "edited" ? "edited-question" : ""} ${className || ""}`}
    >
      <h3 className="font-semibold text-lg mb-2">Question</h3>
      <p className="mb-4 break-words whitespace-normal overflow-x-auto">{question.question}</p>
      {question.options && question.options.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Options:</h4>
          <div className="space-y-2">
            {question.options.map((option, idx) => {
              const isCorrect =
                question.answers.includes(idx) ||
                (typeof question.answers[0] === "string" && question.answers.includes(option));
              return (
                <div
                  key={`option-${idx}-${String(option).slice(0, 20)}`}
                  className={`p-2 rounded-md ${darkMode ? (isCorrect ? "bg-green-800/30" : "bg-gray-600") : isCorrect ? "bg-green-100" : "bg-gray-200"}`}
                >
                  <span className="mr-2">{idx + 1}.</span>
                  {option}
                  {isCorrect && (
                    <span className={`ml-2 ${darkMode ? "text-green-400" : "text-green-600"}`}>
                      ✓ Correct
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(!question.options || question.options.length === 0) && question.answers.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Answer:</h4>
          <div className={`p-2 rounded-md ${darkMode ? "bg-green-800/30" : "bg-green-100"}`}>
            {Array.isArray(question.answers)
              ? question.answers.join(", ")
              : String(question.answers)}
          </div>
        </div>
      )}
      {question.difficulty !== undefined && (
        <div className="mt-4 flex items-center">
          <span className="text-sm">Difficulty: </span>
          <div className="ml-2 w-24 h-2 bg-gray-300 rounded-full overflow-hidden">
            <div
              className={`h-full ${question.difficulty < 0.3 ? "bg-green-500" : question.difficulty < 0.7 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${question.difficulty * 100}%` }}
            />
          </div>
          <span className="ml-2 text-xs">
            {question.difficulty < 0.3 ? "Easy" : question.difficulty < 0.7 ? "Medium" : "Hard"} (
            {Math.round(question.difficulty * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
};
