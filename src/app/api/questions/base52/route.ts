import { generateQuestionCodes } from "@/lib/utils/base52";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionIds, table = "questions" } = body;

    if (!(questionIds && Array.isArray(questionIds)) || questionIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid question IDs provided",
        },
        { status: 400 }
      );
    }

    if (table !== "questions" && table !== "idEvents") {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid table specified. Must be "questions" or "idEvents"',
        },
        { status: 400 }
      );
    }

    const codeMap = await generateQuestionCodes(questionIds, table);

    const codes: Record<string, string> = {};
    codeMap.forEach((code, id) => {
      codes[id] = code;
    });

    return NextResponse.json({
      success: true,
      data: {
        codes,
        table,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate base52 codes",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Code parameter is required",
        },
        { status: 400 }
      );
    }

    const { getQuestionByCode } = await import("@/lib/utils/base52");

    const result = await getQuestionByCode(code);

    return NextResponse.json({
      success: true,
      data: {
        question: result.question,
        table: result.table,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve question by code",
      },
      { status: 500 }
    );
  }
}
