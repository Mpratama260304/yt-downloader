import { NextRequest, NextResponse } from 'next/server';
import { youtubeUrlSchema, ApiResponse, VideoInfo } from '@/lib/types';
import { fetchVideoInfo, checkRateLimit, isBotDetectionError, getErrorMessage } from '@/lib/ytdlp';
import { fetchFreshCookies, cleanupTempCookies, cleanupOldTempCookies } from '@/lib/auto-cookies';
import { addHistoryEntry } from '@/lib/db';

export const maxDuration = 120; // Increase timeout for yt-dlp operations

/**
 * POST /api/fetch-info
 * Fetch video metadata and available formats from YouTube URL
 * 
 * v5.0: Uses auto-fetched cookies from external URL for real-time sync
 * Cookies are fetched fresh for every request to ensure they are always up-to-date
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<VideoInfo>>> {
  let cookieTempPath: string | undefined;
  
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url } = body;

    // Validate URL
    const validationResult = youtubeUrlSchema.safeParse(url);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    // Clean up old temp cookies periodically
    cleanupOldTempCookies();

    // Fetch fresh cookies from external URL (on-demand, real-time sync)
    const cookiesResult = await fetchFreshCookies();
    cookieTempPath = cookiesResult.tempPath;
    
    // Log if using fallback
    if (cookiesResult.usedFallback) {
      console.warn('[fetch-info] Using fallback cookies:', cookiesResult.error);
    }

    // Fetch video info using yt-dlp with auto-fetched cookies
    const videoInfo = await fetchVideoInfo(url, cookieTempPath);

    // Log to history
    try {
      await addHistoryEntry({
        url,
        title: videoInfo.title || 'Unknown',
        ip,
        userAgent: request.headers.get('user-agent') || undefined,
        success: true,
      });
    } catch (historyError) {
      console.error('Failed to log history:', historyError);
    }

    return NextResponse.json({
      success: true,
      data: videoInfo,
    });
  } catch (error: any) {
    console.error('Error in fetch-info:', error);
    
    // Check if it's a bot detection error
    const isBotError = isBotDetectionError(error);
    const errorMessage = getErrorMessage(error);
    
    // Log failed attempt to history
    try {
      const body = await request.clone().json();
      await addHistoryEntry({
        url: body.url || 'Unknown',
        title: 'Failed to fetch',
        success: false,
        error: errorMessage,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch (historyError) {
      console.error('Failed to log error to history:', historyError);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        isBotDetection: isBotError,
      },
      { status: isBotError ? 403 : 500 }
    );
  } finally {
    // Always cleanup temp cookies file
    await cleanupTempCookies(cookieTempPath);
  }
}
