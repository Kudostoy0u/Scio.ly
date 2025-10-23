import HomeClient from './components/home/HomeClient';
import { Metadata } from 'next';

// Static generation with aggressive caching
export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours - main page rarely changes
export const fetchCache = 'force-cache';

// Optimized metadata for better caching
export const metadata: Metadata = {
  title: 'Scio.ly - Science Olympiad Practice Platform',
  description: 'The ultimate Science Olympiad practice platform with comprehensive study materials, practice tests, and team collaboration tools.',
  keywords: ['Science Olympiad', 'practice', 'study', 'competition', 'education'],
  openGraph: {
    title: 'Scio.ly - Science Olympiad Practice Platform',
    description: 'The ultimate Science Olympiad practice platform with comprehensive study materials, practice tests, and team collaboration tools.',
    type: 'website',
    siteName: 'Scio.ly',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scio.ly - Science Olympiad Practice Platform',
    description: 'The ultimate Science Olympiad practice platform with comprehensive study materials, practice tests, and team collaboration tools.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default async function HomePage() {
  return <HomeClient />;
}


