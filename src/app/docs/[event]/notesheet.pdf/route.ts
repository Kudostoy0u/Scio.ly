import { NextResponse } from 'next/server';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { renderToStream } from '@react-pdf/renderer';
import { NotesheetDocument } from '@/app/docs/components/NotesheetDocument';
import React from 'react';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: any) {
  const { event } = context.params as { event: string };
  const evt = getEventBySlug(event);
  if (!evt || !evt.notesheetAllowed) {
    return new NextResponse('Notesheet not available for this event', { status: 404 });
  }

  const element = React.createElement(
    NotesheetDocument as unknown as React.ComponentType<{ evt: unknown }>,
    { evt }
  ) as unknown as React.ReactElement<import('@react-pdf/renderer').DocumentProps>;
  const stream = await renderToStream(element);
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${evt.slug}-notesheet.pdf"`,
    },
  });
}


