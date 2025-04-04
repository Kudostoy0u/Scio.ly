'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import Link from 'next/link';

// Add Question interface
interface Question {
  question: string;
  options?: string[];
  answers: (number | string)[];
  difficulty: number;
}

// Helper function to parse question data
const parseQuestion = (questionData: string | unknown): Question | null => {
  if (typeof questionData === 'string') {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(questionData);
      
      // If parsed is an object with a 'question' property, it's likely a question object
      if (typeof parsed === 'object' && parsed !== null && 'question' in parsed) {
        return {
          question: parsed.question,
          options: parsed.options || [],
          answers: parsed.answers || [],
          difficulty: typeof parsed.difficulty === 'number' ? parsed.difficulty : 0.5
        };
      }
      
      // Otherwise, treat the parsed value as the question text
      return {
        question: parsed,
        answers: [],
        difficulty: 0.5
      };
    } catch {
      // If not valid JSON, return a simple question object
      return {
        question: questionData,
        answers: [],
        difficulty: 0.5
      };
    }
  } else if (typeof questionData === 'object' && questionData !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = questionData as any;
    return {
      question: q.question || 'Unknown question',
      options: q.options || [],
      answers: q.answers || [],
      difficulty: typeof q.difficulty === 'number' ? q.difficulty : 0.5
    };
  }
  return null;
};

