'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import SectionHeader from './SectionHeader';
import Endpoint from '../components/Endpoint';
import Param from '../components/Param';
import Example from '../components/Example';

export default function SharingSection() {
  const { darkMode } = useTheme();
  return (
    <div id="sharing">
      <SectionHeader icon={<Users className="w-6 h-6" />} title="Sharing & Codes" id="sharing" />
      
      <div className="space-y-6">
        <Endpoint 
          method="GET" 
          url="/api/share" 
          description="Retrieve shared test data by code for collaborative testing."
          features={['Sharing']}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
              <div className="space-y-2">
                <Param name="code" type="string" required description="6-character share code" />
              </div>
            </div>

            <Example title="Request" variant="request">
GET /api/share?code=ABC123
            </Example>

            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "questions": [...],
    "metadata": {
      "event": "Chemistry Lab",
      "division": "C",
      "tournament": "MIT Invitational 2024"
    }
  }
}`}
            </Example>
          </div>
        </Endpoint>

        <Endpoint 
          method="POST" 
          url="/api/share/generate" 
          description="Generate a shareable code for test data."
          features={['Sharing', 'Code Generation']}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="questions" type="array" required description="Array of question objects to share" />
                <Param name="metadata" type="object" description="Optional metadata about the test" />
              </div>
            </div>

            <Example title="Request" variant="request">
{`{
  "questions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "question": "What is the chemical formula for water?",
      "options": ["H2O", "CO2", "NaCl", "CH4"],
      "answers": ["H2O"]
    }
  ],
  "metadata": {
    "event": "Chemistry Lab",
    "division": "C"
  }
}`}
            </Example>

            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "code": "ABC123",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}`}
            </Example>
          </div>
        </Endpoint>

        <Endpoint 
          method="GET" 
          url="/api/codebusters/share" 
          description="Retrieve Codebusters-specific shared content."
          features={['Sharing', 'Codebusters']}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
              <div className="space-y-2">
                <Param name="code" type="string" required description="Share code for Codebusters content" />
              </div>
            </div>

            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "cipher": "Caesar",
    "text": "Encrypted message here",
    "key": "3"
  }
}`}
            </Example>
          </div>
        </Endpoint>

        <Endpoint 
          method="POST" 
          url="/api/codebusters/share/generate" 
          description="Generate Codebusters-specific share codes."
          features={['Sharing', 'Codebusters', 'Code Generation']}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="cipher" type="string" required description="Type of cipher (Caesar, Vigenere, etc.)" />
                <Param name="text" type="string" required description="Encrypted text" />
                <Param name="key" type="string" description="Encryption key" />
              </div>
            </div>

            <Example title="Request" variant="request">
{`{
  "cipher": "Caesar",
  "text": "Khoor Zruog",
  "key": "3"
}`}
            </Example>

            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "code": "XYZ789",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}`}
            </Example>
          </div>
        </Endpoint>

        <Endpoint 
          method="GET" 
          url="/api/questions/base52" 
          description="Retrieve a question by its base52 code."
          features={['Sharing', 'Base52']}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
              <div className="space-y-2">
                <Param name="code" type="string" required description="5-character base52 code" />
              </div>
            </div>

            <Example title="Request" variant="request">
GET /api/questions/base52?code=ABC12
            </Example>

            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "question": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "question": "What is the chemical formula for water?",
      "tournament": "MIT Invitational 2024",
      "division": "C",
      "event": "Chemistry Lab",
      "options": ["H2O", "CO2", "NaCl", "CH4"],
      "answers": ["H2O"],
      "subtopics": ["molecular formulas"],
      "difficulty": 0.3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    "table": "questions"
  }
}`}
            </Example>
          </div>
        </Endpoint>

        <Endpoint 
          method="POST" 
          url="/api/questions/base52" 
          description="Generate base52 codes for multiple questions."
          features={['Sharing', 'Base52', 'Code Generation']}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="questionIds" type="string[]" required description="Array of question UUIDs" />
                <Param name="table" type="string" description="Table name: 'questions' or 'idEvents' (default: 'questions')" />
              </div>
            </div>

            <Example title="Request" variant="request">
{`{
  "questionIds": ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
  "table": "questions"
}`}
            </Example>

            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "codes": {
      "550e8400-e29b-41d4-a716-446655440000": "ABC12",
      "550e8400-e29b-41d4-a716-446655440001": "DEF34"
    },
    "table": "questions"
  }
}`}
            </Example>
          </div>
        </Endpoint>
      </div>
    </div>
  );
}


