import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ShareCodeRequest, ShareCodeResponse } from '@/lib/types/api';

// POST /api/share/generate - Generate a share code for test questions
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

    // Validate that all question IDs exist in the database
    const placeholders = body.questionIds.map((_, index) => `$${index + 1}`).join(',');
    const validationQuery = `SELECT id FROM questions WHERE id IN (${placeholders})`;
    
    const validQuestions = await executeQuery<{ id: string }>(validationQuery, body.questionIds);

    if (validQuestions.length !== body.questionIds.length) {
      const response: ShareCodeResponse = {
        success: false,
        error: 'Some question IDs are invalid',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Generate code if not provided - using same method as JavaScript
    let shareCode = body.code;
    if (!shareCode) {
      const charset = "0123456789abcdefghijklmnopqrstuvwxyz";
      let randomString = '';
      for (let i = 0; i < 6; i++) {
        randomString += charset[Math.floor(Math.random() * charset.length)];
      }
      shareCode = randomString.toUpperCase();
    }

    // Check if code already exists
    const existingQuery = "SELECT id FROM share_codes WHERE code = $1";
    const existingResult = await executeQuery(existingQuery, [shareCode]);

    if (existingResult.length > 0) {
      const response: ShareCodeResponse = {
        success: false,
        error: 'Code already exists',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Embed questionIds into the test_params_raw object (like Node.js implementation)
    const dataToStore = {
      questionIds: body.questionIds,
      testParamsRaw: body.testParamsRaw,
      timeRemainingSeconds: body.timeRemainingSeconds || null,
      createdAtMs: Date.now(),
    };

    const testParamsJSON = JSON.stringify(dataToStore);

    // Calculate expiration time (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert into database using existing schema (indices column for compatibility)
    const insertQuery = `
      INSERT INTO share_codes (code, indices, test_params_raw, expires_at) 
      VALUES ($1, $2, $3, $4)
    `;

    await executeQuery(insertQuery, [
      shareCode,
      "[]", // Empty array for compatibility
      testParamsJSON,
      expiresAt.toISOString(),
    ]);

    // Return response in same format as JavaScript version
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