'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import SectionHeader from './SectionHeader';
import Endpoint from '../components/Endpoint';
import Param from '../components/Param';
import Example from '../components/Example';
// import CollapsibleExample from '../components/CollapsibleExample';
import { WarningBox } from '../components/InfoBox';

export default function AISection() {
  const { darkMode } = useTheme();
  return (
    <div id="ai">
      <SectionHeader icon={<Zap className="w-6 h-6" />} title="AI-Powered Features" id="ai" />
      
      <WarningBox>
        <strong>Rate Limiting:</strong> AI endpoints have rate limiting applied. Please implement appropriate retry logic with exponential backoff.
      </WarningBox>

      <div className="space-y-6">
        <Endpoint method="POST" url="/api/gemini/suggest-edit" description="Get AI suggestions for improving question quality, clarity, and accuracy." features={['AI']}>
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="question" type="object" required description="Question object to analyze" />
                <Param name="userReason" type="string" description="User's reason for requesting edit" />
              </div>
            </div>
            <Example title="Request Example" variant="request">
{`{
  "question": {
    "question": "What is the chemical formula for water?",
    "options": ["H2O", "CO2", "NaCl"],
    "answers": ["H2O"]
  },
  "userReason": "Make the question more challenging"
}`}
            </Example>
            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "suggestedQuestion": "What is the molecular formula for dihydrogen monoxide?",
    "suggestedOptions": ["H2O", "H2O2", "H2SO4", "H3PO4"],
    "suggestedAnswers": ["H2O"],
    "suggestedDifficulty": 0.4
  }
}`}
            </Example>
          </div>
        </Endpoint>

        <Endpoint method="POST" url="/api/gemini/analyze-question" description="AI analysis of question quality, potential issues, and improvement areas." features={['AI']}>
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="question" type="object" required description="Question object to analyze" />
              </div>
            </div>
            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "qualityScore": 0.78,
    "issues": ["Ambiguous wording in option C"],
    "suggestions": ["Clarify the question stem"],
    "difficultyAssessment": "Medium",
    "contentAccuracy": 0.95
  }
}`}
            </Example>
          </div>
        </Endpoint>

        <Endpoint method="POST" url="/api/gemini/explain" description="Generate AI-powered explanations for Science Olympiad questions to aid learning and understanding." features={['AI']}>
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="question" type="object" required description="Complete question object with text, options, answers, and optional imageData" />
                <Param name="userAnswer" type="any" description="User's submitted answer for personalized feedback (optional)" />
                <Param name="event" type="string" required description="Science Olympiad event name for context-aware explanations" />
              </div>
            </div>
            <Example title="Request Example" variant="request">
{`{
  "question": {
    "question": "What is the chemical formula for water?",
    "options": ["H2O", "CO2", "O2", "H2"],
    "answers": [0],
    "imageData": "data:image/jpeg;base64,..." // optional
  },
  "userAnswer": ["H2O"],
  "event": "Chemistry Lab"
}`}
            </Example>
            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "explanation": "...",
    "correctIndices": [0],
    "correctedAnswers": ["H2O"]
  }
}`}
            </Example>
            <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h5 className={`font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Response Fields</h5>
              <div className="space-y-2 text-sm">
                <div><strong>explanation</strong> - Detailed educational explanation with formatting</div>
                <div><strong>correctIndices</strong> - Zero-based indices for MCQ</div>
                <div><strong>correctedAnswers</strong> - Correct answer strings for FRQ</div>
              </div>
            </div>
          </div>
        </Endpoint>

        <Endpoint method="POST" url="/api/gemini/grade-free-responses" description="Automatically grade free-response questions using AI analysis." features={['AI']}>
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="responses" type="array" required description="Array of response objects" />
              </div>
            </div>
            <Example title="Request Example" variant="request">
{`{
  "responses": [
    {
      "question": "Explain the process of photosynthesis",
      "correctAnswers": ["light energy", "CO2", "glucose"],
      "studentAnswer": "Plants use sunlight to make food from carbon dioxide"
    }
  ]
}`}
            </Example>
            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "grades": [
      {
        "score": 0.8,
        "feedback": "Good understanding...",
        "keyPoints": ["light energy ✓", "CO2 ✓", "glucose - partially mentioned"],
        "suggestions": ["Include the role of chlorophyll"]
      }
    ]
  }
}`}
            </Example>
          </div>
        </Endpoint>

        <Endpoint method="POST" url="/api/gemini/validate-edit" description="Validate question edits using AI analysis to ensure quality and accuracy." features={['AI']}>
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="originalQuestion" type="object" required description="Original question object" />
                <Param name="editedQuestion" type="object" required description="Edited question object" />
                <Param name="event" type="string" required description="Science Olympiad event name" />
                <Param name="reason" type="string" required description="Reason for the edit" />
              </div>
            </div>
            <Example title="Request Example" variant="request">
{`{
  "originalQuestion": {
    "question": "What is the chemical formula for water?",
    "options": ["H2O", "CO2", "NaCl"],
    "answers": ["H2O"]
  },
  "editedQuestion": {
    "question": "What is the molecular formula for dihydrogen monoxide?",
    "options": ["H2O", "CO2", "NaCl"],
    "answers": ["H2O"]
  },
  "event": "Chemistry Lab",
  "reason": "Make the question more challenging"
}`}
            </Example>
            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "isValid": true,
    "reason": "Edit improves question clarity and maintains scientific accuracy",
    "confidence": 0.85
  }
}`}
            </Example>
          </div>
        </Endpoint>
      </div>
    </div>
  );
}


