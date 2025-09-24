'use client';

import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import CollapsibleExample from '../components/CollapsibleExample';

export default function ExplanationsGuide() {
  const { darkMode } = useTheme();
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 mb-6`}>
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>🧠 Using the Explanations API</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Basic Usage</h4>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            The explanations API is designed for simple integration. Here&apos;s how to use it in your frontend application:
          </p>
          
          <CollapsibleExample title="JavaScript/TypeScript Example" variant="request">
{`// Function to get explanation for a question
async function getExplanation(question, userAnswer, event) {
  try {
    const response = await fetch('/api/gemini/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question,
        userAnswer: userAnswer,
        event: event
      })
    });

    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        explanation: data.data.explanation,
        correctIndices: data.data.correctIndices,
        correctedAnswers: data.data.correctedAnswers
      };
    } else {
      throw new Error(data.error || 'Failed to get explanation');
    }
  } catch (error) {
    console.error('Error fetching explanation:', error);
    throw error;
  }
}

// Usage example
const question = {
  question: "What is the chemical formula for water?",
  options: ["H2O", "CO2", "O2", "H2"],
  answers: [0]
};

const userAnswer = ["H2O"];
const event = "Chemistry Lab";

try {
  const result = await getExplanation(question, userAnswer, event);
  console.log('Explanation:', result.explanation);
  console.log('Correct indices:', result.correctIndices);
} catch (error) {
  console.error('Failed to get explanation:', error);
}`}
          </CollapsibleExample>
        </div>

        <div>
          <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>React Hook Example</h4>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Here&apos;s how to create a custom React hook for managing explanations:
          </p>
          
          <CollapsibleExample title="Custom React Hook" variant="request">
{`import { useState, useCallback } from 'react';

export function useExplanation() {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getExplanation = useCallback(async (question, userAnswer, event) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          userAnswer,
          event
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setExplanation(data.data.explanation);
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get explanation');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    explanation,
    loading,
    error,
    getExplanation
  };
}

// Usage in component
function QuestionComponent({ question, userAnswer, event }) {
  const { explanation, loading, error, getExplanation } = useExplanation();

  const handleGetExplanation = async () => {
    try {
      await getExplanation(question, userAnswer, event);
    } catch (error) {
      console.error('Failed to get explanation:', error);
    }
  };

  return (
    <div>
      <button 
        onClick={handleGetExplanation}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? 'Loading...' : 'Get Explanation'}
      </button>
      
      {error && (
        <div className="text-red-500 mt-2">{error}</div>
      )}
      
      {explanation && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h4 className="font-semibold mb-2">Explanation:</h4>
          <div className="whitespace-pre-wrap">{explanation}</div>
        </div>
      )}
    </div>
  );
}`}
          </CollapsibleExample>
        </div>

        <div>
          <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Error Handling</h4>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            The API returns structured error responses that you should handle appropriately:
          </p>
          
          <CollapsibleExample title="Error Response Examples" variant="response">
{`// Rate limit exceeded
{
  "success": false,
  "error": "Please wait a moment before requesting another explanation"
}

// Missing required fields
{
  "success": false,
  "error": "Missing required fields: question, event"
}

// Service unavailable
{
  "success": false,
  "error": "Gemini AI not available"
}

// Invalid request
{
  "success": false,
  "error": "Invalid request body"
}`}
          </CollapsibleExample>
        </div>

        <div>
          <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Best Practices</h4>
          <ul className={`text-sm space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <li>• <strong>Rate Limiting:</strong> Implement client-side rate limiting to respect the 2-second delay between requests</li>
            <li>• <strong>Loading States:</strong> Show loading indicators while waiting for explanations</li>
            <li>• <strong>Error Handling:</strong> Display user-friendly error messages for different error types</li>
            <li>• <strong>Caching:</strong> Consider caching explanations to avoid repeated requests for the same question</li>
            <li>• <strong>Progressive Enhancement:</strong> Ensure your app works without explanations if the API is unavailable</li>
            <li>• <strong>Accessibility:</strong> Provide alternative text for users who can&apos;t access explanations</li>
          </ul>
        </div>

        <div>
          <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Rate Limiting Implementation</h4>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Here&apos;s how to implement client-side rate limiting:
          </p>
          
          <CollapsibleExample title="Rate Limiting Hook" variant="request">
{`import { useState, useRef, useCallback } from 'react';

export function useRateLimitedExplanation(delayMs = 2000) {
  const [loading, setLoading] = useState(false);
  const lastCallTime = useRef(0);

  const getExplanation = useCallback(async (question, userAnswer, event) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime.current;
    
    if (timeSinceLastCall < delayMs) {
      const remainingTime = delayMs - timeSinceLastCall;
      throw new Error('Please wait ' + Math.ceil(remainingTime / 1000) + ' seconds before requesting another explanation');
    }

    lastCallTime.current = now;
    setLoading(true);
    
    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          userAnswer,
          event
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get explanation');
      }
    } finally {
      setLoading(false);
    }
  }, [delayMs]);

  return { getExplanation, loading };
}`}
          </CollapsibleExample>
        </div>
      </div>
    </div>
  );
}


