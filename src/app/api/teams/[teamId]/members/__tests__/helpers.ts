/**
 * Helper functions for team members route tests
 */

import { NextRequest } from "next/server";
import { vi } from "vitest";

export function createDrizzleChain(
  result: unknown[],
  options?: { hasInnerJoin?: boolean; hasLimit?: boolean }
) {
  const { hasInnerJoin = false, hasLimit = false } = options || {};

  if (hasInnerJoin) {
    const whereMock = vi.fn().mockResolvedValue(result);
    const innerJoinChain = { where: whereMock };
    const innerJoinMock = vi.fn().mockReturnValue(innerJoinChain);
    const fromChain = { innerJoin: innerJoinMock };
    const fromMock = vi.fn().mockReturnValue(fromChain);
    return { from: fromMock };
  }

  if (hasLimit) {
    const limitMock = vi.fn().mockResolvedValue(result);
    const whereChain = { limit: limitMock };
    const whereMock = vi.fn().mockReturnValue(whereChain);
    const fromChain = { where: whereMock };
    const fromMock = vi.fn().mockReturnValue(fromChain);
    return { from: fromMock };
  }

  const whereMock = vi.fn().mockResolvedValue(result);
  const fromChain = { where: whereMock };
  const fromMock = vi.fn().mockReturnValue(fromChain);
  return { from: fromMock };
}

export function createRequest(teamId: string, query?: string): NextRequest {
  const url = query
    ? `http://localhost:3000/api/teams/${teamId}/members?${query}`
    : `http://localhost:3000/api/teams/${teamId}/members`;
  return new NextRequest(url);
}

export function createParams(teamId: string) {
  return { params: Promise.resolve({ teamId }) };
}

export function setupConsoleMocks() {
  vi.spyOn(console, "log").mockImplementation(() => {
    // Suppress console.log in tests
  });
  vi.spyOn(console, "error").mockImplementation(() => {
    // Suppress console.error in tests
  });
}

