import { NextResponse } from 'next/server';
// Notifications removed
export async function GET() { return NextResponse.json({ success: true, count: 0, items: [] }); }


