import logger from "@/lib/utils/logging/logger";
import type { TRPCLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import { share, tap } from "@trpc/server/observable";

type DedupeKey = string;

const getDedupeKey = (type: string, path: string, input: unknown) =>
	`${type}:${path}:${JSON.stringify(input)}`;

export function dedupeLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
	const inFlight = new Map<
		DedupeKey,
		ReturnType<ReturnType<TRPCLink<TRouter>>>
	>();

	return () => {
		return ({ op, next }) => {
			if (op.type !== "query") {
				return next(op);
			}

			const key = getDedupeKey(op.type, op.path, op.input);
			const existing = inFlight.get(key);
			if (existing) {
				logger.dev.structured("debug", "[tRPC] Dedupe hit", {
					path: op.path,
				});
				return existing;
			}

			const shared$ = next(op).pipe(
				tap({
					error: () => {
						inFlight.delete(key);
					},
					complete: () => {
						inFlight.delete(key);
					},
				}),
				share(),
			);

			inFlight.set(key, shared$);
			return shared$;
		};
	};
}
