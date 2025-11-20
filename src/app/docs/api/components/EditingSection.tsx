"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { Pencil } from "lucide-react";
import Endpoint from "@/app/docs/api/components/Endpoint";
import Example from "@/app/docs/api/components/Example";
import Param from "@/app/docs/api/components/Param";
import SectionHeader from "./SectionHeader";

export default function EditingSection() {
  const { darkMode } = useTheme();
  return (
    <div id="editing">
      <SectionHeader icon={<Pencil className="w-6 h-6" />} title="Content Editing" id="editing" />

      <div className="space-y-6">
        <Endpoint
          method="POST"
          url="/api/upload-image"
          description="Upload images for questions with validation and CDN storage."
          features={["Editing", "File Upload"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Request Format
              </h4>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Send as multipart/form-data with image file.
              </p>
            </div>

            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                File Requirements
              </h4>
              <ul className={`text-sm space-y-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                <li>
                  • <strong>Format:</strong> Image files only (JPEG, PNG, GIF, etc.)
                </li>
                <li>
                  • <strong>Size:</strong> Maximum 5MB
                </li>
                <li>
                  • <strong>Field name:</strong> &quot;image&quot;
                </li>
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
          url="/api/blacklists"
          description="List blacklisted questions (admin functionality)."
          features={["Editing"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Query Parameters
              </h4>
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
          features={["Editing"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Request Body Schema
              </h4>
              <div className="space-y-2">
                <Param
                  name="question"
                  type="object"
                  required={true}
                  description="Question object to blacklist"
                />
                <Param name="event" type="string" required={true} description="Event name" />
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
          features={["Editing", "AI"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Request Body Schema
              </h4>
              <div className="space-y-2">
                <Param
                  name="question"
                  type="object"
                  required={true}
                  description="Question object to report"
                />
                <Param
                  name="event"
                  type="string"
                  required={true}
                  description="Science Olympiad event name"
                />
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
          </div>
        </Endpoint>

        <Endpoint
          method="POST"
          url="/api/report/edit"
          description="Report a question edit with AI validation and automatic application."
          features={["Editing", "AI"]}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Request Body Schema
              </h4>
              <div className="space-y-2">
                <Param
                  name="originalQuestion"
                  type="object"
                  required={true}
                  description="Original question object"
                />
                <Param
                  name="editedQuestion"
                  type="object"
                  required={true}
                  description="Edited question object"
                />
                <Param
                  name="event"
                  type="string"
                  required={true}
                  description="Science Olympiad event name"
                />
                <Param name="reason" type="string" description="Reason for the edit" />
                <Param
                  name="bypass"
                  type="boolean"
                  description="Bypass AI validation (admin only)"
                />
                <Param
                  name="aiSuggestion"
                  type="object"
                  description="AI-generated suggestion for validation"
                />
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
          </div>
        </Endpoint>
      </div>
    </div>
  );
}
