import { db } from "@/lib/db";
import { shareLinks } from "@/lib/db/schema/core";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const charset = "0123456789abcdefghijklmnopqrstuvwxyz";
    let shareCode = "";
    for (let i = 0; i < 6; i++) {
      shareCode += charset[Math.floor(Math.random() * charset.length)];
    }
    shareCode = shareCode.toUpperCase(); // 6-character code, no prefix

    const existingResult = await db
      .select({ id: shareLinks.id })
      .from(shareLinks)
      .where(eq(shareLinks.code, shareCode));

    if (existingResult.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Code already exists",
        },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const dataToStore = {
      eventName: "Codebusters",
      testParams: body.testParams || {},
      timeRemainingSeconds: body.timeRemainingSeconds || null,
      createdAtMs: Date.now(),
    };

    const shareData = body.shareData || {};

    // CockroachDB can reject JSONB with invalid surrogate pairs (common with emoji).
    // Sanitize by stripping surrogate code units to ensure valid UTF-8 JSON.
    const sanitizeJsonForDb = (val: unknown): unknown => {
      if (val == null) {
        return val;
      }
      if (Array.isArray(val)) {
        return val.map(sanitizeJsonForDb);
      }
      if (typeof val === "object") {
        const o: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          o[k] = sanitizeJsonForDb(v);
        }
        return o;
      }
      if (typeof val === "string") {
        // Remove all UTF-16 surrogate halves to avoid broken pairs
        return val.replace(/[\uD800-\uDFFF]/g, "");
      }
      return val;
    };

    const sanitizedShareData = sanitizeJsonForDb(shareData);

    await db.insert(shareLinks).values({
      code: shareCode,
      indices: sanitizedShareData,
      testParamsRaw: dataToStore,
      expiresAt: expiresAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        shareCode,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (_error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate Codebusters share code",
      },
      { status: 500 }
    );
  }
}
