import { Metadata } from "next";
import TeamsDashboard from "./teams-dashboard/TeamsDashboard";

export const metadata: Metadata = {
  title: "Scio.ly | Team Analysis",
  description: "Analyze Science Olympiad team performance with Elo ratings, leaderboards, and comparisons"
};

export default function TeamsPage() {
  return <TeamsDashboard />;
}
