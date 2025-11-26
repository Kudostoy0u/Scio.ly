interface Question {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "free_response" | "codebusters";
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  correct_answer?: string;
  points: number;
  order_index: number;
}

interface QuestionRendererProps {
  question: Question;
  responses: Record<string, { text?: string; data?: unknown }>;
  onResponse: (questionId: string, response: { text?: string; data?: unknown }) => void;
  darkMode: boolean;
}

export default function QuestionRenderer({
  question,
  responses,
  onResponse,
  darkMode,
}: QuestionRendererProps) {
  const baseInputClasses = `w-full px-3 py-2 border rounded-lg resize-none ${
    darkMode
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
  }`;

  switch (question.question_type) {
    case "multiple_choice":
      return question.options ? (
        <div className="space-y-2">
          {question.options.map((option, index: number) => (
            <label
              key={`option-${option.id || index}-${String(option.text || option.id).slice(0, 20)}`}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                responses[question.id]?.text === option.id
                  ? "bg-blue-100 border-blue-300"
                  : darkMode
                    ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                    : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name={`question_${question.id}`}
                value={option.id}
                checked={
                  (responses[question.id] as { text?: string } | undefined)?.text === option.id
                }
                onChange={() => onResponse(question.id, { text: option.id })}
                className="mr-3"
              />
              <span className="font-medium mr-2">{option.id}.</span>
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      ) : null;

    case "free_response":
      return (
        <div>
          <textarea
            value={(responses[question.id] as { text?: string } | undefined)?.text || ""}
            onChange={(e) => onResponse(question.id, { text: e.target.value })}
            placeholder="Enter your answer here..."
            rows={6}
            className={baseInputClasses}
          />
        </div>
      );

    case "codebusters":
      return (
        <div>
          <textarea
            value={(responses[question.id] as { text?: string } | undefined)?.text || ""}
            onChange={(e) => onResponse(question.id, { text: e.target.value })}
            placeholder="Enter your codebusters answer here..."
            rows={4}
            className={`${baseInputClasses} font-mono`}
          />
          <p className={`text-xs mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Enter the decoded message or cipher type
          </p>
        </div>
      );

    default:
      return null;
  }
}
