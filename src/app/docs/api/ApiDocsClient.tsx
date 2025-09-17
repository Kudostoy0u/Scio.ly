'use client';

import { useState } from 'react';
import { ExternalLink, Code, Database, Zap, Shield, Users, MessageSquare, FileText } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import Endpoint from './components/Endpoint';
import Param from './components/Param';
import Example from './components/Example';
import CollapsibleExample from './components/CollapsibleExample';
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
    { id: 'sharing', title: 'Sharing & Codes', icon: <Users className="w-6 h-6" /> },
    { id: 'quotes', title: 'Quotes Management', icon: <MessageSquare className="w-6 h-6" /> },
    { id: 'ai', title: 'AI-Powered Features', icon: <Zap className="w-6 h-6" /> },
    { id: 'content', title: 'Content Management', icon: <FileText className="w-6 h-6" /> },
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

        {/* Recent Updates */}
        <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg border ${darkMode ? 'border-blue-700' : 'border-blue-200'} p-4 mb-6`}>
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-blue-100' : 'text-blue-900'}`}>🔄 Recent API Updates</h3>
          <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
            <strong>Simplified Explanations API:</strong> The AI explanations endpoint has been streamlined to use simple JSON request/response patterns. 
            Streaming functionality has been removed for improved reliability and easier integration. 
            See the <a href="#ai" className="underline font-medium">AI-Powered Features</a> section for details.
          </p>
        </div>

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

          {/* Sharing & Codes Section */}
          <div id="sharing">
            <SectionHeader icon={<Users className="w-6 h-6" />} title="Sharing & Codes" id="sharing" />
            
            <div className="space-y-6">
              <Endpoint 
                method="GET" 
                url="/api/share" 
                description="Retrieve shared test data by code for collaborative testing."
                features={['Collaborative Testing']}
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
                features={['Code Generation']}
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
                features={['Codebusters']}
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
                features={['Codebusters', 'Code Generation']}
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
            </div>
          </div>

          {/* Quotes Management Section */}
          <div id="quotes">
            <SectionHeader icon={<MessageSquare className="w-6 h-6" />} title="Quotes Management" id="quotes" />
            
            <div className="space-y-6">
              <Endpoint 
                method="GET" 
                url="/api/quotes" 
                description="Retrieve inspirational quotes with filtering options."
                features={['Filtering', 'Character Length']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
                    <div className="space-y-2">
                      <Param name="language" type="string" description="Language filter (default: en)" />
                      <Param name="limit" type="integer" description="Maximum quotes to return" />
                      <Param name="charLengthMin" type="integer" description="Minimum character length" />
                      <Param name="charLengthMax" type="integer" description="Maximum character length" />
                    </div>
                  </div>

                  <Example title="Request" variant="request">
GET /api/quotes?language=en&limit=5&charLengthMin=50&charLengthMax=200
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "quotes": [
      {
        "quote": "The only way to do great work is to love what you do."
      },
      {
        "quote": "Innovation distinguishes between a leader and a follower."
      }
    ]
  }
}`}
                  </Example>
                </div>
              </Endpoint>
            </div>
          </div>

          {/* Content Management Section */}
          <div id="content">
            <SectionHeader icon={<FileText className="w-6 h-6" />} title="Content Management" id="content" />
            
            <div className="space-y-6">
              <Endpoint 
                method="POST" 
                url="/api/upload-image" 
                description="Upload images for questions with validation and CDN storage."
                features={['File Upload', 'Image Processing']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Format</h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Send as multipart/form-data with image file.
                    </p>
                  </div>

                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>File Requirements</h4>
                    <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <li>• <strong>Format:</strong> Image files only (JPEG, PNG, GIF, etc.)</li>
                      <li>• <strong>Size:</strong> Maximum 5MB</li>
                      <li>• <strong>Field name:</strong> &quot;image&quot;</li>
                    </ul>
                  </div>

                  <Example title="cURL Example" variant="request">
{`curl -X POST \\
  -F "image=@/path/to/image.jpg" \\
  https://scio.ly/api/upload-image`}
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "url": "https://cdn.scio.ly/images/1642248600000-image.jpg",
    "filename": "image.jpg",
    "size": 1024000,
    "type": "image/jpeg"
  }
}`}
                  </Example>
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

                  <Example title="Request" variant="request">
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
                </div>
              </Endpoint>

              <Endpoint 
                method="GET" 
                url="/api/questions/base52" 
                description="Retrieve a question by its base52 code."
                features={['Base52 Lookup']}
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
                features={['Code Generation']}
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

              <Endpoint 
                method="GET" 
                url="/api/blacklists" 
                description="List blacklisted questions (admin functionality)."
                features={['Content Moderation']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
                    <div className="space-y-2">
                      <Param name="event" type="string" description="Filter by event name" />
                      <Param name="limit" type="integer" description="Maximum results to return" />
                    </div>
                  </div>

                  <Example title="Request" variant="request">
GET /api/blacklists?event=Chemistry%20Lab&limit=10
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": [
    {
      "id": "blacklist-uuid-here",
      "event": "Chemistry Lab",
      "questionData": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "question": "Inappropriate question content"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}`}
                  </Example>
                </div>
              </Endpoint>

              <Endpoint 
                method="POST" 
                url="/api/blacklists" 
                description="Add a question to the blacklist (admin functionality)."
                features={['Content Moderation']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
                    <div className="space-y-2">
                      <Param name="question" type="object" required description="Question object to blacklist" />
                      <Param name="event" type="string" required description="Event name" />
                      <Param name="reason" type="string" description="Reason for blacklisting" />
                    </div>
                  </div>

                  <Example title="Request" variant="request">
{`{
  "question": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "question": "Inappropriate question content",
    "event": "Chemistry Lab"
  },
  "event": "Chemistry Lab",
  "reason": "Contains inappropriate content"
}`}
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "blacklisted": true,
    "id": "blacklist-uuid-here"
  }
}`}
                  </Example>
                </div>
              </Endpoint>

              <Endpoint 
                method="POST" 
                url="/api/report/remove" 
                description="Report a question for removal with AI validation and automatic blacklisting."
                features={['Content Moderation', 'AI Validation']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
                    <div className="space-y-2">
                      <Param name="question" type="object" required description="Question object to report" />
                      <Param name="event" type="string" required description="Science Olympiad event name" />
                    </div>
                  </div>

                  <Example title="Request Example" variant="request">
{`{
  "question": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "question": "Inappropriate question content",
    "event": "Chemistry Lab"
  },
  "event": "Chemistry Lab"
}`}
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "message": "Question removed and blacklisted",
  "data": {
    "reason": "Question contains inappropriate content",
    "removed": true
  }
}`}
                  </Example>

                  <InfoBox>
                    <strong>AI Validation:</strong> Uses Gemini AI to analyze if the question should be removed.<br />
                    <strong>Automatic Actions:</strong> If approved, adds to blacklist and removes from questions table.
                  </InfoBox>
                </div>
              </Endpoint>

              <Endpoint 
                method="POST" 
                url="/api/report/edit" 
                description="Report a question edit with AI validation and automatic application."
                features={['Content Moderation', 'AI Validation', 'Auto-Apply']}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
                    <div className="space-y-2">
                      <Param name="originalQuestion" type="object" required description="Original question object" />
                      <Param name="editedQuestion" type="object" required description="Edited question object" />
                      <Param name="event" type="string" required description="Science Olympiad event name" />
                      <Param name="reason" type="string" description="Reason for the edit" />
                      <Param name="bypass" type="boolean" description="Bypass AI validation (admin only)" />
                      <Param name="aiSuggestion" type="object" description="AI-generated suggestion for validation" />
                    </div>
                  </div>

                  <Example title="Request Example" variant="request">
{`{
  "originalQuestion": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "question": "What is water?",
    "options": ["H2O", "CO2", "NaCl"],
    "answers": ["H2O"]
  },
  "editedQuestion": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "question": "What is the chemical formula for water?",
    "options": ["H2O", "CO2", "NaCl"],
    "answers": ["H2O"]
  },
  "event": "Chemistry Lab",
  "reason": "Improve question clarity"
}`}
                  </Example>

                  <Example title="Response" variant="response">
{`{
  "success": true,
  "message": "Question edit saved and applied",
  "data": {
    "reason": "Edit improves question clarity and maintains scientific accuracy"
  }
}`}
                  </Example>

                  <InfoBox>
                    <strong>AI Validation:</strong> Uses Gemini AI to validate edit quality and accuracy.<br />
                    <strong>Auto-Apply:</strong> If approved, automatically updates the question in the database.<br />
                    <strong>Bypass Mode:</strong> Admin can bypass AI validation for trusted edits.
                  </InfoBox>
                </div>
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
    "suggestedDifficulty": 0.4
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
                description="Generate AI-powered explanations for Science Olympiad questions to aid learning and understanding."
                features={['Learning Aid', 'Answer Validation', 'Concept Breakdown']}
              >
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
    "explanation": "Water (H₂O) is composed of two hydrogen atoms bonded to one oxygen atom. This molecular structure gives water its unique properties including high surface tension and the ability to dissolve many substances.

