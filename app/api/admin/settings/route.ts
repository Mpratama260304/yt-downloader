import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllSettings, setSetting } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await getAllSettings();

    return NextResponse.json({
      success: true,
      data: {
        site_name: settings.site_name || '',
        site_description: settings.site_description || '',
        logo_path: settings.logo_path || '/icon.svg',
        favicon_path: settings.favicon_path || '/favicon.ico',
      },
    });
  } catch (error) {
    console.error('[Admin] Settings get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { site_name, site_description, logo_path, favicon_path } = body;

    // Update settings
    if (site_name !== undefined) {
      await setSetting('site_name', site_name);
    }
    if (site_description !== undefined) {
      await setSetting('site_description', site_description);
    }
    if (logo_path !== undefined) {
      await setSetting('logo_path', logo_path);
    }
    if (favicon_path !== undefined) {
      await setSetting('favicon_path', favicon_path);
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated',
    });
  } catch (error) {
    console.error('[Admin] Settings update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
