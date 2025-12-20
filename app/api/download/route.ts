/**
 * /api/download/route.ts
 * 
 * Server-side proxy download endpoint v5.0.0
 * 
 * v5.0.0 CHANGES:
 * - Auto-fetch cookies from external URL (no manual management)
 * - Fresh cookies fetched on-demand for each request
 * - Real-time sync with cookie source (refreshes every ~30s)
 * - Fallback to consent cookies if fetch fails
 * 
 * PREVIOUS FIXES (retained):
 * 1. NO cookies via headers (causes deprecated warning)
 * 2. NO concurrent fragments (causes "No such file or directory" errors)
 * 3. Download to temp file FIRST, then stream complete file
 * 4. Proper cleanup of temp files
 * 
 * @version 5.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { formatRequestSchema } from '@/lib/types';
import { checkRateLimit, isBotDetectionError, getErrorMessage, sanitizeFilename } from '@/lib/ytdlp';
import { fetchFreshCookies, cleanupTempCookies, cleanupOldTempCookies } from '@/lib/auto-cookies';
import { addHistoryEntry } from '@/lib/db';
import { updateProgress } from '@/lib/progress-store';

export const maxDuration = 300; // 5 minutes for large video downloads
export const dynamic = 'force-dynamic';

// Track active downloads for cleanup
const activeDownloads = new Map<string, { process: any; tempFile?: string; tempCookie?: string }>();

// Max retries with fresh cookies
const MAX_RETRIES = 3;

/**
 * Get yt-dlp binary path
 */
function getYtDlpPath(): string {
  const localPath = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  return 'yt-dlp';
}

/**
 * Get temporary directory for downloads
 * Creates it if it doesn't exist
 */
function getTempDir(): string {
  const tempDir = path.join(os.tmpdir(), 'yt-downloader');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

/**
 * Generate unique temporary file path
 */
function getTempFilePath(ext: string = 'mp4'): string {
  const id = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  return path.join(getTempDir(), `download_${timestamp}_${id}.${ext}`);
}

/**
 * Delete temp file safely
 */
function deleteTempFile(filePath: string | null | undefined): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Cleanup] Deleted temp file: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`[Cleanup] Failed to delete: ${filePath}`, error);
  }
}

/**
 * Clean up old temp files (older than 30 minutes)
 */
function cleanupOldTempFiles(): void {
  try {
    const tempDir = getTempDir();
    const files = fs.readdirSync(tempDir);
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith('download_')) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs < thirtyMinutesAgo) {
            fs.unlinkSync(filePath);
            console.log(`[Cleanup] Removed old temp file: ${file}`);
          }
        } catch (e) {
          // File may have been deleted
        }
      }
    }
  } catch (error) {
    console.error('[Cleanup] Failed to clean temp files:', error);
  }
}

// Run cleanup on module load
cleanupOldTempFiles();

/**
 * Sanitize filename for HTTP Content-Disposition header
 */
function sanitizeForHeader(filename: string): string {
  return filename
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

/**
 * Determine content type based on extension
 */
function getContentType(ext: string, hasVideo: boolean): string {
  const extLower = ext.toLowerCase();
  
  if (!hasVideo || ['m4a', 'mp3', 'opus', 'wav'].includes(extLower)) {
    if (extLower === 'm4a') return 'audio/mp4';
    if (extLower === 'mp3') return 'audio/mpeg';
    if (extLower === 'opus') return 'audio/opus';
    if (extLower === 'wav') return 'audio/wav';
    return 'audio/mp4';
  }
  
  if (extLower === 'webm') return 'video/webm';
  if (extLower === 'mkv') return 'video/x-matroska';
  return 'video/mp4';
}

/**
 * Parse yt-dlp progress from stderr
 */
function parseProgress(stderr: string): { progress: number; message: string; phase: string } | null {
  const downloadMatch = stderr.match(/\[download\]\s+(\d+\.?\d*)%/);
  if (downloadMatch) {
    const progress = parseFloat(downloadMatch[1]);
    return {
      progress: Math.min(progress * 0.9, 90), // Cap at 90% during download (save 10% for merge/transfer)
      message: `Downloading: ${Math.round(progress)}%`,
      phase: 'downloading',
    };
  }

  if (stderr.includes('[Merger]') || stderr.includes('[ffmpeg]')) {
    return {
      progress: 92,
      message: 'Merging video and audio...',
      phase: 'merging',
    };
  }

  if (stderr.includes('[download] Destination:')) {
    return {
      progress: 5,
      message: 'Starting download...',
      phase: 'downloading',
    };
  }

  return null;
}

/**
 * Validate downloaded file
 */
function validateDownload(filePath: string, minSize: number = 1024): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stats = fs.statSync(filePath);
    return stats.size >= minSize;
  } catch {
    return false;
  }
}

