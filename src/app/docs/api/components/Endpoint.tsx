"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface EndpointProps {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  description: string;
  features?: string[];
  children: React.ReactNode;
}

export default function Endpoint({ method, url, description, features, children }: EndpointProps) {
  const { darkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const methodColors = {
    GET: "bg-green-600",
    POST: "bg-blue-600",
    PUT: "bg-orange-600",
    DELETE: "bg-red-600",
  };

  return (
    <div
      className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg border overflow-hidden`}
    >
      <div
        className={`p-4 cursor-pointer transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-md text-white text-sm font-semibold ${methodColors[method]}`}
          >
            {method}
          </span>
          <code className={`${darkMode ? "text-gray-100" : "text-gray-900"} font-mono text-sm`}>
            {url}
          </code>
          <div className="flex gap-2 ml-auto">
            {features?.map((feature) => (
              <span
                key={feature}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
                }`}
              >
                {feature}
              </span>
            ))}
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
        <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} mt-2`}>{description}</p>
      </div>

      {isExpanded && (
        <div
          className={`border-t p-4 ${darkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
