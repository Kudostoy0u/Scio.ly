"use client";

import TeamDashboard from "@/app/teams/components/TeamDashboard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TeamAssignmentsClientProps {
  teamSlug: string;
  school: string;
  division: "B" | "C";
  isCaptain: boolean;
}

export default function TeamAssignmentsClient({
  teamSlug,
  school,
  division,
  isCaptain,
}: TeamAssignmentsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Set loading to false immediately since we don't need to load members here anymore
  useEffect(() => {
    setLoading(false);
  }, []);

  const handleBack = () => {
    router.push("/teams");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading team...</div>
      </div>
    );
  }

  return (
    <TeamDashboard
      team={{ id: teamSlug, school, division, slug: teamSlug }}
      isCaptain={isCaptain}
      onBack={handleBack}
      activeTab="assignments"
    />
  );
}
