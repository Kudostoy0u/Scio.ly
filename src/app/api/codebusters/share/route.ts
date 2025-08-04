import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';

interface TestParamsRaw {
  eventName?: string;
  encryptedQuotes?: unknown[];
  testParams?: Record<string, unknown>;
  timeRemainingSeconds?: number | null;
  createdAtMs?: number;
}

// GET /api/codebusters/share - Get Codebusters share code data
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

    const query = `
      SELECT test_params_raw, expires_at 
      FROM share_codes 
      WHERE code = $1 AND expires_at > CURRENT_TIMESTAMP
    `;

    const result = await executeQuery<{
      test_params_raw: TestParamsRaw; // JSONB column returns object, not string
      expires_at: string;
    }>(query, [code]);

    if (result.length === 0) {
      console.log(`❌ [CODEBUSTERS/SHARE/GET] Code not found or expired: ${code}`);
      return NextResponse.json({
        success: false,
        error: 'Share code not found or expired',
      }, { status: 404 });
    }

    const shareData = result[0];
    
    try {
      // test_params_raw is already a JSON object (JSONB column)
      const testParamsRaw = shareData.test_params_raw;
      
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
      
      return NextResponse.json({
        success: true,
        encryptedQuotes: testParamsRaw.encryptedQuotes || [],
        testParams: testParamsRaw.testParams || {},
        adjustedTimeRemaining: testParamsRaw.timeRemainingSeconds || null,
      });
    } catch (parseError) {
      console.error(`❌ [CODEBUSTERS/SHARE/GET] Parse error for code: ${code}`, parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid share data format',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ [CODEBUSTERS/SHARE/GET] Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve share data',
    }, { status: 500 });
  }
}