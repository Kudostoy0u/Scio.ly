"use client";
import dynamic from 'next/dynamic';
import { useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

const PDFViewer = dynamic(() => import('@/app/docs/components/react-pdf-client').then(m => m.PDFViewer), { ssr: false });
const DocumentComp = dynamic(() => import('@/app/docs/components/NotesheetDocument').then(m => m.NotesheetDocument), { ssr: false });

export default function NotesheetPreview() {
  const { event } = useParams<{ event: string }>();
  const router = useRouter();
  const evt = useMemo(() => getEventBySlug(event as string), [event]);

  useEffect(() => {
    if (evt && !evt.notesheetAllowed) {
      toast.info(
        <div>
          A notesheet is not available for this event (yet). If you have notesheets for this season, please help us out and send it through{' '}
          <a href="https://discord.gg/wF4k27vt" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Discord</a> or{' '}
          <a href="mailto:team.scio.ly@gmail.com" className="text-blue-500 hover:underline">Email</a>!
        </div>,
        {
          autoClose: 6000,
          position: "top-right"
        }
      );

      router.push(`/docs/${evt.slug}`);
    }
  }, [evt, router]);

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


