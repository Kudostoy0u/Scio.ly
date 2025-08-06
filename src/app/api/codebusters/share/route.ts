import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shareCodes } from '@/lib/db/schema';
import { eq, gt, and } from 'drizzle-orm';

interface TestParamsRaw {
  eventName?: string;
  encryptedQuotes?: unknown[];
  quoteUUIDs?: string[];
  testParams?: Record<string, unknown>;
  timeRemainingSeconds?: number | null;
  createdAtMs?: number;
}

interface ShareDataResult {
  testParamsRaw: TestParamsRaw;
  indices: unknown;
  expiresAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Missing share code',
      }, { status: 400 });
    }

    console.log(`🔍 [CODEBUSTERS/SHARE/GET] Looking up code: ${code}`);

    const result = await db
      .select({
        testParamsRaw: shareCodes.testParamsRaw,
        indices: shareCodes.indices,
        expiresAt: shareCodes.expiresAt
      })
      .from(shareCodes)
      .where(and(eq(shareCodes.code, code), gt(shareCodes.expiresAt, new Date())));

    if (result.length === 0) {
      console.log(`❌ [CODEBUSTERS/SHARE/GET] Code not found or expired: ${code}`);
      return NextResponse.json({
        success: false,
        error: 'Share code not found or expired',
      }, { status: 404 });
    }

    const shareData = result[0] as ShareDataResult;
    
    try {
      // testParamsRaw is already a JSON object (JSONB column)
      const testParamsRaw = shareData.testParamsRaw;
      
      if (!testParamsRaw) {
        console.log(`❌ [CODEBUSTERS/SHARE/GET] No data found for code: ${code}`);
        return NextResponse.json({
          success: false,
          error: 'Invalid share data format',
        }, { status: 500 });
      }
      
      // Check if this is actually a codebusters test
      if (testParamsRaw.eventName !== 'Codebusters') {
        console.log(`❌ [CODEBUSTERS/SHARE/GET] Code is not for Codebusters event: ${testParamsRaw.eventName}`);
        return NextResponse.json({
          success: false,
          error: 'This share code is not for a Codebusters test',
        }, { status: 400 });
      }
      
      console.log(`✅ [CODEBUSTERS/SHARE/GET] Found code: ${code}`);
      
      // Load complete share data including encryption details
      let shareDataComplete: Record<string, unknown> | null = null;
      
      // Since indices is stored as JSONB, it's already parsed as an object
      if (shareData.indices && typeof shareData.indices === 'object' && shareData.indices !== null) {
        // New format: Complete share data with encryption details
        shareDataComplete = shareData.indices as Record<string, unknown>;
        console.log(`🔍 [CODEBUSTERS/SHARE/GET] Found complete share data with ${(shareDataComplete.processedQuotes as unknown[])?.length || 0} quotes`);
      } else {
        // Legacy format - try to handle gracefully
        console.warn(`Legacy format detected for code ${code}, attempting migration`);
        shareDataComplete = null;
      }
      
      const testParams = testParamsRaw.testParams || {};
      
      if (!shareDataComplete || !shareDataComplete.processedQuotes || (shareDataComplete.processedQuotes as unknown[]).length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No complete share data found',
        }, { status: 400 });
      }

      // Use the stored processed quotes directly - no need to regenerate encryption
      const processedQuotes = shareDataComplete.processedQuotes as Array<{
        author: string;
        quote: string;
        encrypted: string;
        cipherType: string;
        key?: string;
        matrix?: number[][];
        portaKeyword?: string;
        fractionationTable?: { [key: string]: string };
        caesarShift?: number;
        affineA?: number;
        affineB?: number;
        difficulty: number;
      }>;
      
      console.log(`✅ [CODEBUSTERS/SHARE/GET] Using stored processed quotes with encryption details`);

      // Use the stored processed quotes directly - no need to regenerate encryption
      const finalProcessedQuotes = processedQuotes.map(quote => ({
        author: quote.author,
        quote: quote.quote,
        encrypted: quote.encrypted,
        cipherType: quote.cipherType,
        key: quote.key,
        matrix: quote.matrix,
        portaKeyword: quote.portaKeyword,
        fractionationTable: quote.fractionationTable,
        caesarShift: quote.caesarShift,
        affineA: quote.affineA,
        affineB: quote.affineB,
        difficulty: quote.difficulty || Math.random() * 0.8 + 0.2,
      }));
      
      console.log(`✅ [CODEBUSTERS/SHARE/GET] Returning ${finalProcessedQuotes.length} quotes with preserved encryption details`);

      return NextResponse.json({
        success: true,
        data: {
          quotes: finalProcessedQuotes,
          testParams: testParams,
          timeRemainingSeconds: testParamsRaw.timeRemainingSeconds,
        },
      });
    } catch (error) {
      console.error('❌ [CODEBUSTERS/SHARE/GET] Error processing share data:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to process share data',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ [CODEBUSTERS/SHARE/GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve share code',
    }, { status: 500 });
  }
}