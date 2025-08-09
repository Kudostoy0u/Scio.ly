import HomeClient from './components/home/HomeClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Render a fast shell; PWA redirect handled client-side very early
  return <HomeClient />;
}


