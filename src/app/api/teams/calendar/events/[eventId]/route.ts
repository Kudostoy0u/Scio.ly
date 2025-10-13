import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Check if user has permission to delete this event
    const eventResult = await queryCockroachDB<{
      created_by: string;
      team_id: string;
    }>(
      `SELECT created_by, team_id FROM new_team_events WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = eventResult.rows[0];

    // Check if user is the creator or a captain of the team
    if (event.created_by !== user.id) {
      if (event.team_id) {
        const membershipResult = await queryCockroachDB<{ role: string }>(
          `SELECT role FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = $2 AND status = 'active'`,
          [user.id, event.team_id]
        );

        if (membershipResult.rows.length === 0 || 
            !['captain', 'co_captain'].includes(membershipResult.rows[0].role)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Delete the event
    await queryCockroachDB(
      `DELETE FROM new_team_events WHERE id = $1`,
      [eventId]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;
    const body = await request.json();

    // Check if user has permission to edit this event
    const eventResult = await queryCockroachDB<{
      created_by: string;
      team_id: string;
    }>(
      `SELECT created_by, team_id FROM new_team_events WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = eventResult.rows[0];

    // Check permissions
    if (event.created_by !== user.id) {
      if (event.team_id) {
        const membershipResult = await queryCockroachDB<{ role: string }>(
          `SELECT role FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = $2 AND status = 'active'`,
          [user.id, event.team_id]
        );

        if (membershipResult.rows.length === 0 || 
            !['captain', 'co_captain'].includes(membershipResult.rows[0].role)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Update the event
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 1;

    if (body.title !== undefined) {
      updateFields.push(`title = $${paramCount}`);
      queryParams.push(body.title);
      paramCount++;
    }

    if (body.description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      queryParams.push(body.description);
      paramCount++;
    }

    if (body.start_time !== undefined) {
      updateFields.push(`start_time = $${paramCount}`);
      queryParams.push(body.start_time);
      paramCount++;
    }

    if (body.end_time !== undefined) {
      updateFields.push(`end_time = $${paramCount}`);
      queryParams.push(body.end_time);
      paramCount++;
    }

    if (body.location !== undefined) {
      updateFields.push(`location = $${paramCount}`);
      queryParams.push(body.location);
      paramCount++;
    }

    if (body.event_type !== undefined) {
      updateFields.push(`event_type = $${paramCount}`);
      queryParams.push(body.event_type);
      paramCount++;
    }

    if (body.is_all_day !== undefined) {
      updateFields.push(`is_all_day = $${paramCount}`);
      queryParams.push(body.is_all_day);
      paramCount++;
    }

    if (body.is_recurring !== undefined) {
      updateFields.push(`is_recurring = $${paramCount}`);
      queryParams.push(body.is_recurring);
      paramCount++;
    }

    if (body.recurrence_pattern !== undefined) {
      updateFields.push(`recurrence_pattern = $${paramCount}`);
      queryParams.push(body.recurrence_pattern ? JSON.stringify(body.recurrence_pattern) : null);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push(`updated_at = NOW()`);
    queryParams.push(eventId);

    await queryCockroachDB(
      `UPDATE new_team_events SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
      queryParams
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({ error: 'Failed to update event', details: error.message }, { status: 500 });
  }
}
