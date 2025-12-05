import type { ApiResponse } from "@/lib/types/api";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const imageFile = formData.get("image") as File;

		if (!imageFile) {
			const response: ApiResponse = {
				success: false,
				error: "No image file provided",
			};
			return NextResponse.json(response, { status: 400 });
		}

		if (!imageFile.type.startsWith("image/")) {
			const response: ApiResponse = {
				success: false,
				error: "Invalid file type. Only image files are allowed.",
			};
			return NextResponse.json(response, { status: 400 });
		}

		if (imageFile.size > 5 * 1024 * 1024) {
			const response: ApiResponse = {
				success: false,
				error: "File size too large. Maximum size is 5MB.",
			};
			return NextResponse.json(response, { status: 400 });
		}

		const cdnUrl = `https://example-cdn.com/images/${Date.now()}-${imageFile.name}`;

		await new Promise((resolve) => setTimeout(resolve, 1000));

		const response: ApiResponse = {
			success: true,
			data: {
				url: cdnUrl,
				filename: imageFile.name,
				size: imageFile.size,
				type: imageFile.type,
			},
		};

		return NextResponse.json(response);
	} catch (_error) {
		const response: ApiResponse = {
			success: false,
			error: "Failed to upload image",
		};
		return NextResponse.json(response, { status: 500 });
	}
}
