"use client";

import { useTheme } from "@/app/contexts/themeContext";
import CollapsibleExample from "@/app/docs/api/components/CollapsibleExample";

export default function QuestionManagementGuide() {
  const { darkMode } = useTheme();
  return (
    <div
      className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"} p-6 mb-6`}
    >
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
        📚 Question Management APIs
      </h3>

      <div className="space-y-6">
        <div>
          <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            Fetching Questions
          </h4>
          <p className={`text-sm mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Use the <code>/api/questions</code> endpoint to retrieve filtered questions with
            pagination:
          </p>
          <CollapsibleExample title="Question Fetching Service" variant="request">
            {`// Service for fetching questions with filters
class QuestionService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://scio.ly/api';
  }

  async getQuestions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.event) params.append('event', filters.event);
    if (filters.division) params.append('division', filters.division);
    if (filters.tournament) params.append('tournament', filters.tournament);
    if (filters.subtopics) params.append('subtopics', filters.subtopics.join(','));
    if (filters.difficulty_min) params.append('difficulty_min', filters.difficulty_min);
    if (filters.difficulty_max) params.append('difficulty_max', filters.difficulty_max);
    if (filters.question_type) params.append('question_type', filters.question_type);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await fetch('/api/questions?' + params, {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch questions');
    return data.data;
  }
}
`}
          </CollapsibleExample>
        </div>

        <div>
          <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            React Hook for Questions
          </h4>
          <p className={`text-sm mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Custom React hook for managing question state and fetching:
          </p>
          <CollapsibleExample title="useQuestions Hook" variant="request">
            {`import { useState, useEffect, useCallback } from 'react';

export function useQuestions(apiKey, initialFilters = {}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchQuestions = useCallback(async (newFilters = {}) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    const mergedFilters = { ...filters, ...newFilters };
    for (const [key, value] of Object.entries(mergedFilters)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) params.append(key, value.join(','));
        else params.append(key, String(value));
      }
    }
    const response = await fetch('/api/questions?' + params, {
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch questions');
    setQuestions(data.data);
    setFilters(mergedFilters);
  }, [apiKey, filters]);

  useEffect(() => { if (apiKey) fetchQuestions(); }, [apiKey, fetchQuestions]);
  return { questions, loading, error, filters, updateFilters: (nf) => fetchQuestions(nf), refetch: () => fetchQuestions(filters) };
}
`}
          </CollapsibleExample>
        </div>
      </div>
    </div>
  );
}
