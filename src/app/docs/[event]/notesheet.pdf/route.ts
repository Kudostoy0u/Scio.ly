import { NextResponse } from 'next/server';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { renderToStream } from '@react-pdf/renderer';
import { NotesheetDocument } from '@/app/docs/components/NotesheetDocument';
import React from 'react';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { event: string } }) {
  const evt = getEventBySlug(params.event);
  if (!evt || !evt.notesheetAllowed) {
    return new NextResponse('Notesheet not available for this event', { status: 404 });
  }

  const stream = await renderToStream(React.createElement(NotesheetDocument, { evt }));
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${evt.slug}-notesheet.pdf"`,
    },
  });
}


