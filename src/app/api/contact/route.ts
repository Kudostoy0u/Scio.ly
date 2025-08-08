import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limit (per IP) for low volume; replace with durable store if needed
const REQUESTS: Record<string, { count: number; resetAt: number }> = {}
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 10

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = REQUESTS[ip]
  if (!entry || entry.resetAt < now) {
    REQUESTS[ip] = { count: 1, resetAt: now + WINDOW_MS }
    return false
  }
  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    if (rateLimited(String(ip))) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 })
    }

    const { name, email, topic, message } = await req.json()
    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    const webhookUrl = process.env.DISCORD_CONTACT_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ success: false, message: 'Contact webhook not configured' }, { status: 500 })
    }

    const embed = {
      title: 'New Contact Form Submission',
      color: 0x0099ff,
      fields: [
        { name: 'Name', value: String(name), inline: true },
        { name: 'Email', value: String(email), inline: true },
        { name: 'Topic', value: String(topic || 'general'), inline: true },
        { name: 'Message', value: String(message), inline: false },
      ],
      timestamp: new Date().toISOString(),
    }

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!resp.ok) {
      return NextResponse.json({ success: false, message: 'Failed to send message' }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully!' })
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Unexpected error' }, { status: 500 })
  }
}


