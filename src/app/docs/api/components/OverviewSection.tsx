"use client";

import { useTheme } from "@/app/contexts/themeContext";
import Example from "@/app/docs/api/components/Example";
import Schema from "@/app/docs/api/components/Schema";
import { Database } from "lucide-react";
import SectionHeader from "./SectionHeader";

export default function OverviewSection() {
  const { darkMode } = useTheme();
  return (
    <div id="overview">
      <SectionHeader icon={<Database className="w-6 h-6" />} title="Overview" id="overview" />
      <div className="space-y-6">
        <div>
          <h3
            className={`text-xl font-semibold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
          >
            Response Format
          </h3>
          <p className={`mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            All endpoints return JSON responses with consistent structure:
          </p>
          <Schema title="Standard Response Schema">
            {`{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string
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
          <h3
            className={`text-xl font-semibold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
          >
            Data Types
          </h3>
          <div className="space-y-4">
            <Schema title="Question Object">
              {`{
  "id": "uuid",
  "question": "string",
  "tournament": "string",
  "division": "string",
  "event": "string",
  "options": ["string"],
  "answers": ["string" | "number"],
  "subtopics": ["string"],
  "difficulty": number,
  "imageData": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "base52": "string"
}`}
            </Schema>
            <Schema title="ID Question Object">
              {`{
  "id": "uuid",
  "question": "string",
  "tournament": "string",
  "division": "string",
  "event": "string",
  "options": ["string"],
  "answers": ["string" | "number"],
  "subtopics": ["string"],
  "difficulty": number,
  "images": ["string"],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}`}
            </Schema>
          </div>
        </div>
      </div>
    </div>
  );
}
