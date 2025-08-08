"use client";
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';

const PDFViewer = dynamic(() => import('@/app/docs/components/react-pdf-client').then(m => m.PDFViewer), { ssr: false });
const DocumentComp = dynamic(() => import('@/app/docs/components/NotesheetDocument').then(m => m.NotesheetDocument), { ssr: false });

export default function NotesheetPreview() {
  const { event } = useParams<{ event: string }>();
  const evt = useMemo(() => getEventBySlug(event as string), [event]);
  if (!evt || !evt.notesheetAllowed) return null;

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl font-semibold mb-4">{evt.name} – Sample Notesheet</h1>
        <div className="h-[80vh] border rounded">
          <PDFViewer width="100%" height="100%" showToolbar>
            <DocumentComp evt={evt} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}


