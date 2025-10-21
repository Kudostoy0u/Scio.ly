'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TeamDashboard from '../../components/TeamDashboard';

interface TeamPeopleClientProps {
  teamSlug: string;
  school: string;
  division: 'B' | 'C';
  isCaptain: boolean;
}

export default function TeamPeopleClient({ 
  teamSlug, 
  school, 
  division, 
  isCaptain 
}: TeamPeopleClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Set loading to false immediately since we don't need to load members here anymore
  useEffect(() => {
    setLoading(false);
  }, []);

  const handleBack = () => {
    router.push('/teams');
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
      activeTab="people"
    />
  );
}
