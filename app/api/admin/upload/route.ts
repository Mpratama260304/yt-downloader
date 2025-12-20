import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { setSetting } from '@/lib/db';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json(
        { success: false, error: 'File and type are required' },
        { status: 400 }
      );
    }

    if (!['logo', 'favicon'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = type === 'logo' 
      ? ['image/png', 'image/svg+xml', 'image/jpeg']
      : ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon'];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type for ${type}` },
        { status: 400 }
      );
    }

    // Generate filename
    const ext = file.type === 'image/svg+xml' ? 'svg' 
      : file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon' ? 'ico'
      : file.type === 'image/png' ? 'png'
      : 'jpg';
    
    const filename = type === 'logo' ? `logo.${ext}` : `favicon.${ext}`;
    const publicPath = path.join(process.cwd(), 'public', filename);

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Write to public directory
    fs.writeFileSync(publicPath, buffer);

    // Update setting in database
    const settingKey = type === 'logo' ? 'logo_path' : 'favicon_path';
    await setSetting(settingKey, `/${filename}`);

    return NextResponse.json({
      success: true,
      data: {
        path: `/${filename}`,
      },
    });
  } catch (error) {
    console.error('[Admin] Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
