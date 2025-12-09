import { NextRequest } from "next/server";

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

export function createMockRequest(
	url: string,
	method = "GET",
	body?: unknown,
	headers?: Record<string, string>,
): NextRequest {
	const requestInit: NextRequestInit = {
		method,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
	};

	if (body) {
		requestInit.body = JSON.stringify(body);
	}

	return new NextRequest(url, requestInit);
}

export function createAuthenticatedRequest(
	url: string,
	userId: string,
	method = "GET",
	body?: unknown,
): NextRequest {
	return createMockRequest(url, method, body, {
		Authorization: `Bearer mock-token-${userId}`,
	});
}