The chemical formula H₂O indicates:
• 2 hydrogen atoms (H₂)
• 1 oxygen atom (O)

This is a fundamental concept in chemistry that explains why water is essential for life and has properties like being a universal solvent.",
    "correctIndices": [0],
    "correctedAnswers": ["H2O"]
  }
}`}
                  </Example>

                  <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <h5 className={`font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Response Fields</h5>
                    <div className="space-y-2 text-sm">
                      <div><strong>explanation</strong> - Detailed educational explanation with proper formatting (newlines, LaTeX, etc.)</div>
                      <div><strong>correctIndices</strong> - Zero-based indices of correct answers for multiple choice questions</div>
                      <div><strong>correctedAnswers</strong> - Array of correct answer strings for free-response questions</div>
                    </div>
                  </div>

                  <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <h5 className={`font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Features</h5>
                    <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <li>• <strong>Step-by-step explanations</strong> - Breaks down complex concepts into understandable parts</li>
                      <li>• <strong>Image analysis</strong> - References visual elements when questions include images</li>
                      <li>• <strong>Answer validation</strong> - Provides correct answers and validates user responses</li>
                      <li>• <strong>Event-specific context</strong> - Tailors explanations to specific Science Olympiad events</li>
                      <li>• <strong>Formatted output</strong> - Uses proper formatting with newlines, LaTeX, and clear structure</li>
                    </ul>
                  </div>

                  <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <h5 className={`font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Usage Notes</h5>
                    <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <li>• <strong>Rate limited</strong> - 2 second delay between requests to prevent abuse</li>
                      <li>• <strong>Structured response</strong> - Returns JSON with explanation and answer validation data</li>
                      <li>• <strong>No streaming</strong> - Complete response returned in single request</li>
                      <li>• <strong>Error handling</strong> - Returns error messages for invalid requests or service unavailability</li>
                    </ul>
                  </div>
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

              <Endpoint 
                method="POST" 
                url="/api/gemini/validate-edit" 
                description="Validate question edits using AI analysis to ensure quality and accuracy."
                features={['Quality Control', 'Edit Validation']}
              >
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

            
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 mb-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>🧠 Using the Explanations API</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Basic Usage</h4>
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
      throw new Error(\`HTTP error! status: \${response.status}\`);
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
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>React Hook Example</h4>
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
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Error Handling</h4>
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
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Best Practices</h4>
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
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Rate Limiting Implementation</h4>
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
      throw new Error(\`Please wait \${Math.ceil(remainingTime / 1000)} seconds before requesting another explanation\`);
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

            {/* Question Management Integration */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 mb-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>📚 Question Management APIs</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Fetching Questions</h4>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Use the `/api/questions` endpoint to retrieve filtered questions with pagination:
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
    
    // Add filters to query parameters
    if (filters.event) params.append('event', filters.event);
    if (filters.division) params.append('division', filters.division);
    if (filters.tournament) params.append('tournament', filters.tournament);
    if (filters.subtopics) params.append('subtopics', filters.subtopics.join(','));
    if (filters.difficulty_min) params.append('difficulty_min', filters.difficulty_min);
    if (filters.difficulty_max) params.append('difficulty_max', filters.difficulty_max);
    if (filters.question_type) params.append('question_type', filters.question_type);
    if (filters.limit) params.append('limit', filters.limit);

    try {
      const response = await fetch(\`\${this.baseUrl}/questions?\${params}\`, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch questions');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  }
}

// Usage example
const questionService = new QuestionService('your-api-key');

async function loadChemistryQuestions() {
  try {
    const questions = await questionService.getQuestions({
      event: 'Chemistry Lab',
      division: 'C',
      question_type: 'mcq',
      limit: 20,
      difficulty_min: 0.3,
      difficulty_max: 0.7
    });
    
    console.log(\`Loaded \${questions.length} chemistry questions\`);
    return questions;
  } catch (error) {
    console.error('Failed to load questions:', error);
    return [];
  }
}`}
                  </CollapsibleExample>
                </div>

                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>React Hook for Questions</h4>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
    
    Object.entries(mergedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });

    try {
      const response = await fetch(\`/api/questions?\${params}\`, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setQuestions(data.data);
        setFilters(mergedFilters);
      } else {
        throw new Error(data.error || 'Failed to fetch questions');
      }
    } catch (err) {
      setError(err.message);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [apiKey, filters]);

  const updateFilters = useCallback((newFilters) => {
    fetchQuestions(newFilters);
  }, [fetchQuestions]);

  useEffect(() => {
    if (apiKey) {
      fetchQuestions();
    }
  }, [apiKey, fetchQuestions]);

  return {
    questions,
    loading,
    error,
    filters,
    updateFilters,
    refetch: () => fetchQuestions(filters)
  };
}

// Usage in component
function QuestionList({ apiKey }) {
  const { 
    questions, 
    loading, 
    error, 
    updateFilters 
  } = useQuestions(apiKey, {
    event: 'Chemistry Lab',
    division: 'C',
    limit: 50
  });

  const handleEventChange = (event) => {
    updateFilters({ event, limit: 50 });
  };

  if (loading) return <div>Loading questions...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <select onChange={(e) => handleEventChange(e.target.value)}>
        <option value="Chemistry Lab">Chemistry Lab</option>
        <option value="Biology">Biology</option>
        <option value="Physics">Physics</option>
      </select>
      
      <div className="mt-4">
        {questions.map((question) => (
          <div key={question.id} className="p-4 border rounded mb-2">
            <h3 className="font-semibold">{question.question}</h3>
            <p className="text-sm text-gray-600">
              {question.tournament} - {question.division}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}`}
                  </CollapsibleExample>
                </div>

                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Batch Question Fetching</h4>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Use `/api/questions/batch` to fetch multiple specific questions by their IDs:
                  </p>
                  
                  <CollapsibleExample title="Batch Questions Service" variant="request">
{`// Service for batch fetching questions
async function getBatchQuestions(questionIds, apiKey) {
  try {
    const response = await fetch('/api/questions/batch', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ids: questionIds
      })
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch batch questions');
    }
  } catch (error) {
    console.error('Error fetching batch questions:', error);
    throw error;
  }
}

// React hook for batch questions
export function useBatchQuestions(apiKey) {
  const [questions, setQuestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBatch = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const batchQuestions = await getBatchQuestions(ids, apiKey);
      
      // Convert array to object with ID as key for easy lookup
      const questionsMap = {};
      batchQuestions.forEach(q => {
        questionsMap[q.id] = q;
      });
      
      setQuestions(prev => ({ ...prev, ...questionsMap }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  return { questions, loading, error, fetchBatch };
}

// Usage example
function BookmarkedQuestions({ bookmarkedIds, apiKey }) {
  const { questions, loading, error, fetchBatch } = useBatchQuestions(apiKey);

  useEffect(() => {
    if (bookmarkedIds.length > 0) {
      fetchBatch(bookmarkedIds);
    }
  }, [bookmarkedIds, fetchBatch]);

  if (loading) return <div>Loading bookmarked questions...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {bookmarkedIds.map(id => {
        const question = questions[id];
        if (!question) return <div key={id}>Loading question {id}...</div>;
        
        return (
          <div key={id} className="p-4 border rounded mb-2">
            <h3>{question.question}</h3>
            <p>{question.event} - {question.division}</p>
          </div>
        );
      })}
    </div>
  );
}`}
                  </CollapsibleExample>
                </div>

                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>ID Questions with Images</h4>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Fetch identification questions from `/api/id-questions` for events like Rocks and Minerals:
                  </p>
                  
                  <CollapsibleExample title="ID Questions Service" variant="request">
{`// Service for ID questions with images
async function getIdQuestions(filters = {}, apiKey) {
  const params = new URLSearchParams();
  
  if (filters.event) params.append('event', filters.event);
  if (filters.division) params.append('division', filters.division);
  if (filters.subtopics) params.append('subtopics', filters.subtopics.join(','));
  if (filters.difficulty_min) params.append('difficulty_min', filters.difficulty_min);
  if (filters.difficulty_max) params.append('difficulty_max', filters.difficulty_max);
  if (filters.limit) params.append('limit', filters.limit);

  try {
    const response = await fetch(\`/api/id-questions?\${params}\`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch ID questions');
    }
  } catch (error) {
    console.error('Error fetching ID questions:', error);
    throw error;
  }
}

// React component for ID questions
function IdQuestionCard({ question }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">{question.question}</h3>
      
      {/* Display images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {question.images?.map((imageUrl, index) => (
          <div key={index} className="relative">
            {!imageLoaded && !imageError && (
              <div className="animate-pulse bg-gray-200 h-48 rounded"></div>
            )}
            <img
              src={imageUrl}
              alt={\`Question image \${index + 1}\`}
              className={\`w-full h-48 object-cover rounded \${imageLoaded ? 'block' : 'hidden'}\`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {imageError && (
              <div className="bg-red-100 h-48 rounded flex items-center justify-center">
                <span className="text-red-600">Failed to load image</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Display options */}
      <div className="space-y-2">
        {question.options?.map((option, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded">
            {option}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Event:</strong> {question.event}</p>
        <p><strong>Subtopics:</strong> {question.subtopics?.join(', ')}</p>
        <p><strong>Difficulty:</strong> {(question.difficulty * 100).toFixed(0)}%</p>
      </div>
    </div>
  );
}

// Usage example
function RocksAndMineralsQuiz({ apiKey }) {
  const [idQuestions, setIdQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const questions = await getIdQuestions({
          event: 'Rocks and Minerals',
          division: 'C',
          limit: 10
        }, apiKey);
        setIdQuestions(questions);
      } catch (error) {
        console.error('Failed to load ID questions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, [apiKey]);

  if (loading) return <div>Loading ID questions...</div>;

  return (
    <div className="space-y-6">
      {idQuestions.map(question => (
        <IdQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
}`}
                  </CollapsibleExample>
                </div>
              </div>
            </div>

            {/* AI Features Integration */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 mb-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>🤖 AI Features Integration</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>AI Question Suggestions</h4>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Use `/api/gemini/suggest-edit` to get AI suggestions for improving questions:
                  </p>
                  
                  <CollapsibleExample title="Question Improvement Service" variant="request">
{`// Service for AI question suggestions
async function getSuggestionForQuestion(question, userReason = '', apiKey) {
  try {
    const response = await fetch('/api/gemini/suggest-edit', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: question,
        userReason: userReason
      })
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to get suggestion');
    }
  } catch (error) {
    console.error('Error getting suggestion:', error);
    throw error;
  }
}

// React hook for question suggestions
export function useQuestionSuggestions(apiKey) {
  const [suggestions, setSuggestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSuggestion = useCallback(async (questionId, question, reason = '') => {
    setLoading(true);
    setError(null);

    try {
      const suggestion = await getSuggestionForQuestion(question, reason, apiKey);
      setSuggestions(prev => ({
        ...prev,
        [questionId]: suggestion
      }));
      return suggestion;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  return { suggestions, loading, error, getSuggestion };
}

// Question improvement component
function QuestionImprovement({ question, apiKey }) {
  const { suggestions, loading, getSuggestion } = useQuestionSuggestions(apiKey);
  const [reason, setReason] = useState('');
  
  const suggestion = suggestions[question.id];

  const handleGetSuggestion = async () => {
    try {
      await getSuggestion(question.id, question, reason);
    } catch (error) {
      console.error('Failed to get suggestion:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Question Improvement</h3>
      
      <div className="mb-4">
        <p className="text-sm font-medium mb-2">Current Question:</p>
        <p className="p-2 bg-gray-50 rounded">{question.question}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Improvement Request (optional):
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Make more challenging, Fix grammar, Add clarity"
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        onClick={handleGetSuggestion}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {loading ? 'Getting Suggestion...' : 'Get AI Suggestion'}
      </button>

      {suggestion && (
        <div className="mt-4 p-4 bg-green-50 rounded">
          <h4 className="font-semibold mb-2">AI Suggestion:</h4>
          <div className="space-y-2">
            <div>
              <strong>Suggested Question:</strong>
              <p className="p-2 bg-white rounded">{suggestion.suggestedQuestion}</p>
            </div>
            
            {suggestion.suggestedOptions && (
              <div>
                <strong>Suggested Options:</strong>
                <ul className="list-disc list-inside p-2 bg-white rounded">
                  {suggestion.suggestedOptions.map((option, index) => (
                    <li key={index}>{option}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div>
              <strong>Reasoning:</strong>
              <p className="p-2 bg-white rounded">{suggestion.reasoning}</p>
            </div>
            
            <div>
              <strong>Confidence:</strong> {(suggestion.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`}
                  </CollapsibleExample>
                </div>

                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Complete Integration Example</h4>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    A complete example combining question fetching, explanations, and AI suggestions:
                  </p>
                  
                  <CollapsibleExample title="Complete Question Management App" variant="request">
{`// Complete question management component
function QuestionManagementApp({ apiKey }) {
  const [selectedEvent, setSelectedEvent] = useState('Chemistry Lab');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState([]);
  
  // Use our custom hooks
  const { questions, loading: questionsLoading, updateFilters } = useQuestions(apiKey, {
    event: selectedEvent,
    limit: 20
  });
  
  const { explanation, loading: explanationLoading, getExplanation } = useExplanation();
  const { suggestions, loading: suggestionLoading, getSuggestion } = useQuestionSuggestions(apiKey);

  const handleEventChange = (event) => {
    setSelectedEvent(event);
    setSelectedQuestion(null);
    setUserAnswer([]);
    updateFilters({ event, limit: 20 });
  };

  const handleQuestionSelect = (question) => {
    setSelectedQuestion(question);
    setUserAnswer([]);
  };

  const handleGetExplanation = async () => {
    if (selectedQuestion) {
      try {
        await getExplanation(selectedQuestion, userAnswer, selectedEvent);
      } catch (error) {
        console.error('Failed to get explanation:', error);
      }
    }
  };

  const handleGetSuggestion = async () => {
    if (selectedQuestion) {
      try {
        await getSuggestion(selectedQuestion.id, selectedQuestion, 'General improvement');
      } catch (error) {
        console.error('Failed to get suggestion:', error);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Question Management System</h1>
      
      {/* Event Selector */}
      <div className="mb-6">
        <label className="block font-medium mb-2">Select Event:</label>
        <select 
          value={selectedEvent} 
          onChange={(e) => handleEventChange(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="Chemistry Lab">Chemistry Lab</option>
          <option value="Biology">Biology</option>
          <option value="Physics">Physics</option>
          <option value="Astronomy">Astronomy</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Questions List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Questions</h2>
          {questionsLoading ? (
            <div>Loading questions...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((question) => (
                <div
                  key={question.id}
                  onClick={() => handleQuestionSelect(question)}
                  className={\`p-3 border rounded cursor-pointer transition-colors \${
                    selectedQuestion?.id === question.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }\`}
                >
                  <p className="font-medium">{question.question}</p>
                  <p className="text-sm text-gray-600">{question.tournament}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Question Details */}
        <div>
          {selectedQuestion ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Question Details</h2>
              
              <div className="p-4 border rounded mb-4">
                <h3 className="font-semibold mb-2">{selectedQuestion.question}</h3>
                
                {selectedQuestion.options && (
                  <div className="mb-4">
                    <p className="font-medium mb-2">Options:</p>
                    {selectedQuestion.options.map((option, index) => (
                      <label key={index} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={userAnswer.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserAnswer([...userAnswer, option]);
                            } else {
                              setUserAnswer(userAnswer.filter(a => a !== option));
                            }
                          }}
                          className="mr-2"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleGetExplanation}
                    disabled={explanationLoading}
                    className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
                  >
                    {explanationLoading ? 'Loading...' : 'Get Explanation'}
                  </button>
                  
                  <button
                    onClick={handleGetSuggestion}
                    disabled={suggestionLoading}
                    className="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-400"
                  >
                    {suggestionLoading ? 'Loading...' : 'Get AI Suggestion'}
                  </button>
                </div>

                {/* Display explanation */}
                {explanation && (
                  <div className="mb-4 p-4 bg-blue-50 rounded">
                    <h4 className="font-semibold mb-2">Explanation:</h4>
                    <div className="whitespace-pre-wrap">{explanation}</div>
                  </div>
                )}

                {/* Display AI suggestion */}
                {suggestions[selectedQuestion.id] && (
                  <div className="p-4 bg-purple-50 rounded">
                    <h4 className="font-semibold mb-2">AI Suggestion:</h4>
                    <div className="space-y-2">
                      <div>
                        <strong>Suggested Question:</strong>
                        <p>{suggestions[selectedQuestion.id].suggestedQuestion}</p>
                      </div>
                      <div>
                        <strong>Reasoning:</strong>
                        <p>{suggestions[selectedQuestion.id].reasoning}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              Select a question to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`}
                  </CollapsibleExample>
                </div>
              </div>
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
  );
}