/**
 * Build SAFE yt-dlp arguments
 * NO cookies via headers - only via --cookies file
 * NO concurrent fragments - causes race condition errors
 */
function buildSafeYtDlpArgs(
  url: string,
  formatId: string,
  outputPath: string,
  cookiePath: string | null,
  options: { ext?: string; hasVideo?: boolean; needsMerge?: boolean }
): string[] {
  const { ext = 'mp4', hasVideo = true, needsMerge = false } = options;
  
  const args: string[] = [
    url,
    '-f', formatId,
    '-o', outputPath,
    // Base args
    '--no-playlist',
    '--no-mtime',
    '--retries', '10',
    '--fragment-retries', '10',
    '--file-access-retries', '10',
    // CRITICAL: Do NOT use --concurrent-fragments - causes "No such file" errors
    // '--concurrent-fragments', '4', // REMOVED - causes fragment race condition
    // Speed optimizations (without concurrent fragments)
    '--buffer-size', '16M',
    '--http-chunk-size', '10M',
    // Geo bypass
    '--geo-bypass',
    '--force-ipv4',
    // No warnings
    '--no-warnings',
    '--ignore-errors',
    // Socket timeout
    '--socket-timeout', '30',
  ];

  // CRITICAL: Only pass cookies via --cookies file, NEVER via headers
  if (cookiePath && fs.existsSync(cookiePath)) {
    args.push('--cookies', cookiePath);
  }

  // Handle merged formats
  if (needsMerge) {
    args.push('--merge-output-format', ext === 'webm' ? 'webm' : 'mp4');
    args.push('--embed-metadata');
    // FFmpeg args for proper MP4 with fast start
    args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac -movflags +faststart');
  }

  // Handle audio extraction
  if (!hasVideo && (ext === 'mp3' || ext === 'm4a')) {
    args.push('-x');
    args.push('--audio-format', ext);
    args.push('--audio-quality', '0');
  }

  return args;
}

/**
 * Execute download with retry logic
 */
