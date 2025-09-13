import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shareLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();


    const charset = "0123456789abcdefghijklmnopqrstuvwxyz";
    let shareCode = '';
    for (let i = 0; i < 6; i++) {
      shareCode += charset[Math.floor(Math.random() * charset.length)];
    }
    shareCode = shareCode.toUpperCase(); // 6-character code, no prefix


    const existingResult = await db
      .select({ id: shareLinks.id })
      .from(shareLinks)
      .where(eq(shareLinks.code, shareCode));

    if (existingResult.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Code already exists',
      }, { status: 400 });
    }


    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);


    const dataToStore = {
      eventName: 'Codebusters',
      testParams: body.testParams || {},
      timeRemainingSeconds: body.timeRemainingSeconds || null,
      createdAtMs: Date.now(),
    };

    const shareData = body.shareData || {};
    console.log(`🔍 [CODEBUSTERS/SHARE/GENERATE] Storing complete share data with ${shareData.processedQuotes?.length || 0} quotes`);
    
    await db.insert(shareLinks).values({
      code: shareCode,
      indices: shareData,
      testParamsRaw: dataToStore,
      expiresAt: expiresAt,
    });

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