import { NextResponse } from 'next/server';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { Page, Text, Document, StyleSheet, View } from '@react-pdf/renderer';

export const dynamic = 'force-dynamic';


function NotesheetPDFDocument({ evt }: { evt: any }) {
  const styles = StyleSheet.create({
    page: {
      padding: 24,
      fontSize: 10,
      lineHeight: 1.3,
    },
    title: {
      fontSize: 14,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 10,
      marginBottom: 12,
    },
    twoCol: {
      flexDirection: 'row',
      gap: 12,
    },
    col: {
      flexGrow: 1,
      flexBasis: 0,
    },
    sectionTitle: {
      fontSize: 11,
      marginBottom: 6,
      marginTop: 8,
    },
    bullet: {
      marginLeft: 8,
    },
  });

  return React.createElement(Document, {},
    React.createElement(Page, { size: "LETTER", style: styles.page },
      React.createElement(Text, { style: styles.title }, `Scio.ly Sample Notesheet – ${evt.name} (2026)`),
      React.createElement(Text, { style: styles.subtitle }, `Division: ${evt.division.join(' / ')}`),
      React.createElement(View, { style: styles.twoCol },
        React.createElement(View, { style: styles.col },
          React.createElement(Text, { style: styles.sectionTitle }, 'High-Yield Topics'),
          ...evt.keyTopics.map((t: string) => 
            React.createElement(Text, { key: t, style: styles.bullet }, `• ${t}`)
          )
        ),
        React.createElement(View, { style: styles.col },
          React.createElement(Text, { style: styles.sectionTitle }, 'Study Roadmap'),
          ...evt.studyRoadmap.map((t: string) => 
            React.createElement(Text, { key: t, style: styles.bullet }, `• ${t}`)
          )
        )
      )
    )
  );
}

export async function GET(_req: Request, context: any) {
  const { params } = context;
  const { event } = await params as { event: string };
  
  const evt = getEventBySlug(event);
  if (!evt || !evt.notesheetAllowed) {
    return new NextResponse('Notesheet not available for this event', { status: 404 });
  }

  const element = React.createElement(NotesheetPDFDocument, { evt }) as any;
  const stream = await renderToStream(element);
  
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${evt.slug}-notesheet.pdf"`,
    },
  });
}


