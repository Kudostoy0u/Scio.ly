import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';

// POST /api/codebusters/share/generate - Generate Codebusters-specific share code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate 6-character code (same as regular share codes)
    const charset = "0123456789abcdefghijklmnopqrstuvwxyz";
    let shareCode = '';
    for (let i = 0; i < 6; i++) {
      shareCode += charset[Math.floor(Math.random() * charset.length)];
    }
    shareCode = shareCode.toUpperCase(); // 6-character code, no prefix

    // Check if code already exists
    const existingQuery = "SELECT id FROM share_codes WHERE code = $1";
    const existingResult = await executeQuery(existingQuery, [shareCode]);

    if (existingResult.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Code already exists',
      }, { status: 400 });
    }

    // Calculate expiration time (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store Codebusters-specific data in the same format as regular shares
    const dataToStore = {
      eventName: 'Codebusters',
      encryptedQuotes: body.encryptedQuotes || [],
      testParams: body.testParams || {},
      timeRemainingSeconds: body.timeRemainingSeconds || null,
      createdAtMs: Date.now(),
    };

    const insertQuery = `
      INSERT INTO share_codes (code, indices, test_params_raw, expires_at) 
      VALUES ($1, $2, $3, $4)
    `;

    await executeQuery(insertQuery, [
      shareCode,
      "[]", // Empty array for indices column to satisfy not-null constraint
      JSON.stringify(dataToStore),
      expiresAt.toISOString(),
    ]);

    console.log(`✅ [CODEBUSTERS/SHARE/GENERATE] Generated code: ${shareCode}`);

    return NextResponse.json({
      success: true,
      data: {
        shareCode,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ [CODEBUSTERS/SHARE/GENERATE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate Codebusters share code',
    }, { status: 500 });
  }
}