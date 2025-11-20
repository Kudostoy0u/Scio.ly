import type { Metadata } from "next";
import AnalyticsContent from "./AnalyticsContent";

export const metadata: Metadata = {
  title: "Scio.ly | Analytics",
  description: "Team analytics, ELO visualizations, and comparisons.",
};

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
