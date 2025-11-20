import type { Metadata } from "next";
import ApiDocsClient from "./ApiDocsClient";

export const metadata: Metadata = {
  title: "API Documentation - Science Olympiad",
  description:
    "Comprehensive API documentation for Science Olympiad question management, AI-powered features, and collaborative testing",
};

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}
