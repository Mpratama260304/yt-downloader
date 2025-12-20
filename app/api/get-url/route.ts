import { NextRequest, NextResponse } from 'next/server';
import { formatRequestSchema, ApiResponse, DownloadUrl } from '@/lib/types';
import { getDownloadUrl, checkRateLimit, isBotDetectionError, getErrorMessage } from '@/lib/ytdlp';
import { fetchFreshCookies, cleanupTempCookies, cleanupOldTempCookies } from '@/lib/auto-cookies';
import { addHistoryEntry } from '@/lib/db';

export const maxDuration = 120; // Increase timeout for yt-dlp operations

/**
 * POST /api/get-url
 * Get direct download URL for a specific format
 * 
 * v5.0: Uses auto-fetched cookies from external URL
 * NOTE: This endpoint is legacy - prefer /api/download for reliable downloads
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<DownloadUrl>>> {
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

    // Validate request
    const validationResult = formatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { url, formatId } = validationResult.data;

    // Clean up old temp cookies periodically
    cleanupOldTempCookies();

    // Fetch fresh cookies from external URL (on-demand, real-time sync)
    const cookiesResult = await fetchFreshCookies();
    cookieTempPath = cookiesResult.tempPath;
    
    // Log if using fallback
    if (cookiesResult.usedFallback) {
      console.warn('[get-url] Using fallback cookies:', cookiesResult.error);
    }

    // Get download URL using yt-dlp with auto-fetched cookies
    const result = await getDownloadUrl(url, formatId, cookieTempPath);

    // Determine extension from format or filename
    const ext = result.filename.split('.').pop() || 'mp4';

    // Log to history
    try {
      await addHistoryEntry({
        url,
        title: result.filename || 'Unknown',
        format: formatId,
        ip,
        userAgent: request.headers.get('user-agent') || undefined,
        success: true,
      });
    } catch (historyError) {
      console.error('Failed to log history:', historyError);
    }

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        filename: result.filename,
        ext,
      },
    });
  } catch (error: any) {
    console.error('Error in get-url:', error);
    
    // Check if it's a bot detection error
    const isBotError = isBotDetectionError(error);
    const errorMessage = getErrorMessage(error);

    // Log failed attempt to history
    try {
      const body = await request.clone().json();
      await addHistoryEntry({
        url: body.url || 'Unknown',
        title: 'Failed to download',
        format: body.formatId,
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
