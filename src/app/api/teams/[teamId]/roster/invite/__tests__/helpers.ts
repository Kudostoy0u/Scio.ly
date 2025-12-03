/**
 * Helper functions for roster invite route tests
 */

import { NextRequest } from "next/server";
import { vi } from "vitest";
import type { DrizzleMockChain } from "./mocks";

export function createMockDrizzleChain(result: unknown): DrizzleMockChain {
	const whereMock = vi.fn().mockResolvedValue(Array.isArray(result) ? result : [result]);
	const fromChain = { where: whereMock };
	const fromMock = vi.fn().mockReturnValue(fromChain);
	return { from: fromMock };
}

export function createMockDrizzleChainWithJoin(
	result: unknown,
	hasLimit = false
): DrizzleMockChain {
	if (hasLimit) {
		const limitMock = vi.fn().mockResolvedValue(Array.isArray(result) ? result : [result]);
		const whereChain = { limit: limitMock };
		const whereMock = vi.fn().mockReturnValue(whereChain);
		const innerJoinChain = { where: whereMock };
		const innerJoinMock = vi.fn().mockReturnValue(innerJoinChain);
		const fromChain = { innerJoin: innerJoinMock };
		const fromMock = vi.fn().mockReturnValue(fromChain);
		return { from: fromMock };
	}

	const whereMock = vi.fn().mockResolvedValue(Array.isArray(result) ? result : [result]);
	const innerJoinChain = { where: whereMock };
	const innerJoinMock = vi.fn().mockReturnValue(innerJoinChain);
	const fromChain = { innerJoin: innerJoinMock };
	const fromMock = vi.fn().mockReturnValue(fromChain);
	return { from: fromMock };
}

export function createMockDrizzleInsert(result: unknown): DrizzleMockChain {
	const returningMock = vi.fn().mockResolvedValue(Array.isArray(result) ? result : [result]);
	const valuesChain = { returning: returningMock };
	const valuesMock = vi.fn().mockReturnValue(valuesChain);
	const fromMock = vi.fn().mockReturnValue({ values: valuesMock });
	return { from: fromMock, values: valuesMock };
}

export function createMockDrizzleUpdate(result: unknown): DrizzleMockChain {
	const returningMock = vi.fn().mockResolvedValue(Array.isArray(result) ? result : [result]);
	const whereChain = { returning: returningMock };
	const whereMock = vi.fn().mockReturnValue(whereChain);
	const setChain = { where: whereMock };
	const setMock = vi.fn().mockReturnValue(setChain);
	const fromMock = vi.fn().mockReturnValue({ set: setMock });
	return { from: fromMock, set: setMock };
}

export function createGetRequest(teamId: string, query?: string): NextRequest {
	const url = query
		? `http://localhost:3000/api/teams/${teamId}/roster/invite?${query}`
		: `http://localhost:3000/api/teams/${teamId}/roster/invite`;
	return new NextRequest(url);
}

export function createPostRequest(teamId: string, body: Record<string, unknown>): NextRequest {
	const url = `http://localhost:3000/api/teams/${teamId}/roster/invite`;
	return new NextRequest(url, {
		method: "POST",
		body: JSON.stringify(body),
		headers: {
			"Content-Type": "application/json",
		},
	});
}

export function createParams(teamId: string) {
	return { params: Promise.resolve({ teamId }) };
}

