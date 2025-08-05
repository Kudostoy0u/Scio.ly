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

    // Store Codebusters-specific data with quote UUIDs and cipher types
    const dataToStore = {
      eventName: 'Codebusters',
      testParams: body.testParams || {},
      timeRemainingSeconds: body.timeRemainingSeconds || null,
      createdAtMs: Date.now(),
    };

    const insertQuery = `
      INSERT INTO share_codes (code, indices, test_params_raw, expires_at) 
      VALUES ($1, $2, $3, $4)
    `;

    const quoteUUIDsData = body.quoteUUIDs || [];
    console.log(`🔍 [CODEBUSTERS/SHARE/GENERATE] Storing ${quoteUUIDsData.length} quotes with UUIDs and cipher types:`, quoteUUIDsData);
    
    await executeQuery(insertQuery, [
      shareCode,
      JSON.stringify(quoteUUIDsData), // Store quote UUIDs in dedicated indices column
      JSON.stringify(dataToStore), // Store other test params without duplicating UUIDs
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