/**
 * Helper functions for team invite route tests
 */

import { NextRequest } from "next/server";
import { vi } from "vitest";
import type { DrizzleMockChain } from "./mocks";

export function createDrizzleSelectChain(result: unknown[]): DrizzleMockChain {
	const whereMock = vi.fn().mockResolvedValue(result);
	const fromChain = { where: whereMock };
	const fromMock = vi.fn().mockReturnValue(fromChain);
	return { from: fromMock };
}

export function createDrizzleSelectChainWithLimit(result: unknown[]): DrizzleMockChain {
	const limitMock = vi.fn().mockResolvedValue(result);
	const whereChain = { limit: limitMock };
	const whereMock = vi.fn().mockReturnValue(whereChain);
	const fromChain = { where: whereMock };
	const fromMock = vi.fn().mockReturnValue(fromChain);
	return { from: fromMock };
}

export function createDrizzleInsertChain(result: unknown[]): DrizzleMockChain {
	const returningMock = vi.fn().mockResolvedValue(result);
	const valuesChain = { returning: returningMock };
	const valuesMock = vi.fn().mockReturnValue(valuesChain);
	const fromMock = vi.fn().mockReturnValue({ values: valuesMock });
	return { from: fromMock, values: valuesMock };
}

export function createGetRequest(teamId: string, query?: string): NextRequest {
	const url = query
		? `http://localhost:3000/api/teams/${teamId}/invite?${query}`
		: `http://localhost:3000/api/teams/${teamId}/invite`;
	return new NextRequest(url);
}

export function createPostRequest(teamId: string, body: Record<string, unknown>): NextRequest {
	const url = `http://localhost:3000/api/teams/${teamId}/invite`;
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

