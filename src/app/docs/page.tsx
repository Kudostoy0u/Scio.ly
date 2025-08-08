import { EventCatalogue } from '@/app/docs/components/EventCatalogue';

export const metadata = {
  title: 'Scio.ly Docs – 2026 Events',
  description: 'Comprehensive Science Olympiad 2026 event hub with study guides and sample notesheets.',
};

export default function DocsHome() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Scio.ly Docs</h1>
        <p className="text-gray-600 dark:text-gray-300">A superior wiki for the 2026 season – curated resources, rules pointers, and printable notesheets.</p>
        <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">In alpha development</span>
      </header>

      <EventCatalogue />
    </div>
  );
}


