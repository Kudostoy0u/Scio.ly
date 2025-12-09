/**
 * Helper functions for recurring meetings route tests
 */

import type { PgSelectBuilder } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";
import { vi } from "vitest";

export function createDrizzleSelectChain(
	result: unknown[],
): PgSelectBuilder<any, "db"> {
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue(result),
		}),
	} as unknown as PgSelectBuilder<any, "db">;
}

export function createDrizzleSelectChainWithLimit(
	result: unknown[],
): PgSelectBuilder<any, "db"> {
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue(result),
			}),
		}),
	} as unknown as PgSelectBuilder<any, "db">;
}

export function createDrizzleSelectChainWithInnerJoin(
	result: unknown[],
): PgSelectBuilder<any, "db"> {
	return {
		from: vi.fn().mockReturnValue({
			innerJoin: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(result),
				}),
			}),
		}),
	} as unknown as PgSelectBuilder<any, "db">;
}

export function createDrizzleSelectChainWithLeftJoin(
	result: unknown[],
): PgSelectBuilder<any, "db"> {
	return {
		from: vi.fn().mockReturnValue({
			leftJoin: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue(result),
				}),
			}),
		}),
	} as unknown as PgSelectBuilder<any, "db">;
}

interface MockInsertBuilder {
	values: ReturnType<typeof vi.fn>;
}

export function createDrizzleInsertChain(result: unknown[]): MockInsertBuilder {
	return {
		values: vi.fn().mockReturnValue({
			returning: vi.fn().mockResolvedValue(result),
		}),
	};
}

export function createDrizzleInsertChainReject(
	error: Error,
): MockInsertBuilder {
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
