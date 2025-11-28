/**
 * Helper functions for team invite route tests
 */

import { NextRequest } from "next/server";
import { vi } from "vitest";
import type { DrizzleMockChain } from "./mocks";

export function createDrizzleSelectChain(result: unknown[]): DrizzleMockChain {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  } as unknown as DrizzleMockChain;
}

export function createDrizzleSelectChainWithLimit(result: unknown[]): DrizzleMockChain {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as DrizzleMockChain;
}

export function createDrizzleInsertChain(result: unknown[]): DrizzleMockChain {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  } as unknown as DrizzleMockChain;
}

export function createPostRequest(teamId: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/teams/${teamId}/invite`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function createGetRequest(teamId: string, query?: string): NextRequest {
  const url = query
    ? `http://localhost:3000/api/teams/${teamId}/invite?${query}`
    : `http://localhost:3000/api/teams/${teamId}/invite`;
  return new NextRequest(url);
}

export function createParams(teamId: string) {
  return { params: Promise.resolve({ teamId }) };
}
