import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shareCodes, questions, idEvents } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { ShareCodeRequest, ShareCodeResponse } from '@/lib/types/api';


export async function POST(request: NextRequest) {
  try {
    const body: ShareCodeRequest = await request.json();

    if (!body.questionIds || body.questionIds.length === 0 || !body.testParamsRaw) {
      const response: ShareCodeResponse = {
        success: false,
        error: 'Invalid question IDs',
      };
      return NextResponse.json(response, { status: 400 });
    }


    const validQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(inArray(questions.id, body.questionIds));

    const validIdQuestions = await db
      .select({ id: idEvents.id })
      .from(idEvents)
      .where(inArray(idEvents.id, body.questionIds));

    const totalValidQuestions = validQuestions.length + validIdQuestions.length;

    if (totalValidQuestions !== body.questionIds.length) {
      const response: ShareCodeResponse = {
        success: false,
        error: 'Some question IDs are invalid',
      };
      return NextResponse.json(response, { status: 400 });
    }


    let shareCode = body.code;
    if (!shareCode) {
      const charset = "0123456789abcdefghijklmnopqrstuvwxyz";
      let randomString = '';
      for (let i = 0; i < 6; i++) {
        randomString += charset[Math.floor(Math.random() * charset.length)];
      }
      shareCode = randomString.toUpperCase();
    }


    const existingResult = await db
      .select({ id: shareCodes.id })
      .from(shareCodes)
      .where(eq(shareCodes.code, shareCode));

    if (existingResult.length > 0) {
      const response: ShareCodeResponse = {
        success: false,
        error: 'Code already exists',
      };
      return NextResponse.json(response, { status: 400 });
    }


    const dataToStore = {
      questionIds: body.questionIds,
      idQuestionIds: body.idQuestionIds || [],
      testParamsRaw: body.testParamsRaw,
      timeRemainingSeconds: body.timeRemainingSeconds || null,
      createdAtMs: Date.now(),
    };


    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);


    await db.insert(shareCodes).values({
      code: shareCode,
      indices: [],
      testParamsRaw: dataToStore,
      expiresAt: expiresAt,
    });


    const response: ShareCodeResponse = {
      success: true,
      data: {
        shareCode,
        expiresAt: expiresAt.toISOString(),
      },
    };

    console.log(`✅ [SHARE/GENERATE] Generated share code: ${shareCode}, expires: ${expiresAt.toISOString()}`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [SHARE/GENERATE] Error:', error);
    const response: ShareCodeResponse = {
      success: false,
      error: 'Failed to generate share code',
    };
    return NextResponse.json(response, { status: 500 });
  }
}