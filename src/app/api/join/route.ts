import { type NextRequest, NextResponse } from "next/server";

const REQUESTS: Record<string, { count: number; resetAt: number }> = {};
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = REQUESTS[ip];
	if (!entry || entry.resetAt < now) {
		REQUESTS[ip] = { count: 1, resetAt: now + WINDOW_MS };
		return false;
	}
	entry.count += 1;
	return entry.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
	try {
		const ip =
			req.headers.get("x-forwarded-for") ||
			req.headers.get("x-real-ip") ||
			"unknown";
		if (rateLimited(String(ip))) {
			return NextResponse.json(
				{ success: false, message: "Too many requests" },
				{ status: 429 },
			);
		}

		const {
			name,
			email,
			discordId,
			position,
			hoursPerWeek,
			experience,
			message,
		} = await req.json();
		if (!(name && email && discordId && position && hoursPerWeek && message)) {
			return NextResponse.json(
				{ success: false, message: "Missing required fields" },
				{ status: 400 },
			);
		}

		const webhookUrl =
			"https://discord.com/api/webhooks/1411836447379689657/1AFOH8UU2AHcDZfYi674ABrQFzzk8Aa_GbiU0ZnPwG54xNYr6BfWl_nJj5Kas0yF_Owx";
		if (!webhookUrl) {
			return NextResponse.json(
				{ success: false, message: "Careers webhook not configured" },
				{ status: 500 },
			);
		}

		const embed = {
			title: "🎯 New Job Application",
			color: 0x00ff00,
			fields: [
				{ name: "👤 Name", value: String(name), inline: true },
				{ name: "📧 Email", value: String(email), inline: true },
				{ name: "💬 Discord ID", value: String(discordId), inline: true },
				{ name: "💼 Position", value: String(position), inline: true },
				{
					name: "⏰ Hours per Week",
					value: String(hoursPerWeek),
					inline: true,
				},
				{
					name: "📝 Experience",
					value: String(experience || "Not provided"),
					inline: false,
				},
				{ name: "📄 Cover Letter", value: String(message), inline: false },
			],
			timestamp: new Date().toISOString(),
			footer: {
				text: "Scio.ly Careers Application",
			},
		};

		const resp = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ embeds: [embed] }),
		});

		if (!resp.ok) {
			return NextResponse.json(
				{ success: false, message: "Failed to submit application" },
				{ status: 502 },
			);
		}

		return NextResponse.json({
			success: true,
			message: "Application submitted successfully!",
		});
	} catch {
		return NextResponse.json(
			{ success: false, message: "Unexpected error" },
			{ status: 500 },
		);
	}
}
