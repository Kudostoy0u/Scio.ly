'use client';

import { useState } from 'react';
import { ExternalLink, Code, Database, Zap, Shield, Users, MessageSquare, FileText } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import Endpoint from './components/Endpoint';
import Param from './components/Param';
import Example from './components/Example';
import Schema from './components/Schema';
import { InfoBox, WarningBox } from './components/InfoBox';



const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; id: string }> = ({ icon, title, id }) => {
  const { darkMode } = useTheme();
  
  return (
    <h2 id={id} className={`flex items-center gap-3 text-2xl font-bold mt-8 mb-6 pb-2 border-b ${
      darkMode ? 'text-gray-100 border-gray-700' : 'text-gray-900 border-gray-200'
    }`}>
      {icon}
      {title}
    </h2>
  );
};

export default function ApiDocsClient() {
  const { darkMode } = useTheme();
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: <Database className="w-6 h-6" /> },
    { id: 'authentication', title: 'Authentication', icon: <Shield className="w-6 h-6" /> },
    { id: 'questions', title: 'Question Management', icon: <FileText className="w-6 h-6" /> },
    { id: 'metadata', title: 'Metadata & Statistics', icon: <Code className="w-6 h-6" /> },
    { id: 'sharing', title: 'Collaborative Testing', icon: <Users className="w-6 h-6" /> },
    { id: 'quotes', title: 'Quotes Management', icon: <MessageSquare className="w-6 h-6" /> },
    { id: 'ai', title: 'AI-Powered Features', icon: <Zap className="w-6 h-6" /> },
    { id: 'moderation', title: 'Content Moderation', icon: <Shield className="w-6 h-6" /> },
    { id: 'system', title: 'System Endpoints', icon: <ExternalLink className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            🧪 Science Olympiad API Documentation
          </h1>
          <p className={`text-xl max-w-3xl mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Comprehensive REST API for Science Olympiad question management, AI-powered features, 
            collaborative testing, and content moderation
          </p>
        </div>

        {/* Info Box */}
        <InfoBox>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Base URL:</strong> <code className={`${darkMode ? 'bg-blue-800' : 'bg-blue-100'} px-2 py-1 rounded`}>https://scio.ly</code><br />
              <strong>API Version:</strong> 1.0.0<br />
              <strong>Content-Type:</strong> application/json
            </div>
            <div>
              <strong>Authentication:</strong> API key required for most endpoints<br />
              <strong>Rate Limiting:</strong> AI endpoints have rate limiting<br />
              <strong>CORS:</strong> Enabled for cross-origin requests
            </div>
          </div>
        </InfoBox>

        {/* Navigation */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6 mb-8`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>📋 Table of Contents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                {section.icon}
                <span className="font-medium">{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Overview Section */}
          <div id="overview">
            <SectionHeader icon={<Database className="w-6 h-6" />} title="Overview" id="overview" />
            
            <div className="space-y-6">
              <div>
                <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Response Format</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  All endpoints return JSON responses with consistent structure:
                </p>
                <Schema title="Standard Response Schema">
{`{
  "success": boolean,           // Always present
  "data": any,                 // Present on success
  "message": string,           // Optional success message
  "error": string             // Present on error
}`}
                </Schema>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Example title="Success Response Example" variant="response">
{`{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}`}
                </Example>
                <Example title="Error Response Example" variant="request">
{`{
  "success": false,
  "error": "Invalid request parameters"
}`}
                </Example>
              </div>

              <div>
                <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Data Types</h3>
                <div className="space-y-4">
                  <Schema title="Question Object">
{`{
  "id": "uuid",                    // Unique identifier
  "question": "string",            // Question text
  "tournament": "string",          // Tournament name
  "division": "string",            // Division (B, C, B/C)
  "event": "string",               // Event name
  "options": ["string"],           // Multiple choice options
  "answers": ["string" | "number"], // Correct answers
  "subtopics": ["string"],         // Related subtopics
  "difficulty": number,            // 0.0-1.0 scale
  "imageData": "string",           // Optional CDN URL
  "created_at": "ISO8601",         // Creation timestamp
  "updated_at": "ISO8601",         // Last update timestamp
  "base52": "string"               // 5-character lookup code
}`}
                  </Schema>

                  <Schema title="ID Question Object">
{`{
  "id": "uuid",                    // Unique identifier
  "question": "string",            // Question text
  "tournament": "string",          // Tournament name
  "division": "string",            // Division (B, C, B/C)
  "event": "string",               // Event name
  "options": ["string"],           // Multiple choice options
  "answers": ["string" | "number"], // Correct answers
  "subtopics": ["string"],         // Related subtopics
  "difficulty": number,            // 0.0-1.0 scale
  "images": ["string"],            // Array of CDN URLs
  "created_at": "ISO8601",         // Creation timestamp
  "updated_at": "ISO8601"          // Last update timestamp
}`}
                  </Schema>
                </div>
              </div>
            </div>
          </div>

          {/* Authentication Section */}
          <div id="authentication">
            <SectionHeader icon={<Shield className="w-6 h-6" />} title="Authentication" id="authentication" />
            
            <div className="space-y-6">
              <div>
                <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>API Key Authentication</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Most API endpoints require authentication using API keys. API keys are provided on request - please contact us at team.scio.ly@gmail.com to request an API key.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Authentication Methods</h4>
                    <p className={`mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      All requests must include your API key using one of these methods:
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>✅ Recommended: Headers</h5>
                        <Example title="Headers" variant="request">
{`X-API-Key: your-api-key-here
Authorization: Bearer your-api-key-here`}
                        </Example>
                      </div>
                      
                      <div>
                        <h5 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>⚠️ Not Recommended: Query Parameter</h5>
                        <WarningBox>
                          <strong>Security Warning:</strong> Query parameters may be logged in server logs, browser history, and proxy logs. Use headers when possible.
                        </WarningBox>
                        <Example title="Query Parameter" variant="request">
{`GET /api/questions?api_key=your-api-key-here&event=Chemistry%20Lab`}
                        </Example>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>cURL Examples</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>✅ Recommended: Using Headers</h5>
                        <Example title="API Request with Headers" variant="request">
{`curl -H "X-API-Key: your-api-key" \\
     https://scio.ly/api/questions?event=Chemistry%20Lab`}
                        </Example>
                      </div>
                      
                      <div>
                        <h5 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>⚠️ Not Recommended: Using Query Parameter</h5>
                        <Example title="API Request with Query Parameter" variant="request">
{`curl "https://scio.ly/api/questions?event=Chemistry%20Lab&api_key=your-api-key"`}
                        </Example>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Public Endpoints</h4>
                    <p className={`mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      The following endpoints do not require authentication:
                    </p>
                    <ul className={`space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <li>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>GET /api/docs</code> - API documentation</li>
                      <li>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>GET /api/meta/events</code> - List all events</li>
                      <li>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>GET /api/meta/tournaments</code> - List all tournaments</li>
                      <li>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>GET /api/meta/subtopics</code> - List all subtopics</li>
                      <li>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>GET /api/meta/stats</code> - Database statistics</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Error Response</h4>
                    <p className={`mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      When API key is missing or invalid:
                    </p>
                    <Example title="Error Response" variant="response">
{`{
  "success": false,
  "error": "API_KEY_REQUIRED",
  "message": "Valid API key required. Contact us at team.scio.ly@gmail.com to request an API key."
}`}
                    </Example>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Management Section */}
          <div id="questions">
            <SectionHeader icon={<FileText className="w-6 h-6" />} title="Question Management" id="questions" />
            
            <div className="space-y-6">
              <Endpoint 
                method="GET" 
                url="/api/questions" 
                description="Retrieve questions with advanced filtering and two-phase random selection for optimal performance."
                features={['Filtering', 'Pagination']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
                    <div className="space-y-2">
                      <Param name="event" type="string" description="Filter by event name (exact match)" />
                      <Param name="division" type="string" description="Filter by division (B, C, B/C)" />
                      <Param name="tournament" type="string" description="Filter by tournament (partial match, case-insensitive)" />
                      <Param name="subtopic" type="string" description="Filter by single subtopic" />
                      <Param name="subtopics" type="string" description="Filter by multiple subtopics (comma-separated)" />
                      <Param name="difficulty_min" type="float" description="Minimum difficulty (0.0-1.0)" />
                      <Param name="difficulty_max" type="float" description="Maximum difficulty (0.0-1.0)" />
                      <Param name="question_type" type="enum" description="Filter by type: 'mcq' (multiple choice) or 'frq' (free response)" />
                      <Param name="limit" type="integer" description="Maximum questions to return (default: 50, max: 200)" />
                    </div>
                  </div>

                  <Example title="Example Request" variant="request">
GET /api/questions?event=Chemistry%20Lab&division=C&question_type=mcq&limit=10
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "question": "What is the chemical formula for water?",
      "tournament": "MIT Invitational 2024",
      "division": "C",
      "event": "Chemistry Lab",
      "options": ["H2O", "CO2", "NaCl", "CH4"],
      "answers": ["H2O"],
      "subtopics": ["molecular formulas", "compounds"],
      "difficulty": 0.3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "base52": "ABC12"
    }
  ]
}`}
                  </Example>

                  <InfoBox>
                    <strong>Performance Notes:</strong> Uses indexed random selection with fallback to ORDER BY RANDOM(). 
                    Two-phase selection ensures even distribution across the dataset.
                  </InfoBox>
                </div>
              </Endpoint>

              <Endpoint 
                method="POST" 
                url="/api/questions" 
                description="Create a new question with validation and automatic ID generation."
                features={['Create']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
                    <div className="space-y-2">
                      <Param name="question" type="string" required description="Question text (min length: 1)" />
                      <Param name="tournament" type="string" required description="Tournament name (min length: 1)" />
                      <Param name="division" type="string" required description="Division (min length: 1)" />
                      <Param name="event" type="string" required description="Event name (min length: 1)" />
                      <Param name="options" type="string[]" description="Multiple choice options (default: [])" />
                      <Param name="answers" type="(string|number)[]" description="Correct answers (default: [])" />
                      <Param name="subtopics" type="string[]" description="Related subtopics (default: [])" />
                      <Param name="difficulty" type="number" description="Difficulty (0.0-1.0, default: 0.5)" />
                    </div>
                  </div>

                  <Example title="Request Example" variant="request">
{`{
  "question": "What is the atomic number of carbon?",
  "tournament": "MIT Invitational 2024",
  "division": "C",
  "event": "Chemistry Lab",
  "options": ["4", "6", "8", "12"],
  "answers": ["6"],
  "subtopics": ["atomic structure", "periodic table"],
  "difficulty": 0.4
}`}
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "question": "What is the atomic number of carbon?",
    "tournament": "MIT Invitational 2024",
    "division": "C",
    "event": "Chemistry Lab",
    "options": ["4", "6", "8", "12"],
    "answers": ["6"],
    "subtopics": ["atomic structure", "periodic table"],
    "difficulty": 0.4,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "base52": "DEF34"
  },
  "message": "Question created successfully"
}`}
                  </Example>
                </div>
              </Endpoint>

              <Endpoint 
                method="POST" 
                url="/api/questions/batch" 
                description="Fetch multiple questions by IDs, including both regular questions and ID questions with images."
                features={['Batch', 'ID Questions']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
                    <div className="space-y-2">
                      <Param name="ids" type="string[]" required description="Array of question UUIDs to fetch" />
                    </div>
                  </div>

                  <Example title="Request Example" variant="request">
{`{
  "ids": ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
}`}
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "question": "What is the chemical formula for water?",
      "tournament": "MIT Invitational 2024",
      "division": "C",
      "event": "Chemistry Lab",
      "options": ["H2O", "CO2", "NaCl"],
      "answers": ["H2O"],
      "subtopics": ["molecular formulas"],
      "difficulty": 0.3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "base52": "ABC12"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "question": "Identify this rock sample",
      "tournament": "MIT Invitational 2024",
      "division": "C",
      "event": "Rocks and Minerals",
      "options": ["Granite", "Basalt", "Marble"],
      "answers": ["Granite"],
      "subtopics": ["igneous rocks"],
      "difficulty": 0.6,
      "imageData": "https://cdn.example.com/rock-sample-1.jpg",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "base52": "DEF34"
    }
  ]
}`}
                  </Example>

                  <InfoBox>
                    <strong>Features:</strong> Automatically searches both regular questions and ID questions tables. 
                    Returns questions in the same order as requested IDs. ID questions include imageData field.
                  </InfoBox>
                </div>
              </Endpoint>

              <Endpoint 
                method="GET" 
                url="/api/id-questions" 
                description="Retrieve identification questions with images (e.g., Rocks and Minerals, Entomology)."
                features={['ID Questions', 'Images']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
                    <div className="space-y-2">
                      <Param name="event" type="string" description="Filter by event name (exact match)" />
                      <Param name="division" type="string" description="Filter by division (B, C, B/C)" />
                      <Param name="subtopic" type="string" description="Filter by single subtopic" />
                      <Param name="subtopics" type="string" description="Filter by multiple subtopics (comma-separated)" />
                      <Param name="difficulty_min" type="float" description="Minimum difficulty (0.0-1.0)" />
                      <Param name="difficulty_max" type="float" description="Maximum difficulty (0.0-1.0)" />
                      <Param name="limit" type="integer" description="Maximum questions to return (default: 50, max: 200)" />
                    </div>
                  </div>

                  <Example title="Example Request" variant="request">
GET /api/id-questions?event=Rocks%20and%20Minerals&division=C&limit=10
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "question": "Identify this rock sample",
      "tournament": "MIT Invitational 2024",
      "division": "C",
      "event": "Rocks and Minerals",
      "options": ["Granite", "Basalt", "Marble", "Limestone"],
      "answers": ["Granite"],
      "subtopics": ["igneous rocks", "plutonic"],
      "difficulty": 0.6,
      "images": [
        "https://cdn.example.com/rock-sample-1.jpg",
        "https://cdn.example.com/rock-sample-1-closeup.jpg"
      ],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}`}
                  </Example>

                  <InfoBox>
                    <strong>Features:</strong> Uses the same two-phase random selection as regular questions. 
                    Each question includes an images array with CDN URLs for identification.
                  </InfoBox>
                </div>
              </Endpoint>
            </div>
          </div>

          {/* Metadata Section */}
          <div id="metadata">
            <SectionHeader icon={<Code className="w-6 h-6" />} title="Metadata & Statistics" id="metadata" />
            
            <div className="space-y-6">
              <Endpoint 
                method="GET" 
                url="/api/meta/events" 
                description="Get all available Science Olympiad events in alphabetical order."
              >
                <Example title="Response" variant="response">
{`{
  "success": true,
  "data": [
    "Anatomy and Physiology",
    "Astronomy",
    "Chemistry Lab",
    "Codebusters",
    "Dynamic Planet",
    "Experimental Design"
  ]
}`}
                </Example>
              </Endpoint>

              <Endpoint 
                method="GET" 
                url="/api/meta/tournaments" 
                description="Get all tournament names in the database, sorted by frequency."
              >
                <Example title="Response" variant="response">
{`{
  "success": true,
  "data": [
    "MIT Invitational 2024",
    "Princeton Invitational 2024",
    "Yale Invitational 2024",
    "National Tournament 2023"
  ]
}`}
                </Example>
              </Endpoint>

              <Endpoint 
                method="GET" 
                url="/api/meta/subtopics" 
                description="Get all subtopics, optionally filtered by event."
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
                    <div className="space-y-2">
                      <Param name="event" type="string" description="Filter subtopics by specific event" />
                    </div>
                  </div>

                  <Example title="Example" variant="request">
GET /api/meta/subtopics?event=Chemistry%20Lab
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": [
    "atomic structure",
    "molecular formulas",
    "periodic table",
    "reactions",
    "stoichiometry"
  ]
}`}
                  </Example>
                </div>
              </Endpoint>

              <Endpoint 
                method="GET" 
                url="/api/meta/stats" 
                description="Get comprehensive database statistics including total questions and breakdowns."
              >
                <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "total": 15420,
    "byEvent": [
      {"event": "Chemistry Lab", "count": "2340"},
      {"event": "Anatomy and Physiology", "count": "1890"},
      {"event": "Codebusters", "count": "1560"}
    ],
    "byDivision": [
      {"division": "C", "count": "8920"},
      {"division": "B", "count": "6500"}
    ]
  }
}`}
                </Example>
              </Endpoint>
            </div>
          </div>

          {/* AI Features Section */}
          <div id="ai">
            <SectionHeader icon={<Zap className="w-6 h-6" />} title="AI-Powered Features" id="ai" />
            
            <WarningBox>
              <strong>Rate Limiting:</strong> AI endpoints have rate limiting applied. Please implement appropriate retry logic with exponential backoff.
            </WarningBox>

            <div className="space-y-6">
              <Endpoint 
                method="POST" 
                url="/api/gemini/suggest-edit" 
                description="Get AI suggestions for improving question quality, clarity, and accuracy."
                features={['AI Assistant']}
              >
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
    "reasoning": "Using 'dihydrogen monoxide' makes the question more challenging...",
    "confidence": 0.85
  }
}`}
                  </Example>
                </div>
              </Endpoint>

              <Endpoint 
                method="POST" 
                url="/api/gemini/analyze-question" 
                description="AI analysis of question quality, potential issues, and improvement areas."
                features={['Quality Control']}
              >
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

              <Endpoint 
                method="POST" 
                url="/api/gemini/explain" 
                description="Generate detailed explanations for questions and answers to aid learning."
                features={['Learning Aid']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
                    <div className="space-y-2">
                      <Param name="question" type="object" required description="Question object to explain" />
                      <Param name="userAnswer" type="any" description="User's answer for personalized feedback" />
                      <Param name="event" type="string" description="Event context for better explanations" />
                      <Param name="streaming" type="boolean" description="Enable streaming response" />
                    </div>
                  </div>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "explanation": "Water (H2O) is composed of two hydrogen atoms...",
    "conceptBreakdown": ["Molecular structure", "Chemical bonding"],
    "relatedTopics": ["Polar molecules", "Hydrogen bonding"],
    "difficultyExplanation": "This is a fundamental concept in chemistry..."
  }
}`}
                  </Example>
                </div>
              </Endpoint>

              <Endpoint 
                method="POST" 
                url="/api/gemini/grade-free-responses" 
                description="Automatically grade free-response questions using AI analysis."
                features={['Auto-Grading']}
              >
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
        "feedback": "Good understanding of the basic process...",
        "keyPoints": ["light energy ✓", "CO2 ✓", "glucose - partially mentioned"],
        "suggestions": ["Include the role of chlorophyll"]
      }
    ]
  }
}`}
                  </Example>
                </div>
              </Endpoint>
            </div>
          </div>

          {/* System Endpoints Section */}
          <div id="system">
            <SectionHeader icon={<ExternalLink className="w-6 h-6" />} title="System Endpoints" id="system" />
            
            <div className="space-y-6">
              <Endpoint 
                method="POST" 
                url="/api/contact" 
                description="Submit contact form messages with rate limiting and Discord webhook integration."
                features={['Contact']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
                    <div className="space-y-2">
                      <Param name="name" type="string" required description="Contact name" />
                      <Param name="email" type="string" required description="Contact email" />
                      <Param name="topic" type="string" description="Message topic (default: 'general')" />
                      <Param name="message" type="string" required description="Message content" />
                    </div>
                  </div>

                  <Example title="Request Example" variant="request">
{`{
  "name": "John Doe",
  "email": "john@example.com",
  "topic": "Bug Report",
  "message": "I found an issue with the Chemistry Lab questions..."
}`}
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "message": "Message sent successfully!"
}`}
                  </Example>

                  <InfoBox>
                    <strong>Rate Limiting:</strong> 10 requests per minute per IP address.<br />
                    <strong>Integration:</strong> Messages are sent to Discord webhook for team notification.
                  </InfoBox>
                </div>
              </Endpoint>

              <Endpoint 
                method="GET" 
                url="/api/health" 
                description="Health check endpoint for monitoring system status and database connectivity."
              >
                <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "database": "connected",
    "version": "1.0.0"
  }
}`}
                </Example>
              </Endpoint>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-16 pt-8 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Error Codes</h3>
                <div className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>400</code> - Bad Request (invalid parameters)</div>
                <div>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>404</code> - Not Found (resource doesn&apos;t exist)</div>
                <div>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>429</code> - Too Many Requests (rate limit exceeded)</div>
                <div>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>500</code> - Internal Server Error</div>
                <div>• <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded`}>503</code> - Service Unavailable (AI service down)</div>
              </div>
            </div>
                          <div>
                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Best Practices</h3>
                <div className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div>• Implement exponential backoff for rate-limited endpoints</div>
                <div>• Cache metadata endpoints (events, tournaments, subtopics)</div>
                <div>• Use appropriate limits to avoid overwhelming the system</div>
                <div>• Handle errors gracefully with user-friendly messages</div>
                <div>• Validate input data before sending requests</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
