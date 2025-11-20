"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { FileText } from "lucide-react";
import Endpoint from "@/app/docs/api/components/Endpoint";
import Example from "@/app/docs/api/components/Example";
import { InfoBox } from "@/app/docs/api/components/InfoBox";
import Param from "@/app/docs/api/components/Param";
import SectionHeader from "./SectionHeader";

export default function QuestionRetrievalSection() {
  const { darkMode } = useTheme();
  return (
    <div id="questions">
      <SectionHeader
        icon={<FileText className="w-6 h-6" />}
        title="Question Retrieval"
        id="questions"
      />

      <div className="space-y-6">
        <Endpoint
          method="GET"
          url="/api/questions"
          description="Retrieve questions with advanced filtering and two-phase random selection for optimal performance."
          features={["Retrieval", "Filtering"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Query Parameters
              </h4>
              <div className="space-y-2">
                <Param
                  name="event"
                  type="string"
                  description="Filter by event name (exact match)"
                />
                <Param name="division" type="string" description="Filter by division (B, C, B/C)" />
                <Param
                  name="tournament"
                  type="string"
                  description="Filter by tournament (partial match, case-insensitive)"
                />
                <Param name="subtopic" type="string" description="Filter by single subtopic" />
                <Param
                  name="subtopics"
                  type="string"
                  description="Filter by multiple subtopics (comma-separated)"
                />
                <Param
                  name="difficulty_min"
                  type="float"
                  description="Minimum difficulty (0.0-1.0)"
                />
                <Param
                  name="difficulty_max"
                  type="float"
                  description="Maximum difficulty (0.0-1.0)"
                />
                <Param
                  name="question_type"
                  type="enum"
                  description="Filter by type: 'mcq' (multiple choice) or 'frq' (free response)"
                />
                <Param
                  name="limit"
                  type="integer"
                  description="Maximum questions to return (default: 50, max: 200)"
                />
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
              <strong>Performance Notes:</strong> Uses indexed random selection with fallback to
              ORDER BY RANDOM(). Two-phase selection ensures even distribution across the dataset.
            </InfoBox>
          </div>
        </Endpoint>

        <Endpoint
          method="POST"
          url="/api/questions"
          description="Create a new question with validation and automatic ID generation."
          features={["Retrieval", "Create"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Request Body Schema
              </h4>
              <div className="space-y-2">
                <Param
                  name="question"
                  type="string"
                  required={true}
                  description="Question text (min length: 1)"
                />
                <Param
                  name="tournament"
                  type="string"
                  required={true}
                  description="Tournament name (min length: 1)"
                />
                <Param
                  name="division"
                  type="string"
                  required={true}
                  description="Division (min length: 1)"
                />
                <Param
                  name="event"
                  type="string"
                  required={true}
                  description="Event name (min length: 1)"
                />
                <Param
                  name="options"
                  type="string[]"
                  description="Multiple choice options (default: [])"
                />
                <Param
                  name="answers"
                  type="(string|number)[]"
                  description="Correct answers (default: [])"
                />
                <Param
                  name="subtopics"
                  type="string[]"
                  description="Related subtopics (default: [])"
                />
                <Param
                  name="difficulty"
                  type="number"
                  description="Difficulty (0.0-1.0, default: 0.5)"
                />
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
          features={["Retrieval", "Batch"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Request Body Schema
              </h4>
              <div className="space-y-2">
                <Param
                  name="ids"
                  type="string[]"
                  required={true}
                  description="Array of question UUIDs to fetch"
                />
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
              <strong>Features:</strong> Automatically searches both regular questions and ID
              questions tables. Returns questions in the same order as requested IDs. ID questions
              include imageData field.
            </InfoBox>
          </div>
        </Endpoint>

        <Endpoint
          method="GET"
          url="/api/id-questions"
          description="Retrieve identification questions with images (e.g., Rocks and Minerals, Entomology)."
          features={["Retrieval", "Images"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Query Parameters
              </h4>
              <div className="space-y-2">
                <Param
                  name="event"
                  type="string"
                  description="Filter by event name (exact match)"
                />
                <Param name="division" type="string" description="Filter by division (B, C, B/C)" />
                <Param name="subtopic" type="string" description="Filter by single subtopic" />
                <Param
                  name="subtopics"
                  type="string"
                  description="Filter by multiple subtopics (comma-separated)"
                />
                <Param
                  name="difficulty_min"
                  type="float"
                  description="Minimum difficulty (0.0-1.0)"
                />
                <Param
                  name="difficulty_max"
                  type="float"
                  description="Maximum difficulty (0.0-1.0)"
                />
                <Param
                  name="limit"
                  type="integer"
                  description="Maximum questions to return (default: 50, max: 200)"
                />
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
              <strong>Features:</strong> Uses the same two-phase random selection as regular
              questions. Each question includes an images array with CDN URLs for identification.
            </InfoBox>
          </div>
        </Endpoint>
      </div>
    </div>
  );
}
