import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ShareCodeData } from '@/lib/types/api';

interface TestParamsRaw {
  questionIds?: string[];
  testParamsRaw?: Record<string, unknown>;
  timeRemainingSeconds?: number | null;
  createdAtMs?: number;
}

// GET /api/share - Get share code data
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

    // Get share code data, ensuring it hasn't expired
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
      console.log(`❌ [SHARE/GET] Share code not found or expired: ${code}`);
      const response: ShareCodeData = {
        success: false,
        error: 'Share code not found or expired',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const shareData = result[0];
    
    try {
      // test_params_raw is already a JSON object (JSONB column)
      const testParamsRaw = shareData.test_params_raw;
      
      if (!testParamsRaw) {
        console.log(`❌ [SHARE/GET] No data found for code: ${code}`);
        const response: ShareCodeData = {
          success: false,
          error: 'Invalid share data format',
        };
        return NextResponse.json(response, { status: 500 });
      }
      
      console.log(`✅ [SHARE/GET] Found share code: ${code}, expires: ${shareData.expires_at}`);
      
      const response: ShareCodeData = {
        success: true,
        data: {
          questionIds: testParamsRaw.questionIds || [],
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

// DELETE /api/share/cleanup - Cleanup expired share codes
export async function DELETE() {
  try {
    console.log('🧹 [SHARE/CLEANUP] Starting cleanup of expired share codes');

    const query = "DELETE FROM share_codes WHERE expires_at <= CURRENT_TIMESTAMP";
    await executeQuery(query);

    // Note: Neon doesn't return rowsAffected in serverless mode
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