// Component for blacklisted questions to avoid double box effect
const BlacklistedQuestionCard = ({ questionData, darkMode }: { 
  questionData: string | unknown, 
  darkMode: boolean
}) => {
  const question = parseQuestion(questionData);
  
  if (!question) {
    return (
      <div className={`p-4 rounded-md ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
        Invalid question format
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-lg mb-2">Question</h3>
      <p className="mb-4 break-words whitespace-normal overflow-x-auto">
        {question.question}
      </p>

      {question.options && question.options.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Options:</h4>
          <div className="space-y-2">
            {question.options.map((option, idx) => {
              const isCorrect = question.answers.includes(idx + 1) || 
                               (typeof question.answers[0] === 'string' && 
                                question.answers.includes(option));
              
              return (
                <div 
                  key={idx} 
                  className={`p-2 rounded-md ${
                    darkMode 
                      ? isCorrect ? 'bg-green-800/30' : 'bg-gray-600' 
                      : isCorrect ? 'bg-green-100' : 'bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{idx + 1}.</span>
                  {option}
                  {isCorrect && (
                    <span className={`ml-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
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
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-green-800/30' : 'bg-green-100'
          }`}>
            {Array.isArray(question.answers) 
              ? question.answers.join(', ')
              : String(question.answers)}
          </div>
        </div>
      )}

      {question.difficulty !== undefined && (
        <div className="mt-4 flex items-center">
          <span className="text-sm">Difficulty: </span>
          <div className="ml-2 w-24 h-2 bg-gray-300 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                question.difficulty < 0.3 
                  ? 'bg-green-500' 
                  : question.difficulty < 0.7 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{ width: `${question.difficulty * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-xs">
            {question.difficulty < 0.3 
              ? 'Easy' 
              : question.difficulty < 0.7 
                ? 'Medium' 
                : 'Hard'} ({Math.round(question.difficulty * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
};

// Component to render a question card
const QuestionCard = ({ questionData, darkMode, type = 'normal', className }: { 
  questionData: string | unknown, 
  darkMode: boolean, 
  type?: 'normal' | 'original' | 'edited',
  className?: string
}) => {
  const question = parseQuestion(questionData);
  
  if (!question) {
    return (
      <div className={`p-4 rounded-md ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
        Invalid question format
      </div>
    );
  }

  // Use a simpler style for the card
  return (
    <div className={`${
      darkMode
        ? 'text-white'
        : 'text-black'
    } ${type === 'original' ? 'original-question' : type === 'edited' ? 'edited-question' : ''} ${className || ''}`}>
      <h3 className="font-semibold text-lg mb-2">Question</h3>
      <p className="mb-4 break-words whitespace-normal overflow-x-auto">
        {question.question}
      </p>

      {question.options && question.options.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Options:</h4>
          <div className="space-y-2">
            {question.options.map((option, idx) => {
              const isCorrect = question.answers.includes(idx + 1) || 
                               (typeof question.answers[0] === 'string' && 
                                question.answers.includes(option));
              
              return (
                <div 
                  key={idx} 
                  className={`p-2 rounded-md ${
                    darkMode 
                      ? isCorrect ? 'bg-green-800/30' : 'bg-gray-600' 
                      : isCorrect ? 'bg-green-100' : 'bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{idx + 1}.</span>
                  {option}
                  {isCorrect && (
                    <span className={`ml-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
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
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-green-800/30' : 'bg-green-100'
          }`}>
            {Array.isArray(question.answers) 
              ? question.answers.join(', ')
              : String(question.answers)}
          </div>
        </div>
      )}

      {question.difficulty !== undefined && (
        <div className="mt-4 flex items-center">
          <span className="text-sm">Difficulty: </span>
          <div className="ml-2 w-24 h-2 bg-gray-300 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                question.difficulty < 0.3 
                  ? 'bg-green-500' 
                  : question.difficulty < 0.7 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{ width: `${question.difficulty * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-xs">
            {question.difficulty < 0.3 
              ? 'Easy' 
              : question.difficulty < 0.7 
                ? 'Medium' 
                : 'Hard'} ({Math.round(question.difficulty * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
};

export default function ReportsPage() {
  const { darkMode } = useTheme();
  const [blacklistedQuestions, setBlacklistedQuestions] = useState<Record<string, string[]>>({});
  const [editedQuestions, setEditedQuestions] = useState<Record<string, Array<{original: string, edited: string, timestamp: string}>>>({});
  const [activeTab, setActiveTab] = useState<'blacklisted' | 'edited'>('blacklisted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch blacklisted questions
        const blacklistResponse = await fetch('/api/report/blacklist');
        if (!blacklistResponse.ok) {
          throw new Error('Failed to fetch blacklisted questions');
        }
        const blacklistData = await blacklistResponse.json();
        setBlacklistedQuestions(blacklistData.blacklists || {});

        // Fetch edited questions
        const editedResponse = await fetch('/api/report/edited');
        if (!editedResponse.ok) {
          throw new Error('Failed to fetch edited questions');
        }
        const editedData = await editedResponse.json();
        setEditedQuestions(editedData.edits || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const cardBgColor = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const secondaryTextColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const mutedTextColor = darkMode ? 'text-gray-400' : 'text-gray-500';
  const tabActiveColor = darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600';
  const tabInactiveColor = darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700';
  const headerBgColor = darkMode ? 'bg-gray-800' : 'bg-white';
  const headerBorderColor = darkMode ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgColor} ${textColor}`}>
      <div className="container mx-auto px-4 py-12">
        {/* Header section with enhanced design */}
        <div className={`${headerBgColor} rounded-lg shadow-lg border-l-4 ${darkMode ? 'border-l-blue-500' : 'border-l-blue-600'} border ${headerBorderColor} p-8 mb-8`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <div className="flex items-center mb-4">
                <Link href="/dashboard" className={`inline-flex items-center mr-4 px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors duration-200`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold">Question Reports</h1>
              </div>
              <p className={`${secondaryTextColor} max-w-2xl mb-3`}>
                Thanks to all of our users for helping us maintain and improve our question bank. 
                Your reports make Science Olympiad practice better for everyone!
              </p>
              <div className={`${darkMode ? 'bg-blue-900/30 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'} border px-4 py-3 rounded-md mt-2`}>
                <div className="flex">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">
                    Please keep reports concise and clear! This helps our team process them more efficiently.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
            </div>
          </div>
        </div>

        {/* Tabs with elevated card */}
        <div className={`${cardBgColor} rounded-lg shadow-md border ${borderColor} overflow-hidden mb-8`}>
          <div className={`flex border-b ${borderColor}`}>
            <button
              className={`py-3 px-6 font-medium transition-colors duration-200 ${activeTab === 'blacklisted' ? tabActiveColor + ' border-b-2' : tabInactiveColor}`}
              onClick={() => setActiveTab('blacklisted')}
            >
              Blacklisted Questions
            </button>
            <button
              className={`py-3 px-6 font-medium transition-colors duration-200 ${activeTab === 'edited' ? tabActiveColor + ' border-b-2' : tabInactiveColor}`}
              onClick={() => setActiveTab('edited')}
            >
              Edited Questions
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className={mutedTextColor}>Loading reports...</p>
              </div>
            ) : error ? (
              <div className={`${darkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'} border ${darkMode ? 'border-red-800' : 'border-red-400'} px-6 py-4 rounded-md`}>
                <p className="font-medium">Error loading reports</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            ) : (
              <div>
                {activeTab === 'blacklisted' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-semibold">Blacklisted Questions</h2>
                      <div className={`px-4 py-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${mutedTextColor} text-sm`}>
                        {Object.values(blacklistedQuestions).flat().length} Questions
                      </div>
                    </div>
                    
                    {Object.keys(blacklistedQuestions).length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-16 ${mutedTextColor}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg">No blacklisted questions found.</p>
                        <p className="text-sm mt-2">Questions reported for removal will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(blacklistedQuestions).map(([event, questions]) => (
                          <div key={event} className={`${cardBgColor} border ${borderColor} rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md`}>
                            <div className="flex items-center mb-4 pb-2 border-b border-dashed border-gray-300">
                              <h3 className="text-lg font-medium">{event}</h3>
                              <span className={`ml-3 px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${mutedTextColor}`}>
                                {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {questions.map((question, index) => (
                                <div key={index} className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} p-4 rounded-md border-l-4 ${darkMode ? 'border-red-600' : 'border-red-500'}`}>
                                  <BlacklistedQuestionCard 
                                    questionData={question} 
                                    darkMode={darkMode} 
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'edited' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-semibold">Edited Questions</h2>
                      <div className={`px-4 py-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${mutedTextColor} text-sm`}>
                        {Object.values(editedQuestions).flat().length} Edits
                      </div>
                    </div>
                    
                    {Object.keys(editedQuestions).length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-16 ${mutedTextColor}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <p className="text-lg">No edited questions found.</p>
                        <p className="text-sm mt-2">Questions that have been edited will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(editedQuestions).map(([event, edits]) => (
                          <div key={event} className={`${cardBgColor} border ${borderColor} rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md`}>
                            <div className="flex items-center mb-4 pb-2 border-b border-dashed border-gray-300">
                              <h3 className="text-lg font-medium">{event}</h3>
                              <span className={`ml-3 px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${mutedTextColor}`}>
                                {edits.length} {edits.length === 1 ? 'Edit' : 'Edits'}
                              </span>
                            </div>
                            <div className="space-y-6">
                              {edits.map((edit, index) => (
                                <div key={index} className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} p-5 rounded-md`}>
                                  <div className="mb-3 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className={`text-xs ${mutedTextColor}`}>
                                      Edited on {formatDate(edit.timestamp)}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <h4 className={`text-sm font-medium ${mutedTextColor} mb-2 flex items-center`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Original
                                      </h4>
                                      <div className={`${cardBgColor} p-4 rounded-md border ${borderColor} shadow-sm`}>
                                        <QuestionCard 
                                          questionData={edit.original} 
                                          darkMode={darkMode} 
                                          type="original" 
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className={`text-sm font-medium ${mutedTextColor} mb-2 flex items-center`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Edited
                                      </h4>
                                      <div className={`${cardBgColor} p-4 rounded-md border ${darkMode ? 'border-green-700' : 'border-green-300'} shadow-sm`}>
                                        <QuestionCard 
                                          questionData={edit.edited} 
                                          darkMode={darkMode} 
                                          type="edited" 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Thank you message at the bottom */}
        <div className={`${cardBgColor} rounded-lg p-6 border ${borderColor} shadow-sm text-center mb-8`}>
          <h3 className="text-xl font-semibold mb-2">Community-Driven Quality</h3>
          <p className={secondaryTextColor}>
            Your reports help us maintain the highest quality question bank for Science Olympiad students.
            Together, we&apos;re building a better resource for everyone.
          </p>
        </div>
      </div>
    </div>
  );
} 