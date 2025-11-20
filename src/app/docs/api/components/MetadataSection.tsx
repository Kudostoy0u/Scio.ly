"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { Code } from "lucide-react";
import Endpoint from "@/app/docs/api/components/Endpoint";
import Example from "@/app/docs/api/components/Example";
import Param from "@/app/docs/api/components/Param";
import SectionHeader from "./SectionHeader";

export default function MetadataSection() {
  const { darkMode } = useTheme();
  return (
    <div id="metadata">
      <SectionHeader icon={<Code className="w-6 h-6" />} title="Metadata & Statistics" id="metadata" />

      <div className="space-y-6">
        <Endpoint
          method="GET"
          url="/api/meta/events"
          description="Get all available Science Olympiad events in alphabetical order."
          features={["Metadata"]}
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
          features={["Metadata"]}
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
          features={["Metadata"]}
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
                  description="Filter subtopics by specific event"
                />
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
          features={["Metadata", "Statistics"]}
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
  );
}
