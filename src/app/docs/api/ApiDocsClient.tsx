"use client";

import { useTheme } from "@/app/contexts/themeContext";
import {
  Code,
  Database,
  ExternalLink,
  FileText,
  MessageSquare,
  Pencil,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import AuthenticationSection from "./components/AuthenticationSection";
import DocsFooter from "./components/DocsFooter";
import EditingSection from "./components/EditingSection";
import ExplanationsGuide from "./components/ExplanationsGuide";
import Hero from "./components/Hero";
// import CollapsibleExample from './components/CollapsibleExample';
import { InfoBox } from "./components/InfoBox";
import MetadataSection from "./components/MetadataSection";
import OverviewSection from "./components/OverviewSection";
import QuestionManagementGuide from "./components/QuestionManagementGuide";
import QuestionRetrievalSection from "./components/QuestionRetrievalSection";
import QuotesSection from "./components/QuotesSection";
import RecentUpdates from "./components/RecentUpdates";
import SharingSection from "./components/SharingSection";
import SystemSection from "./components/SystemSection";
import TableOfContents from "./components/TableOfContents";

// SectionHeader moved to components/SectionHeader

export default function ApiDocsClient() {
  const { darkMode } = useTheme();
  const [activeSection, setActiveSection] = useState<string>("overview");

  const sections = [
    { id: "overview", title: "Overview", icon: <Database className="w-6 h-6" /> },
    { id: "authentication", title: "Authentication", icon: <Shield className="w-6 h-6" /> },
    { id: "questions", title: "Question Retrieval", icon: <FileText className="w-6 h-6" /> },
    { id: "metadata", title: "Metadata & Statistics", icon: <Code className="w-6 h-6" /> },
    { id: "sharing", title: "Sharing & Codes", icon: <Users className="w-6 h-6" /> },
    { id: "quotes", title: "Quotes Management", icon: <MessageSquare className="w-6 h-6" /> },
    { id: "ai", title: "AI-Powered Features", icon: <Zap className="w-6 h-6" /> },
    { id: "editing", title: "Content Editing", icon: <Pencil className="w-6 h-6" /> },
    { id: "system", title: "System Endpoints", icon: <ExternalLink className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <Hero />

        {/* Info Box */}
        <InfoBox>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Base URL:</strong>{" "}
              <code className={`${darkMode ? "bg-blue-800" : "bg-blue-100"} px-2 py-1 rounded`}>
                https://scio.ly
              </code>
              <br />
              <strong>API Version:</strong> 1.0.0
              <br />
              <strong>Content-Type:</strong> application/json
            </div>
            <div>
              <strong>Authentication:</strong> API key required for most endpoints
              <br />
              <strong>Rate Limiting:</strong> AI endpoints have rate limiting
              <br />
              <strong>CORS:</strong> Enabled for cross-origin requests
            </div>
          </div>
        </InfoBox>

        {/* Recent Updates */}
        <RecentUpdates />

        {/* Navigation */}
        <TableOfContents
          sections={sections}
          activeSection={activeSection}
          onSelect={(id) => {
            setActiveSection(id);
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* Content */}
        <div className="space-y-8">
          {/* Overview Section */}
          <OverviewSection />

          {/* Authentication Section */}
          <AuthenticationSection />

          {/* Question Retrieval Section */}
          <QuestionRetrievalSection />

          {/* Metadata Section */}
          <MetadataSection />

          {/* Sharing & Codes Section */}
          <SharingSection />

          {/* Quotes Management Section */}
          <QuotesSection />

          {/* Content Editing Section */}
          <EditingSection />

          {/* AI Features Section */}
          <ExplanationsGuide />
          {/* Question Management Integration */}
          <QuestionManagementGuide />

          {/* System Endpoints Section */}
          <SystemSection />
        </div>

        {/* Footer */}
        <DocsFooter />
      </div>
    </div>
  );
}
