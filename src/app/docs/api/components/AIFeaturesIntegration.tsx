"use client";

import { useTheme } from "@/app/contexts/themeContext";
import CollapsibleExample from "@/app/docs/api/components/CollapsibleExample";

export default function AIFeaturesIntegration() {
  const { darkMode } = useTheme();
  return (
    <div
      className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"} p-6 mb-6`}
    >
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
        🤖 AI Features Integration
      </h3>

      <div className="space-y-6">
        <div>
          <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            AI Question Suggestions
          </h4>
          <p className={`text-sm mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Use <code>/api/gemini/suggest-edit</code> to get AI suggestions for improving questions:
          </p>
          <CollapsibleExample title="Question Improvement Service" variant="request">
            {`// Service for AI question suggestions
async function getSuggestionForQuestion(question, userReason = '', apiKey) {
  const response = await fetch('/api/gemini/suggest-edit', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, userReason })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to get suggestion');
  return data.data;
}
`}
          </CollapsibleExample>
        </div>

        <div>
          <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            Complete Integration Example
          </h4>
          <p className={`text-sm mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            A complete example combining question fetching, explanations, and AI suggestions:
          </p>
          <CollapsibleExample title="Complete Question Management App" variant="request">
            {`// Complete question management component
function QuestionManagementApp({ apiKey }) {
  const [selectedEvent, setSelectedEvent] = useState('Chemistry Lab');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState([]);
  const { questions, loading: questionsLoading, updateFilters } = useQuestions(apiKey, { event: selectedEvent, limit: 20 });
  const { explanation, loading: explanationLoading, getExplanation } = useExplanation();
  const { suggestions, loading: suggestionLoading, getSuggestion } = useQuestionSuggestions(apiKey);
  // ... handlers omitted for brevity ...
}
`}
          </CollapsibleExample>
        </div>
      </div>
    </div>
  );
}
