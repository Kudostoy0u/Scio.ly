import type { ApiResponse } from "@/lib/types/api";
import { type NextRequest, NextResponse } from "next/server";
import {
	handleApplyAllEdits,
	handleApplyAllRemoved,
	handleApplyEdit,
	handleApplyRemoved,
	handleDeleteEdit,
	handleDeleteRemoved,
	handleGetAdminData,
	handleRestoreAllRemoved,
	handleUndoAllEdits,
	handleUndoEdit,
	handleUndoRemove,
} from "./handlers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function checkAdminPassword(request: NextRequest): boolean {
	const password = request.headers.get("X-Admin-Password");
	return password === ADMIN_PASSWORD;
}

type AdminAction =
	| "undoEdit"
	| "undoAllEdits"
	| "applyEdit"
	| "applyAllEdits"
	| "undoRemove"
	| "restoreAllRemoved"
	| "applyRemoved"
	| "applyAllRemoved"
	| "deleteEdit"
	| "deleteRemoved";

type ActionHandler = (id?: string) => Promise<NextResponse>;

function requireId(id: string | undefined): NextResponse | null {
	if (!id) {
		return NextResponse.json(
			{ success: false, error: "Missing id" } as ApiResponse,
			{
				status: 400,
			},
		);
	}
	return null;
}

export async function GET(request: NextRequest) {
	if (!checkAdminPassword(request)) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	return handleGetAdminData();
}

export async function POST(request: NextRequest) {
	if (!checkAdminPassword(request)) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	try {
		const body = await request.json();
		const action: AdminAction = body.action;
		const id: string | undefined = body.id;

		if (!action) {
			const response: ApiResponse = { success: false, error: "Missing action" };
			return NextResponse.json(response, { status: 400 });
		}

		const handlers: Record<AdminAction, ActionHandler> = {
			undoEdit: async (id?: string) => {
				const error = requireId(id);
				if (error) {
					return error;
				}
				if (!id) {
					return NextResponse.json(
						{ success: false, error: "Missing id" } as ApiResponse,
						{
							status: 400,
						},
					);
				}
				return await handleUndoEdit(id);
			},
			applyEdit: async (id?: string) => {
				const error = requireId(id);
				if (error) {
					return error;
				}
				if (!id) {
					return NextResponse.json(
						{ success: false, error: "Missing id" } as ApiResponse,
						{
							status: 400,
						},
					);
				}
				return await handleApplyEdit(id);
			},
			deleteEdit: async (id?: string) => {
				const error = requireId(id);
				if (error) {
					return error;
				}
				if (!id) {
					return NextResponse.json(
						{ success: false, error: "Missing id" } as ApiResponse,
						{
							status: 400,
						},
					);
				}
				return await handleDeleteEdit(id);
			},
			undoRemove: async (id?: string) => {
				const error = requireId(id);
				if (error) {
					return error;
				}
				if (!id) {
					return NextResponse.json(
						{ success: false, error: "Missing id" } as ApiResponse,
						{
							status: 400,
						},
					);
				}
				return await handleUndoRemove(id);
			},
			applyRemoved: async (id?: string) => {
				const error = requireId(id);
				if (error) {
					return error;
				}
				if (!id) {
					return NextResponse.json(
						{ success: false, error: "Missing id" } as ApiResponse,
						{
							status: 400,
						},
					);
				}
				return await handleApplyRemoved(id);
			},
			deleteRemoved: async (id?: string) => {
				const error = requireId(id);
				if (error) {
					return error;
				}
				if (!id) {
					return NextResponse.json(
						{ success: false, error: "Missing id" } as ApiResponse,
						{
							status: 400,
						},
					);
				}
				return await handleDeleteRemoved(id);
			},
			applyAllEdits: async () => await handleApplyAllEdits(),
			undoAllEdits: async () => await handleUndoAllEdits(),
			applyAllRemoved: async () => await handleApplyAllRemoved(),
			restoreAllRemoved: async () => await handleRestoreAllRemoved(),
		};

		const handler = handlers[action];
		if (!handler) {
			const response: ApiResponse = { success: false, error: "Unknown action" };
			return NextResponse.json(response, { status: 400 });
		}

		return handler(id);
	} catch (_error) {
		const response: ApiResponse = {
			success: false,
			error: "Failed to perform admin action",
		};
		return NextResponse.json(response, { status: 500 });
	}
}
