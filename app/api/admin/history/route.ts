import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getHistory, clearHistory } from '@/lib/db';
import type { HistoryEntry } from '@/lib/db/schema';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const history = await getHistory(100, 0);

    // Format dates
    const formattedHistory = history.map((h: HistoryEntry) => ({
      id: h.id,
      url: h.url,
      title: h.title,
      format: h.format,
      ip: h.ip,
      success: h.success,
      error: h.error,
      createdAt: h.createdAt ? new Date(h.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedHistory,
    });
  } catch (error) {
    console.error('[Admin] History get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get history' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await clearHistory();

    return NextResponse.json({
      success: true,
      message: 'History cleared',
    });
  } catch (error) {
    console.error('[Admin] History clear error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear history' },
      { status: 500 }
    );
  }
}
