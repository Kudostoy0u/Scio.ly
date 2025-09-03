import { Metadata } from 'next';
import TeamsContent from '@/app/teams/TeamsContent';

export const metadata: Metadata = {
  title: 'Scio.ly | Analytics',
  description: 'Team analytics, ELO visualizations, and comparisons.',
};

export default function AnalyticsPage() {
  return <TeamsContent />;
}


