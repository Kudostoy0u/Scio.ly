"use client";
import { Page, Text, Document, StyleSheet, View } from '@react-pdf/renderer';
import type { DocsEvent } from '@/app/docs/utils/events2026';

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

export function NotesheetDocument({ evt }: { evt: DocsEvent }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Scio.ly Sample Notesheet – {evt.name} (2026)</Text>
        <Text style={styles.subtitle}>Division: {evt.division.join(' / ')}</Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>High-Yield Topics</Text>
            {evt.keyTopics.map((t) => (
              <Text key={t} style={styles.bullet}>• {t}</Text>
            ))}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Study Roadmap</Text>
            {evt.studyRoadmap.map((t) => (
              <Text key={t} style={styles.bullet}>• {t}</Text>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}


