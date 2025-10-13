export type DocsEvent = {
  slug: string;
  name: string;
  division: Array<'B' | 'C'>;
  notesheetAllowed: boolean;
  overview: string;
  keyTopics: string[];
  studyRoadmap: string[];
  links: { label: string; url: string }[];
  eventType?: 'study' | 'lab' | 'build' | 'hybrid';
  materialsNote?: string;
  subsections?: { slug: string; title: string }[];
};

export type EventBadgeKind = 'build' | 'misc' | 'binder' | 'notesheet';
export type EventBadge = { kind: EventBadgeKind; label: 'Build Event' | 'Miscellaneous' | 'Binder' | 'Notesheet' };
