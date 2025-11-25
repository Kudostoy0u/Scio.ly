import { upsertUserProfile } from "@/lib/db/teams/utils";
import logger from "@/lib/utils/logger";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = await req.json();
    const { id, email, displayName, username } = body || {};

    logger.dev.request("POST", "/api/profile/sync", {
      id: typeof id === "string" ? id : "[invalid]",
      hasEmail: !!email,
      hasDisplayName: typeof displayName === "string" && !!displayName.trim(),
      hasUsername: typeof username === "string" && !!username.trim(),
    });

    if (!id || typeof id !== "string" || !id.trim()) {
      logger.warn("profile/sync: missing or invalid id", { id });
      const res = NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
      logger.dev.response(res.status, { error: "Missing or invalid id" }, Date.now() - startedAt);
      return res;
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      logger.warn("profile/sync: missing or invalid email", { email });
      const res = NextResponse.json({ error: "Missing or invalid email" }, { status: 400 });
      logger.dev.response(
        res.status,
        { error: "Missing or invalid email" },
        Date.now() - startedAt
      );
      return res;
    }

    const trimmedUsername = typeof username === "string" ? username.trim() : undefined;
    const trimmedDisplayName = typeof displayName === "string" ? displayName.trim() : undefined;

    const name: string | undefined =
      trimmedDisplayName && trimmedDisplayName.length > 0
        ? trimmedDisplayName
        : trimmedUsername && trimmedUsername.length > 0
          ? `@${trimmedUsername}`
          : undefined;

    try {
      await upsertUserProfile({
        id,
        email,
        name,
        username: trimmedUsername || undefined,
        displayName: trimmedDisplayName || undefined,
      });
    } catch (err: unknown) {
      logger.error("profile/sync: upsertUserProfile failed", err);
      logger.dev.error(
        "profile/sync upsert failed",
        err instanceof Error ? err : new Error(String(err)),
        {
          id,
          email,
          name,
          username: trimmedUsername,
          hasDisplayName: !!trimmedDisplayName,
        }
      );
      const res = NextResponse.json({ error: "Database upsert failed" }, { status: 500 });
      logger.dev.response(res.status, { error: "Database upsert failed" }, Date.now() - startedAt);
      return res;
    }

    const res = NextResponse.json({ ok: true });
    logger.dev.response(res.status, { ok: true }, Date.now() - startedAt);
    return res;
  } catch (error: unknown) {
    logger.error("profile/sync: unhandled error", error);
    logger.dev.error(
      "profile/sync unhandled error",
      error instanceof Error ? error : new Error(String(error))
    );
    const res = NextResponse.json({ error: "Failed to sync profile" }, { status: 500 });
    logger.dev.response(res.status, { error: "Failed to sync profile" }, Date.now() - startedAt);
    return res;
  }
}
