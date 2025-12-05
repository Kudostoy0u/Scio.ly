/**
 * Helper functions for recurring meetings route tests
 */

import { NextRequest } from "next/server";
import { vi } from "vitest";

export function createDrizzleSelectChain(result: unknown[]): any {
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue(result),
		}),
	};
}

export function createDrizzleSelectChainWithLimit(result: unknown[]): any {
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue(result),
			}),
		}),
	};
}

export function createDrizzleSelectChainWithInnerJoin(result: unknown[]): any {
	return {
		from: vi.fn().mockReturnValue({
			innerJoin: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(result),
				}),
			}),
		}),
	};
}

export function createDrizzleSelectChainWithLeftJoin(result: unknown[]): any {
	return {
		from: vi.fn().mockReturnValue({
			leftJoin: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue(result),
				}),
			}),
		}),
	};
}

export function createDrizzleInsertChain(result: unknown[]): any {
	return {
		values: vi.fn().mockReturnValue({
			returning: vi.fn().mockResolvedValue(result),
		}),
	};
}

export function createDrizzleInsertChainReject(error: Error): any {
	return {
		values: vi.fn().mockReturnValue({
			returning: vi.fn().mockRejectedValue(error),
		}),
	};
}

export function createPostRequest(body: Record<string, unknown>): NextRequest {
	return new NextRequest(
		"http://localhost:3000/api/teams/calendar/recurring-meetings",
		{
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
			},
		},
	);
}

export function createGetRequest(query?: string): NextRequest {
	const url = query
		? `http://localhost:3000/api/teams/calendar/recurring-meetings?${query}`
		: "http://localhost:3000/api/teams/calendar/recurring-meetings";
	return new NextRequest(url);
}
