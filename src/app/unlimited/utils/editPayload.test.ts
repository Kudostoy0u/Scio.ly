import { describe, it, expect } from 'vitest';
import { buildEditPayload } from './editPayload';

describe('buildEditPayload', () => {
  const q = {
    question: 'Q',
    answers: [0],
    difficulty: 0.5,
    event: 'Test',
    options: ['A','B']
  } as any;

  it('builds payload with defaults', () => {
    const p = buildEditPayload({ originalQuestion: q, editedQuestion: q, reason: 'fix', eventName: 'Event' });
    expect(p.reason).toBe('fix');
    expect(p.bypass).toBe(false);
    expect(p.event).toBe('Event');
  });

  it('respects aiBypass flag', () => {
    const p = buildEditPayload({ originalQuestion: q, editedQuestion: q, reason: 'fix', aiBypass: true });
    expect(p.bypass).toBe(true);
  });
});


