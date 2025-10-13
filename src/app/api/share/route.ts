import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shareLinks } from '@/lib/db/schema';
import { eq, gt, and, lte } from 'drizzle-orm';
import { ShareCodeData } from '@/lib/types/api';
import logger from '@/lib/utils/logger';

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

    logger.info(`Looking up share code: ${code}`);


    const result = await db
      .select({
        testParamsRaw: shareLinks.testParamsRaw,
        expiresAt: shareLinks.expiresAt
      })
      .from(shareLinks)
      .where(and(eq(shareLinks.code, code), gt(shareLinks.expiresAt, new Date())));

    if (result.length === 0) {
      logger.warn(`Share code not found or expired: ${code}`);
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
        logger.error(`No data found for share code: ${code}`);
        const response: ShareCodeData = {
          success: false,
          error: 'Invalid share data format',
        };
        return NextResponse.json(response, { status: 500 });
      }

      logger.info(`Found share code: ${code}`, { expiresAt: shareData.expiresAt });
      
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
      logger.error(`Failed to parse test_params_raw for share code: ${code}`, parseError);
      const response: ShareCodeData = {
        success: false,
        error: 'Invalid share data format',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    logger.error('Share code lookup database error:', error);
    const response: ShareCodeData = {
      success: false,
      error: 'Failed to retrieve share data',
    };
    return NextResponse.json(response, { status: 500 });
  }
}


export async function DELETE() {
  try {
    logger.info('Starting cleanup of expired share codes');

    await db.delete(shareLinks).where(lte(shareLinks.expiresAt, new Date()));

    logger.info('Share codes cleanup completed');

    return NextResponse.json({
      success: true,
      message: 'Expired share codes cleaned up',
    });
  } catch (error) {
    logger.error('Share codes cleanup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup expired share codes',
    }, { status: 500 });
  }
}