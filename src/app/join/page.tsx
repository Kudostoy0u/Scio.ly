import { Metadata } from 'next';
import CareersClientPage from './ClientPage';

export const metadata: Metadata = {
  title: "Scio.ly | Careers",
  description: "Join the Scio.ly team and help us make Science Olympiad practice accessible to everyone.",
};

export default function CareersPage() {
  return <CareersClientPage />;
}
