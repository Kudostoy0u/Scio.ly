import type React from "react";

interface TestActionButtonsProps {
  isSubmitted: boolean;
  onNext: () => void;
  onSubmit: () => void;
  darkMode: boolean;
  hasAnswer: boolean;
}

const TestActionButtons: React.FC<TestActionButtonsProps> = ({
  isSubmitted,
  onNext,
  onSubmit,
  darkMode,
  hasAnswer,
}) => {
  return (
    <div className="text-center">
      {isSubmitted ? (
        <button
          type="button"
          onClick={onNext}
          className={`w-full px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
            darkMode
              ? "bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200"
              : "bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600"
          }`}
        >
          Next Question
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          className={`w-full px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
            darkMode
              ? "bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200"
              : "bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600"
          }`}
        >
          {hasAnswer ? "Check Answer" : "Skip Question"}
        </button>
      )}
    </div>
  );
};

export default TestActionButtons;
