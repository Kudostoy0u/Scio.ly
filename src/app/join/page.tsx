import type { Metadata } from "next";
import JoinClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Scio.ly | Join Our Team",
  description: "Join our team and help make Science Olympiad practice accessible to everyone.",
};

export default function JoinPage() {
  return <JoinClientPage />;
}
