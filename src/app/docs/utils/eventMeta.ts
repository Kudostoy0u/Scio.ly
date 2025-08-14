import type { DocsEvent } from '@/app/docs/utils/events2026';

export type EventMeta = {
  typeLabel: string;
  participants: string;
  approxTime: string;
  allowedResources: string;
};

const TYPE_LABEL_BY_EVENTTYPE: Record<NonNullable<DocsEvent['eventType']>, string> = {
  study: 'Study',
  lab: 'Lab',
  build: 'Build',
  hybrid: 'Hybrid',
};

const PER_EVENT_OVERRIDES: Record<string, Partial<EventMeta>> = {
  // slug → overrides
  codebusters: {
    typeLabel: 'Inquiry',
    participants: 'Up to 3',
    approxTime: '50 minutes',
    allowedResources:
      'Writing utensils; up to three Class I (4/5‑function) calculators. No external notes. Verify current‑year rules.',
  },
  'experimental-design': {
    participants: 'Up to 2',
    approxTime: '50 minutes',
    allowedResources: 'No external resources; materials supplied by event supervisor. Eye protection as required. Verify current‑year rules.',
  },
  'write-it-do-it': {
    participants: 'Up to 2',
    approxTime: '50 minutes',
    allowedResources: 'No external resources. Paper and writing instruments typically provided. Verify current‑year rules.',
  },
  'engineering-cad': {
    participants: 'Up to 2',
    approxTime: '50 minutes',
    allowedResources: 'Computer/software per host guidance. No external notes unless permitted. Verify current‑year rules.',
  },
};

const DEFAULTS: EventMeta = {
  typeLabel: 'Study',
  participants: 'Up to 2',
  approxTime: '50 minutes',
  allowedResources: 'See current‑year rules; policies vary by event and season.',
};

export function getEventMeta(evt: DocsEvent): EventMeta {
  const overrides = PER_EVENT_OVERRIDES[evt.slug] ?? {};

  // Compute sensible defaults based on event attributes
  const computedType = evt.eventType ? TYPE_LABEL_BY_EVENTTYPE[evt.eventType] ?? DEFAULTS.typeLabel : DEFAULTS.typeLabel;

  // Participants default: most events allow 2; Codebusters already overridden to 3 via overrides
  const computedParticipants = 'Up to 2';

  // Time default: 50 minutes across most written/build windows
  const computedApproxTime = '50 minutes';

  // Allowed resources logic
  let computedAllowed = DEFAULTS.allowedResources;
  if (evt.eventType === 'build') {
    computedAllowed = 'Device and tools as permitted; eye protection per rules; impound likely. No external notes unless specified. Verify current‑year rules.';
  } else if (evt.notesheetAllowed) {
    computedAllowed = 'Binders/notes allowed per rules; non‑programmable calculator as permitted. Verify current‑year rules.';
  } else if (evt.eventType === 'lab') {
    computedAllowed = 'Safety equipment required; non‑programmable calculator may be allowed. Verify current‑year rules.';
  }

  return {
    typeLabel: overrides.typeLabel ?? computedType,
    participants: overrides.participants ?? computedParticipants,
    approxTime: overrides.approxTime ?? computedApproxTime,
    allowedResources: overrides.allowedResources ?? computedAllowed,
  };
}