async function executeDownload(
  url: string,
  formatId: string,
  tempFile: string,
  cookiePath: string | null,
  options: { ext?: string; hasVideo?: boolean; needsMerge?: boolean; downloadId: string; clientDownloadId: string }
): Promise<{ success: boolean; error?: string; isBotDetection?: boolean }> {
  const { ext, hasVideo, needsMerge, downloadId, clientDownloadId } = options;
  const ytdlpPath = getYtDlpPath();
  
  return new Promise((resolve) => {
    const args = buildSafeYtDlpArgs(url, formatId, tempFile, cookiePath, { ext, hasVideo, needsMerge });
    
    console.log(`[Download ${downloadId}] Executing yt-dlp with args:`, args.slice(0, 10).join(' ') + '...');
    
    const childProcess = spawn(ytdlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    activeDownloads.set(downloadId, { process: childProcess, tempFile, tempCookie: cookiePath || undefined });

    let errorOutput = '';
    let lastProgress = 0;

    // Parse stderr for progress
    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      
      const progressInfo = parseProgress(text);
      if (progressInfo && progressInfo.progress > lastProgress) {
        lastProgress = progressInfo.progress;
        updateProgress(clientDownloadId, {
          progress: progressInfo.progress,
          message: progressInfo.message,
          phase: progressInfo.phase,
        });
      }

      // Log significant events (but not every fragment)
      if (text.includes('[download]') && text.includes('%')) {
        // Only log every 10%
        const match = text.match(/(\d+)\.?\d*%/);
        if (match) {
          const pct = parseInt(match[1]);
          if (pct % 20 === 0) {
            console.log(`[Download ${downloadId}] Progress: ${pct}%`);
          }
        }
      } else if (text.includes('[Merger]') || text.includes('[ffmpeg]') || text.includes('ERROR')) {
        console.log(`[Download ${downloadId}] ${text.trim().substring(0, 200)}`);
      }
    });

    // Ignore stdout when downloading to file
    childProcess.stdout.on('data', () => {});

    // Handle process errors
    childProcess.on('error', (error: Error) => {
      console.error(`[Download ${downloadId}] Process error:`, error);
      activeDownloads.delete(downloadId);
      resolve({ success: false, error: error.message });
    });

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      console.log(`[Download ${downloadId}] Timeout - killing process`);
      childProcess.kill('SIGTERM');
      activeDownloads.delete(downloadId);
      resolve({ success: false, error: 'Download timed out' });
    }, 5 * 60 * 1000);

    // Handle completion
    childProcess.on('close', (code: number) => {
      clearTimeout(timeout);
      activeDownloads.delete(downloadId);

      // Check for bot detection
      if (isBotDetectionError({ message: errorOutput })) {
        console.log(`[Download ${downloadId}] Bot detection in stderr`);
        resolve({ success: false, error: 'Bot detection', isBotDetection: true });
        return;
      }

      // Check for fragment error
      if (errorOutput.includes('No such file or directory') && errorOutput.includes('Frag')) {
        console.log(`[Download ${downloadId}] Fragment file error`);
        resolve({ success: false, error: 'Fragment download error - please retry' });
        return;
      }

      if (code !== 0) {
        console.error(`[Download ${downloadId}] Process exited with code ${code}`);
        resolve({ success: false, error: getErrorMessage({ message: errorOutput }) || 'Download failed' });
        return;
      }

      // Validate file
      if (!validateDownload(tempFile)) {
        console.error(`[Download ${downloadId}] File validation failed`);
        resolve({ success: false, error: 'Downloaded file is corrupted or empty' });
        return;
      }

      resolve({ success: true });
    });
  });
}

/**
 * POST /api/download
 * Server-side proxy download with retry logic
 * 
 * v5.0: Uses auto-fetched cookies from external URL
 */
