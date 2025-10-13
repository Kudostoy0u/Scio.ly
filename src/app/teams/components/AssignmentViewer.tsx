"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'free_response' | 'codebusters';
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  correct_answer?: string;
  points: number;
  order_index: number;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  assignment_type: string;
  due_date?: string;
  points: number;
  is_required: boolean;
  max_attempts?: number;
  created_at: string;
  questions: Question[];
  user_submission?: {
    status: string;
    submitted_at: string;
    grade?: number;
    attempt_number: number;
  };
}

interface AssignmentViewerProps {
  assignment: Assignment;
  onSubmissionComplete: (submission: any) => void;
  darkMode?: boolean;
}

export default function AssignmentViewer({
  assignment,
  onSubmissionComplete,
  darkMode = false
}: AssignmentViewerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize timer if assignment has time limit
  useEffect(() => {
    if (assignment.questions.length > 0 && !startTime) {
      setStartTime(new Date());
    }
  }, [assignment.questions.length, startTime]);

  // Timer countdown
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setTimeLeft(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleResponse = (questionId: string, response: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < assignment.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitAssignment = async () => {
    if (Object.keys(responses).length === 0) {
      setError('Please answer at least one question');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const responseData = Object.entries(responses).map(([questionId, response]) => ({
        question_id: questionId,
        response_text: response.text || response,
        response_data: response.data || null
      }));

      const timeTaken = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0;

      const response = await fetch(`/api/teams/${assignment.id}/assignments/${assignment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: responseData,
          time_taken_seconds: timeTaken
        })
      });

      if (response.ok) {
        const data = await response.json();
        onSubmissionComplete(data.submission);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit assignment');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      setError('Failed to submit assignment');
    }
    setSubmitting(false);
  };

  const currentQ = assignment.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / assignment.questions.length) * 100;

  return (
    <div className={`max-w-4xl mx-auto p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {assignment.title}
        </h1>
        {assignment.description && (
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {assignment.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4 text-sm">
            <span className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {assignment.questions.length} questions
            </span>
            {assignment.due_date && (
              <span className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {assignment.user_submission && (
              <div className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                <div>Submitted</div>
                {assignment.user_submission.grade && (
                  <div>{assignment.user_submission.grade}%</div>
                )}
              </div>
            )}
            
            {timeLeft !== null && (
              <div className={`text-sm font-medium ${timeLeft > 1800 ? 'text-green-600' : timeLeft > 300 ? 'text-yellow-600' : 'text-red-600'}`}>
                Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className={`w-full bg-gray-200 rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>Question {currentQuestion + 1} of {assignment.questions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Question */}
      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`p-6 border rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Question {currentQuestion + 1} ({currentQ.question_type.replace('_', ' ')})
            </span>
          </div>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentQ.question_text}
          </h3>
        </div>

        {/* Multiple Choice */}
        {currentQ.question_type === 'multiple_choice' && currentQ.options && (
          <div className="space-y-2">
            {currentQ.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  responses[currentQ.id]?.text === option.id
                    ? 'bg-blue-100 border-blue-300'
                    : darkMode
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question_${currentQ.id}`}
                  value={option.id}
                  checked={responses[currentQ.id]?.text === option.id}
                  onChange={(e) => handleResponse(currentQ.id, { text: e.target.value })}
                  className="mr-3"
                />
                <span className="font-medium mr-2">{option.id}.</span>
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {/* Free Response */}
        {currentQ.question_type === 'free_response' && (
          <div>
            <textarea
              value={responses[currentQ.id]?.text || ''}
              onChange={(e) => handleResponse(currentQ.id, { text: e.target.value })}
              placeholder="Enter your answer here..."
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg resize-none ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
        )}

        {/* Codebusters */}
        {currentQ.question_type === 'codebusters' && (
          <div>
            <textarea
              value={responses[currentQ.id]?.text || ''}
              onChange={(e) => handleResponse(currentQ.id, { text: e.target.value })}
              placeholder="Enter your codebusters answer here..."
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg resize-none font-mono ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Enter the decoded message or cipher type
            </p>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
          className={`px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            darkMode
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Previous
        </button>

        <div className="flex items-center space-x-2">
          {assignment.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium ${
                index === currentQuestion
                  ? 'bg-blue-600 text-white'
                  : responses[assignment.questions[index].id]
                  ? 'bg-green-100 text-green-700'
                  : darkMode
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestion === assignment.questions.length - 1 ? (
          <button
            onClick={submitAssignment}
            disabled={submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Assignment'}
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>

      {/* Response Summary */}
      <div className="mt-6 p-4 border rounded-lg">
        <h4 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Response Summary
        </h4>
        <div className="text-sm">
          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            Answered: {Object.keys(responses).length} / {assignment.questions.length} questions
          </span>
        </div>
      </div>
    </div>
  );
}
