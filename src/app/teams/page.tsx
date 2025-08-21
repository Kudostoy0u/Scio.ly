import { Metadata } from "next";
import TeamsContent from "./TeamsContent";

export const metadata: Metadata = {
  title: "Scio.ly | Team Analysis",
  description: "Analyze Science Olympiad team performance with Elo ratings, leaderboards, and comparisons"
};

export default function TeamsPage() {
  return <TeamsContent />;
}
