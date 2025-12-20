import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllSettings, getHistory, getHistoryCount } from '@/lib/db';
import { getAutoCookiesStats, getCookiesUrl, isAutoCookiesEnabled } from '@/lib/auto-cookies';
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

    // Get all stats
    const settings = await getAllSettings();
    const history = await getHistory(100, 0);
    const historyCount = await getHistoryCount();
    
    // Get auto-cookies stats (v5.0)
    const autoCookiesStats = getAutoCookiesStats();

    const historyStats = {
      total: historyCount,
      success: history.filter((h: HistoryEntry) => h.success).length,
      failed: history.filter((h: HistoryEntry) => !h.success).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        autoCookies: {
          enabled: isAutoCookiesEnabled(),
          url: getCookiesUrl(),
          lastFetch: autoCookiesStats.lastFetchTime 
            ? new Date(autoCookiesStats.lastFetchTime).toISOString() 
            : null,
          lastFetchSuccess: autoCookiesStats.lastFetchSuccess,
          totalFetches: autoCookiesStats.totalFetches,
          successfulFetches: autoCookiesStats.successfulFetches,
          failedFetches: autoCookiesStats.failedFetches,
          fallbackUses: autoCookiesStats.fallbackUses,
        },
        history: historyStats,
        settings: {
          siteName: settings.site_name || 'YouTube Downloader',
          siteDescription: settings.site_description || 'Download videos with yt-dlp',
        },
      },
    });
  } catch (error) {
    console.error('[Admin] Stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
