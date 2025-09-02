import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types/api';


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      const response: ApiResponse = {
        success: false,
        error: 'No image file provided',
      };
      return NextResponse.json(response, { status: 400 });
    }


    if (!imageFile.type.startsWith('image/')) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid file type. Only image files are allowed.',
      };
      return NextResponse.json(response, { status: 400 });
    }


    if (imageFile.size > 5 * 1024 * 1024) {
      const response: ApiResponse = {
        success: false,
        error: 'File size too large. Maximum size is 5MB.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('📤 [UPLOAD-IMAGE] Uploading image:', imageFile.name, 'Size:', imageFile.size);



    const cdnUrl = `https://example-cdn.com/images/${Date.now()}-${imageFile.name}`;


    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ [UPLOAD-IMAGE] Image uploaded successfully:', cdnUrl);

    const response: ApiResponse = {
      success: true,
      data: {
        url: cdnUrl,
        filename: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/upload-image error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to upload image',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
