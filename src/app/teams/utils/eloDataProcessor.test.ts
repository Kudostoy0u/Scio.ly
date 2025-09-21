import { describe, it, expect } from 'vitest';
import { calculateWinProbability, getAllSchools, getLeaderboard } from './eloDataProcessor';

describe('eloDataProcessor', () => {
  const sample = {
    CA: {
      'Alpha High': {
        seasons: {
          '2024': {
            events: {
              '__OVERALL__': { rating: 1600, history: [{ d: '2024-01-01', e: 1500 }, { d: '2024-05-01', e: 1600 }] },
              'Anatomy': { rating: 1550 }
            }
          }
        }
      },
      'Beta High': {
        seasons: {
          '2024': {
            events: {
              '__OVERALL__': { rating: 1500, history: [{ d: '2024-01-01', e: 1400 }] },
              'Anatomy': { rating: 1500 }
            }
          }
        }
      }
    }
  } as any;

  it('calculateWinProbability is symmetric and within 0..1', () => {
    const p1 = calculateWinProbability(1600, 1500);
    const p2 = calculateWinProbability(1500, 1600);
    expect(p1).toBeGreaterThan(0.5);
    expect(p2).toBeLessThan(0.5);
    expect(p1 + p2).toBeCloseTo(1, 5);
  });

  it('getAllSchools returns sorted list with state', () => {
    const schools = getAllSchools(sample);
    expect(schools).toEqual(['Alpha High (CA)', 'Beta High (CA)']);
  });

  it('getLeaderboard overall uses historical date fallback', () => {
    const leaderboard = getLeaderboard(sample, undefined, '2024', 10, '2023-12-31');
    // No history before that date -> falls back to baseline 1500
    expect(leaderboard.find(e => e.school === 'Alpha High')?.elo).toBe(1500);
  });
});
