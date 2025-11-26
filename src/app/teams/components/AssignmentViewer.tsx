"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import QuestionRenderer from "./QuestionRenderer";

interface Question {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "free_response" | "codebusters";
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  correct_answer?: string;
  points: number;
  order_index: number;
}

interface ApiQuestion {
  id?: string;
  question?: string;
  type?: "mcq" | "frq" | "codebusters";
  options?: string[];
  answers?: number[]; // indices of correct answers
  points?: number;
  order?: number;
}

// Transform API question format to component format
function transformQuestion(apiQuestion: ApiQuestion): Question {
  const questionType =
    apiQuestion.type === "mcq"
      ? "multiple_choice"
      : apiQuestion.type === "frq"
        ? "free_response"
        : apiQuestion.type === "codebusters"
          ? "codebusters"
          : "free_response";

  let options: Array<{ id: string; text: string; isCorrect: boolean }> | undefined;
  if (apiQuestion.options && Array.isArray(apiQuestion.options)) {
    options = apiQuestion.options.map((opt: string, index: number) => ({
      id: String.fromCharCode(65 + index), // A, B, C, D...
      text: opt,
      isCorrect: apiQuestion.answers?.includes(index) ?? false,
    }));
  }

  return {
    id: apiQuestion.id || "",
    question_text: apiQuestion.question || "",
    question_type: questionType,
    options,
    correct_answer: apiQuestion.answers?.join(", ") || "",
    points: apiQuestion.points || 1,
    order_index: apiQuestion.order || 0,
  };
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
  questions: ApiQuestion[]; // API returns schema format, will be transformed
  user_submission?: {
    status: string;
    submitted_at: string;
    grade?: number;
    attempt_number: number;
  };
}

interface AssignmentViewerProps {
  assignment: Assignment;
  onSubmissionComplete: (submission: {
    assignmentId: string;
    responses: Record<string, unknown>;
    timeSpent: number;
  }) => void;
  darkMode?: boolean;
}

export default function AssignmentViewer({
  assignment,
  onSubmissionComplete,
  darkMode = false,
}: AssignmentViewerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, { text?: string; data?: unknown }>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = assignment.questions.map(transformQuestion);

  // Initialize timer if assignment has time limit
  useEffect(() => {
    if (questions.length > 0 && !startTime) {
      setStartTime(new Date());
    }
  }, [questions.length, startTime]);

  // Timer countdown
  useEffect(() => {
    if (!startTime) {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setTimeLeft(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleResponse = (questionId: string, response: { text?: string; data?: unknown }) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: response,
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const renderAssignmentHeader = () => {
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
          {assignment.title}
        </h1>
        {assignment.description && (
          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            {assignment.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4 text-sm">
            <span className={`px-2 py-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
              {assignment.questions.length} questions
            </span>
            {assignment.due_date && (
              <span className={`px-2 py-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {assignment.user_submission && (
              <div
                className={`text-sm font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}
              >
                <div>Submitted</div>
                {assignment.user_submission?.grade && (
                  <div>{assignment.user_submission.grade}%</div>
                )}
              </div>
            )}

            {timeLeft !== null && (
              <div
                className={`text-sm font-medium ${timeLeft > 1800 ? "text-green-600" : timeLeft > 300 ? "text-yellow-600" : "text-red-600"}`}
              >
                Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div
            className={`w-full bg-gray-200 rounded-full h-2 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
          >
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>
      </div>
    );
  };

  const renderQuestion = (currentQ: Question) => {
    return (
      <QuestionRenderer
        question={currentQ}
        responses={responses}
        onResponse={handleResponse}
        darkMode={darkMode}
      />
    );
  };

  const renderNavigation = () => {
    return (
      <div className="flex justify-between items-center mt-6">
        <button
          type="button"
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
          className={`px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            darkMode
              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Previous
        </button>

        <div className="flex items-center space-x-2">
          {assignment.questions.map((question, index) => (
            <button
              type="button"
              key={`question-${question.id || index}-${index}`}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium ${
                index === currentQuestion
                  ? "bg-blue-600 text-white"
                  : assignment.questions[index]?.id &&
                      responses[assignment.questions[index].id || ""]
                    ? "bg-green-100 text-green-700"
                    : darkMode
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-200 text-gray-600"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestion === assignment.questions.length - 1 ? (
          <button
            type="button"
            onClick={submitAssignment}
            disabled={submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Assignment"}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    );
  };

  const submitAssignment = async () => {
    if (Object.keys(responses).length === 0) {
      setError("Please answer at least one question");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const responseData = Object.entries(responses).map(([questionId, response]) => {
        const responseObj =
          typeof response === "object" &&
          response !== null &&
          !Array.isArray(response) &&
          "text" in response
            ? (response as { text?: string; data?: unknown })
            : null;
        return {
          question_id: questionId,
          response_text:
            responseObj?.text ?? (typeof response === "string" ? response : String(response)),
          response_data: responseObj?.data ?? null,
        };
      });

      const timeTaken = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;

      const response = await fetch(
        `/api/teams/${assignment.id}/assignments/${assignment.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responses: responseData,
            time_taken_seconds: timeTaken,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        onSubmissionComplete(data.submission);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to submit assignment");
      }
    } catch (_error) {
      setError("Failed to submit assignment");
    }
    setSubmitting(false);
  };

  const currentQ = questions[currentQuestion];
  if (!currentQ) {
    return (
      <div className="p-6 border rounded-lg">
        <p className="text-red-600">Error: Question not found</p>
      </div>
    );
  }

  return (
    <div
      className={`max-w-4xl mx-auto p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
    >
      {renderAssignmentHeader()}

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
        className={`p-6 border rounded-lg ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Question {currentQuestion + 1} ({currentQ.question_type.replace("_", " ")})
            </span>
          </div>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
            {currentQ.question_text}
          </h3>
        </div>

        {renderQuestion(currentQ)}
      </motion.div>

      {renderNavigation()}

      {/* Response Summary */}
      <div className="mt-6 p-4 border rounded-lg">
        <h4 className={`font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Response Summary
        </h4>
        <div className="text-sm">
          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
            Answered: {Object.keys(responses).length} / {assignment.questions.length} questions
          </span>
        </div>
      </div>
    </div>
  );
}
