import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shareCodes } from '@/lib/db/schema';
import { eq, gt, and, lte } from 'drizzle-orm';
import { ShareCodeData } from '@/lib/types/api';

interface TestParamsRaw {
  questionIds?: string[];
  idQuestionIds?: string[];
  testParamsRaw?: Record<string, unknown>;
  timeRemainingSeconds?: number | null;
  createdAtMs?: number;
}


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      const response: ShareCodeData = {
        success: false,
        error: 'Missing share code',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log(`🔍 [SHARE/GET] Looking up share code: ${code}`);


    const result = await db
      .select({
        testParamsRaw: shareCodes.testParamsRaw,
        expiresAt: shareCodes.expiresAt
      })
      .from(shareCodes)
      .where(and(eq(shareCodes.code, code), gt(shareCodes.expiresAt, new Date())));

    if (result.length === 0) {
      console.log(`❌ [SHARE/GET] Share code not found or expired: ${code}`);
      const response: ShareCodeData = {
        success: false,
        error: 'Share code not found or expired',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const shareData = result[0];
    
    try {
      // testparamsraw is already a json object (jsonb column)
      const testParamsRaw = shareData.testParamsRaw as TestParamsRaw;
      
      if (!testParamsRaw) {
        console.log(`❌ [SHARE/GET] No data found for code: ${code}`);
        const response: ShareCodeData = {
          success: false,
          error: 'Invalid share data format',
        };
        return NextResponse.json(response, { status: 500 });
      }
      
      console.log(`✅ [SHARE/GET] Found share code: ${code}, expires: ${shareData.expiresAt}`);
      
      const response: ShareCodeData = {
        success: true,
        data: {
          questionIds: testParamsRaw.questionIds || [],
          idQuestionIds: testParamsRaw.idQuestionIds || [],
          testParamsRaw: testParamsRaw.testParamsRaw || {},
          timeRemainingSeconds: testParamsRaw.timeRemainingSeconds ?? undefined,
          createdAtMs: testParamsRaw.createdAtMs || Date.now(),
        },
      };

      return NextResponse.json(response);
    } catch (parseError) {
      console.error(`❌ [SHARE/GET] Failed to parse test_params_raw for code: ${code}`, parseError);
      const response: ShareCodeData = {
        success: false,
        error: 'Invalid share data format',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('❌ [SHARE/GET] Database error:', error);
    const response: ShareCodeData = {
      success: false,
      error: 'Failed to retrieve share data',
    };
    return NextResponse.json(response, { status: 500 });
  }
}


export async function DELETE() {
  try {
    console.log('🧹 [SHARE/CLEANUP] Starting cleanup of expired share codes');

    await db.delete(shareCodes).where(lte(shareCodes.expiresAt, new Date()));


    console.log('🧹 [SHARE/CLEANUP] Cleanup completed');

    return NextResponse.json({
      success: true,
      message: 'Expired share codes cleaned up',
    });
  } catch (error) {
    console.error('❌ [SHARE/CLEANUP] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup expired share codes',
    }, { status: 500 });
  }
}