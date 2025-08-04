import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { Question, UpdateQuestionRequest, ApiResponse } from '@/lib/types/api';

// GET /api/questions/[id] - Fetch a specific question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const query = "SELECT * FROM questions WHERE id = $1";
    const result = await executeQuery<Question>(query, [id]);

    if (result.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Question not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<Question> = {
      success: true,
      data: result[0],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`GET /api/questions/${(await params).id} error:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch question',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/questions/[id] - Update a question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates: UpdateQuestionRequest = await request.json();

    // Build update query dynamically
    const setClause: string[] = [];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && value !== undefined) {
        if (key === 'options' || key === 'answers' || key === 'subtopics') {
          setClause.push(`${key} = $${paramIndex}`);
          queryParams.push(JSON.stringify(value));
        } else {
          setClause.push(`${key} = $${paramIndex}`);
          queryParams.push(value);
        }
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No valid fields to update',
      };
      return NextResponse.json(response, { status: 400 });
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    queryParams.push(id);

    const query = `
      UPDATE questions 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;

    const result = await executeQuery<Question>(query, queryParams);

    if (result.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Question not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<Question> = {
      success: true,
      data: result[0],
      message: 'Question updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`PUT /api/questions/${(await params).id} error:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update question',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/questions/[id] - Delete a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const query = "DELETE FROM questions WHERE id = $1";
    await executeQuery(query, [id]);

    // Note: Neon doesn't return rowsAffected like standard PostgreSQL
    // We'll check if the question existed first
    const checkQuery = "SELECT id FROM questions WHERE id = $1";
    const checkResult = await executeQuery(checkQuery, [id]);

    if (checkResult.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Question not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Question deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`DELETE /api/questions/${(await params).id} error:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete question',
    };
    return NextResponse.json(response, { status: 500 });
  }
}