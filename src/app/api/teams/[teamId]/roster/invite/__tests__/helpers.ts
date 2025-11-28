/**
 * Helper functions for roster invite route tests
 */

import { NextRequest } from "next/server";
import { vi } from "vitest";
import type { DrizzleMockChain } from "./mocks";

export function createMockDrizzleChain(result: unknown[] | unknown): DrizzleMockChain {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(Array.isArray(result) ? result : [result]),
      }),
    }),
  } as unknown as DrizzleMockChain;
}

export function createMockDrizzleChainWithJoin(
  result: unknown[] | unknown,
  hasLimit = false
): DrizzleMockChain {
  const resultArray = Array.isArray(result) ? result : [result];
  if (hasLimit) {
    return {
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(resultArray),
          }),
        }),
      }),
    } as unknown as DrizzleMockChain;
  }
  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(resultArray),
      }),
    }),
  } as unknown as DrizzleMockChain;
}

export function createMockDrizzleInsert(result: unknown[] | unknown): DrizzleMockChain {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(Array.isArray(result) ? result : [result]),
    }),
  } as unknown as DrizzleMockChain;
}

export function createMockDrizzleUpdate(result: unknown[] | unknown): DrizzleMockChain {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(Array.isArray(result) ? result : [result]),
      }),
    }),
  } as unknown as DrizzleMockChain;
}

export function createPostRequest(teamId: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/teams/${teamId}/roster/invite`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function createGetRequest(teamId: string, query?: string): NextRequest {
  const url = query
    ? `http://localhost:3000/api/teams/${teamId}/roster/invite?${query}`
    : `http://localhost:3000/api/teams/${teamId}/roster/invite`;
  return new NextRequest(url);
}

export function createParams(teamId: string) {
  return { params: Promise.resolve({ teamId }) };
}
