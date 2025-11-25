import {
  calculateWinProbability,
  getAllSchools,
  getLeaderboard,
} from "@/app/analytics/utils/eloDataProcessor";
import { describe, expect, it } from "vitest";

describe("eloDataProcessor", () => {
  const testData: Record<string, unknown> = {
    CA: {
      "Alpha High": {
        seasons: {
          "2024": {
            events: {
              __OVERALL__: {
                rating: 1600,
                history: [
                  { d: "2024-01-01", e: 1500 },
                  { d: "2024-05-01", e: 1600 },
                ],
              },
              Anatomy: { rating: 1550 },
            },
          },
        },
      },
      "Beta High": {
        seasons: {
          "2024": {
            events: {
              __OVERALL__: { rating: 1500, history: [{ d: "2024-01-01", e: 1400 }] },
              Anatomy: { rating: 1500 },
            },
          },
        },
      },
    },
  } as Record<
    string,
    Record<
      string,
      {
        seasons: Record<
          string,
          { events: Record<string, { rating: number; history?: Array<{ d: string; e: number }> }> }
        >;
      }
    >
  >;

  it("calculateWinProbability is symmetric and within 0..1", () => {
    const p1 = calculateWinProbability(1600, 1500);
    const p2 = calculateWinProbability(1500, 1600);
    expect(p1).toBeGreaterThan(0.5);
    expect(p2).toBeLessThan(0.5);
    expect(p1 + p2).toBeCloseTo(1, 5);
  });

  it("getAllSchools returns sorted list with state", () => {
    const schools = getAllSchools(testData);
    expect(schools).toEqual(["Alpha High (CA)", "Beta High (CA)"]);
  });

  it("getLeaderboard overall uses historical date fallback", () => {
    const leaderboard = getLeaderboard(testData, undefined, "2024", 10, "2023-12-31");
    // No history before that date -> falls back to baseline 1500
    expect(leaderboard.find((e) => e.school === "Alpha High")?.elo).toBe(1500);
  });
});