export async function POST(request: NextRequest): Promise<Response> {
  const downloadId = Math.random().toString(36).substring(7);
  let tempFile: string | null = null;
  let currentCookiePath: string | null = null;
  
  try {
    // Clean up old temp cookies periodically
    cleanupOldTempCookies();
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait.' },
        { status: 429 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = formatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { url, formatId } = validationResult.data;
    const title = body.title || 'video';
    const ext = body.ext || 'mp4';
    const hasVideo = body.hasVideo !== false;
    const clientDownloadId = body.downloadId || downloadId;

    // Determine if format needs merging
    const needsMerge = formatId.includes('+');
    const outputExt = hasVideo ? (ext === 'webm' ? 'webm' : 'mp4') : (ext || 'm4a');

    // Create temp file path
    tempFile = getTempFilePath(outputExt);

    console.log(`[Download ${downloadId}] Starting for: ${url}`);
    console.log(`[Download ${downloadId}] Format: ${formatId}, Needs merge: ${needsMerge}`);
    console.log(`[Download ${downloadId}] Output: ${tempFile}`);

    // Initialize progress
    updateProgress(clientDownloadId, {
      progress: 0,
      message: 'Starting download...',
      phase: 'preparing',
    });

    // Retry loop with fresh auto-fetched cookies
    let lastError = '';
    let lastIsBotDetection = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Cleanup previous attempt's cookies
      if (currentCookiePath) {
        await cleanupTempCookies(currentCookiePath);
        currentCookiePath = null;
      }
      
      // Fetch fresh cookies from external URL for each attempt
      // This ensures we always have the latest cookies (source refreshes every ~30s)
      const cookiesResult = await fetchFreshCookies();
      currentCookiePath = cookiesResult.tempPath || null;
      
      if (cookiesResult.usedFallback) {
        console.warn(`[Download ${downloadId}] Using fallback cookies:`, cookiesResult.error);
      }

      console.log(`[Download ${downloadId}] Attempt ${attempt}/${MAX_RETRIES}, cookies: ${cookiesResult.usedFallback ? 'fallback' : 'fresh'}`);

      updateProgress(clientDownloadId, {
        progress: attempt > 1 ? 5 : 0,
        message: attempt > 1 ? `Retrying (${attempt}/${MAX_RETRIES})...` : 'Starting download...',
        phase: 'preparing',
      });

      // Execute download
      const result = await executeDownload(url, formatId, tempFile, currentCookiePath, {
        ext: outputExt,
        hasVideo,
        needsMerge,
        downloadId,
        clientDownloadId,
      });

      if (result.success) {
        // Success! Stream file to client
        console.log(`[Download ${downloadId}] Success on attempt ${attempt}`);

        updateProgress(clientDownloadId, {
          progress: 95,
          message: 'Preparing file...',
          phase: 'processing',
        });

        // Log success
        try {
          await addHistoryEntry({
            url,
            title: title || 'Unknown',
            format: formatId,
            ip,
            userAgent: request.headers.get('user-agent') || undefined,
            success: true,
          });
        } catch (e) {
          console.error('Failed to log history:', e);
        }

        // Read and stream file
        const fileBuffer = fs.readFileSync(tempFile);
        const filename = sanitizeForHeader(`${sanitizeFilename(title)}.${outputExt}`);
        const contentType = getContentType(outputExt, hasVideo);

        // Cleanup temp file
        deleteTempFile(tempFile);

        updateProgress(clientDownloadId, {
          progress: 100,
          message: 'Complete!',
          phase: 'complete',
          completed: true,
          fileReady: true,
        });

        console.log(`[Download ${downloadId}] Sending ${fileBuffer.length} bytes`);

        return new Response(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Download-Filename': filename,
            'X-Download-Id': clientDownloadId,
          },
        });
      }

      // Handle failure
      lastError = result.error || 'Unknown error';
      lastIsBotDetection = result.isBotDetection || false;

      console.log(`[Download ${downloadId}] Attempt ${attempt} failed: ${lastError}`);

      // With auto-cookies, we simply fetch fresh cookies on next attempt
      // No need to mark cookies as problematic since they're fetched on-demand

      // Delete incomplete temp file before retry
      deleteTempFile(tempFile);
      tempFile = getTempFilePath(outputExt);

      // Don't retry if it's not a bot detection error (e.g., video unavailable)
      if (!lastIsBotDetection && !lastError.includes('Fragment')) {
        break;
      }
    }

    // All retries failed
    console.error(`[Download ${downloadId}] All ${MAX_RETRIES} attempts failed`);

    updateProgress(clientDownloadId, {
      progress: 0,
      message: lastError,
      phase: 'error',
      error: lastError,
      completed: false,
    });

    // Log failure
    try {
      await addHistoryEntry({
        url,
        title: title || 'Download Failed',
        format: formatId,
        ip,
        userAgent: request.headers.get('user-agent') || undefined,
        success: false,
        error: lastError,
      });
    } catch (e) {
      console.error('Failed to log history:', e);
    }

    // Cleanup
    deleteTempFile(tempFile);
    await cleanupTempCookies(currentCookiePath);

    return NextResponse.json(
      { 
        success: false, 
        error: lastIsBotDetection 
          ? 'YouTube blocked the request. The auto-cookies system will retry with fresh cookies.' 
          : lastError,
        isBotDetection: lastIsBotDetection,
      },
      { status: lastIsBotDetection ? 403 : 500 }
    );

  } catch (error: any) {
    console.error(`[Download ${downloadId}] Unhandled error:`, error);
    
    // Cleanup
    deleteTempFile(tempFile);
    await cleanupTempCookies(currentCookiePath);
    activeDownloads.delete(downloadId);

    return NextResponse.json(
      { success: false, error: 'Server error: ' + (error.message || 'Unknown') },
      { status: 500 }
    );
  } finally {
    // Always cleanup temp cookies
    await cleanupTempCookies(currentCookiePath);
  }
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  activeDownloads.forEach(({ process, tempFile, tempCookie }) => {
    if (process) process.kill('SIGTERM');
    deleteTempFile(tempFile);
    deleteTempFile(tempCookie);
  });
});
