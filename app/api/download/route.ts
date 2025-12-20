/**
 * /api/download/route.ts
 * 
 * Server-side proxy download endpoint v5.1.0
 * 
 * v5.1.0 CORRUPTION FIX UPDATE:
 * - FFprobe validation after download completes
 * - Auto-fallback to safer formats if corruption detected
 * - Cookies caching (30s TTL) for faster subsequent requests
 * - Optimized yt-dlp args for stability (reduced concurrent fragments)
 * - Enhanced timeout handling with AbortController
 * - More granular SSE progress updates
 * - Retry logic with format fallback
 * 
 * PREVIOUS FIXES (retained):
 * 1. NO cookies via headers (causes deprecated warning)
 * 2. NO concurrent fragments (causes "No such file or directory" errors)
 * 3. Download to temp file FIRST, then stream complete file
 * 4. Proper cleanup of temp files
 * 5. Auto-fetch cookies from external URL
 * 
 * @version 5.1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { formatRequestSchema } from '@/lib/types';
import { checkRateLimit, isBotDetectionError, getErrorMessage, sanitizeFilename } from '@/lib/ytdlp';
import { cleanupOldTempCookies } from '@/lib/auto-cookies';
import { addHistoryEntry } from '@/lib/db';
import { updateProgress } from '@/lib/progress-store';
import {
  getCachedCookies,
  invalidateCookiesCache,
  validateWithFFprobe,
  quickValidateFile,
  getFallbackFormat,
  isBestQualityFormat,
  isCorruptionError,
  isTimeoutError,
  createTimeoutController,
  killProcessWithTimeout,
  isFFprobeAvailable,
  formatBytes,
} from '@/lib/yt-dlp-utils';

export const maxDuration = 300; // 5 minutes for large video downloads
export const dynamic = 'force-dynamic';

// Track active downloads for cleanup
const activeDownloads = new Map<string, { 
  process: ChildProcess | null; 
  tempFile?: string; 
  tempCookie?: string;
  timeoutController?: ReturnType<typeof createTimeoutController>;
}>();

// Max retries (with fallback formats)
const MAX_RETRIES = 3;

// Connection timeout (30 seconds for initial connection)
const CONNECT_TIMEOUT = 30 * 1000;

// Download timeout (5 minutes total)
const DOWNLOAD_TIMEOUT = 5 * 60 * 1000;

// FFprobe available flag (cached)
let ffprobeAvailable: boolean | null = null;

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
 * Enhanced with more granular phase detection
 */
function parseProgress(stderr: string): { progress: number; message: string; phase: string } | null {
  // Download progress
  const downloadMatch = stderr.match(/\[download\]\s+(\d+\.?\d*)%/);
  if (downloadMatch) {
    const progress = parseFloat(downloadMatch[1]);
    return {
      progress: Math.min(progress * 0.85, 85), // Cap at 85% during download
      message: `Downloading: ${Math.round(progress)}%`,
      phase: 'downloading',
    };
  }

  // Merger/FFmpeg phases
  if (stderr.includes('[Merger]') || stderr.includes('Merging formats')) {
    return {
      progress: 88,
      message: 'Merging video and audio...',
      phase: 'merging',
    };
  }

  if (stderr.includes('[ffmpeg]')) {
    if (stderr.includes('Destination:')) {
      return {
        progress: 90,
        message: 'Processing with FFmpeg...',
        phase: 'processing',
      };
    }
    return {
      progress: 89,
      message: 'Converting format...',
      phase: 'converting',
    };
  }

  if (stderr.includes('[download] Destination:')) {
    return {
      progress: 5,
      message: 'Starting download...',
      phase: 'downloading',
    };
  }

  if (stderr.includes('fragments')) {
    const fragMatch = stderr.match(/(\d+)\s*fragments/);
    if (fragMatch) {
      return {
        progress: 3,
        message: `Downloading ${fragMatch[1]} fragments...`,
        phase: 'downloading',
      };
    }
  }

  if (stderr.includes('[youtube]') || stderr.includes('[info]')) {
    return {
      progress: 2,
      message: 'Extracting video info...',
      phase: 'extracting',
    };
  }

  return null;
}

/**
 * Build SAFE yt-dlp arguments
 * v5.1.0: Optimized for stability and corruption prevention
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
    '--no-playlist',
    '--no-mtime',
    '--retries', '15',
    '--fragment-retries', '15',
    '--file-access-retries', '10',
    '--buffer-size', '16M',
    '--http-chunk-size', '10M',
    '--socket-timeout', '10',
    '--geo-bypass',
    '--force-ipv4',
    '--no-warnings',
    '--ignore-errors',
    '--embed-metadata',
  ];

  if (cookiePath && fs.existsSync(cookiePath)) {
    args.push('--cookies', cookiePath);
  }

  if (needsMerge) {
    args.push('--merge-output-format', ext === 'webm' ? 'webm' : 'mp4');
    args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac -movflags +faststart -strict -2');
  }

  if (!hasVideo && (ext === 'mp3' || ext === 'm4a')) {
    args.push('-x');
    args.push('--audio-format', ext);
    args.push('--audio-quality', '0');
  }

  return args;
}

/**
 * Validate downloaded file using FFprobe
 */
async function validateDownloadedFile(
  filePath: string, 
  hasVideo: boolean,
  clientDownloadId: string
): Promise<{ isValid: boolean; error?: string }> {
  updateProgress(clientDownloadId, {
    progress: 92,
    message: 'Validating download...',
    phase: 'validating',
  });

  if (ffprobeAvailable === null) {
    ffprobeAvailable = await isFFprobeAvailable();
    console.log(`[Validation] FFprobe available: ${ffprobeAvailable}`);
  }

  if (ffprobeAvailable) {
    const result = await validateWithFFprobe(filePath);
    
    if (!result.isValid) {
      console.error(`[Validation] FFprobe failed: ${result.error}`);
      return { isValid: false, error: result.error || 'FFprobe validation failed' };
    }

    if (hasVideo && !result.hasVideo) {
      return { isValid: false, error: 'No video stream found' };
    }

    if (!result.hasAudio && !result.hasVideo) {
      return { isValid: false, error: 'No playable streams found' };
    }

    console.log(`[Validation] FFprobe passed: video=${result.hasVideo}, audio=${result.hasAudio}, duration=${result.duration}s`);
    return { isValid: true };
  } else {
    const result = quickValidateFile(filePath, hasVideo);
    
    if (!result.isValid) {
      console.error(`[Validation] Quick check failed: ${result.error}`);
      return result;
    }

    console.log('[Validation] Quick check passed');
    return { isValid: true };
  }
}

/**
 * Execute download with timeout and validation
 */
async function executeDownload(
  url: string,
  formatId: string,
  tempFile: string,
  cookiePath: string | null,
  options: { 
    ext?: string; 
    hasVideo?: boolean; 
    needsMerge?: boolean; 
    downloadId: string; 
    clientDownloadId: string;
    attempt: number;
  }
): Promise<{ 
  success: boolean; 
  error?: string; 
  isBotDetection?: boolean;
  isCorruption?: boolean;
  isTimeout?: boolean;
}> {
  const { ext, hasVideo, needsMerge, downloadId, clientDownloadId, attempt } = options;
  const ytdlpPath = getYtDlpPath();
  
  return new Promise((resolve) => {
    const args = buildSafeYtDlpArgs(url, formatId, tempFile, cookiePath, { ext, hasVideo, needsMerge });
    
    console.log(`[Download ${downloadId}] Attempt ${attempt}: format=${formatId}`);
    
    const childProcess = spawn(ytdlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeoutController = createTimeoutController(DOWNLOAD_TIMEOUT, () => {
      console.log(`[Download ${downloadId}] Timeout - killing process`);
      updateProgress(clientDownloadId, {
        progress: 0,
        message: 'Connection timeout - retrying...',
        phase: 'timeout',
      });
      killProcessWithTimeout(childProcess);
    });

    activeDownloads.set(downloadId, { 
      process: childProcess, 
      tempFile, 
      tempCookie: cookiePath || undefined,
      timeoutController,
    });

    let errorOutput = '';
    let lastProgress = 0;
    let receivedData = false;

    const connectTimeout = setTimeout(() => {
      if (!receivedData) {
        console.log(`[Download ${downloadId}] Connection timeout`);
        timeoutController.abort();
        killProcessWithTimeout(childProcess);
        resolve({ 
          success: false, 
          error: 'Connection timeout - server not responding',
          isTimeout: true,
        });
      }
    }, CONNECT_TIMEOUT);

    childProcess.stderr.on('data', (data: Buffer) => {
      receivedData = true;
      clearTimeout(connectTimeout);
      
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

      if (text.includes('[download]') && text.includes('%')) {
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

    childProcess.stdout.on('data', () => {
      receivedData = true;
      clearTimeout(connectTimeout);
    });

    childProcess.on('error', (error: Error) => {
      clearTimeout(connectTimeout);
      timeoutController.abort();
      console.error(`[Download ${downloadId}] Process error:`, error);
      activeDownloads.delete(downloadId);
      resolve({ success: false, error: error.message });
    });

    childProcess.on('close', async (code: number) => {
      clearTimeout(connectTimeout);
      timeoutController.abort();
      activeDownloads.delete(downloadId);

      if (timeoutController.isAborted) {
        resolve({ success: false, error: 'Download timed out', isTimeout: true });
        return;
      }

      if (isBotDetectionError({ message: errorOutput })) {
        console.log(`[Download ${downloadId}] Bot detection`);
        resolve({ success: false, error: 'Bot detection', isBotDetection: true });
        return;
      }

      if (errorOutput.includes('No such file or directory') && errorOutput.includes('Frag')) {
        console.log(`[Download ${downloadId}] Fragment error`);
        resolve({ success: false, error: 'Fragment download error', isCorruption: true });
        return;
      }

      if (code !== 0) {
        console.error(`[Download ${downloadId}] Exit code ${code}`);
        const errorMsg = getErrorMessage({ message: errorOutput }) || 'Download failed';
        resolve({ 
          success: false, 
          error: errorMsg,
          isCorruption: isCorruptionError(errorMsg),
          isTimeout: isTimeoutError(errorMsg),
        });
        return;
      }

      if (!fs.existsSync(tempFile)) {
        resolve({ success: false, error: 'File not found', isCorruption: true });
        return;
      }

      const stats = fs.statSync(tempFile);
      console.log(`[Download ${downloadId}] File size: ${formatBytes(stats.size)}`);

      const validation = await validateDownloadedFile(tempFile, hasVideo !== false, clientDownloadId);
      
      if (!validation.isValid) {
        console.error(`[Download ${downloadId}] Validation failed: ${validation.error}`);
        resolve({ 
          success: false, 
          error: validation.error || 'Video may be corrupted',
          isCorruption: true,
        });
        return;
      }

      resolve({ success: true });
    });
  });
}

/**
 * POST /api/download
 */
export async function POST(request: NextRequest): Promise<Response> {
  const downloadId = Math.random().toString(36).substring(7);
  let tempFile: string | null = null;
  let currentCookiePath: string | null = null;
  
  try {
    cleanupOldTempCookies();
    
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validationResult = formatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { url, formatId: requestedFormatId } = validationResult.data;
    const title = body.title || 'video';
    const ext = body.ext || 'mp4';
    const hasVideo = body.hasVideo !== false;
    const clientDownloadId = body.downloadId || downloadId;

    const isBestQuality = isBestQualityFormat(requestedFormatId);
    const needsMerge = requestedFormatId.includes('+');
    const outputExt = hasVideo ? (ext === 'webm' ? 'webm' : 'mp4') : (ext || 'm4a');

    tempFile = getTempFilePath(outputExt);

    console.log(`[Download ${downloadId}] URL: ${url}`);
    console.log(`[Download ${downloadId}] Format: ${requestedFormatId}, Best: ${isBestQuality}, Merge: ${needsMerge}`);

    updateProgress(clientDownloadId, {
      progress: 0,
      message: 'Fetching cookies...',
      phase: 'preparing',
    });

    let lastError = '';
    let lastIsBotDetection = false;
    let lastIsCorruption = false;
    let usedFallback = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let formatId = requestedFormatId;
      
      if (attempt > 1 && lastIsCorruption) {
        formatId = getFallbackFormat(attempt - 1, requestedFormatId);
        usedFallback = true;
        console.log(`[Download ${downloadId}] Fallback format: ${formatId}`);
        
        updateProgress(clientDownloadId, {
          progress: 2,
          message: `Retrying with safer format (${attempt}/${MAX_RETRIES})...`,
          phase: 'preparing',
        });
      }

      const forceRefreshCookies = lastIsBotDetection || (attempt > 1 && lastError.includes('403'));
      
      updateProgress(clientDownloadId, {
        progress: attempt === 1 ? 1 : 3,
        message: forceRefreshCookies ? 'Fetching fresh cookies...' : 'Preparing download...',
        phase: 'preparing',
      });

      try {
        const cookiesResult = await getCachedCookies(forceRefreshCookies);
        currentCookiePath = cookiesResult.tempPath;
        
        if (cookiesResult.usedFallback) {
          console.warn(`[Download ${downloadId}] Using fallback cookies`);
        } else if (cookiesResult.fromCache) {
          console.log(`[Download ${downloadId}] Using cached cookies`);
        } else {
          console.log(`[Download ${downloadId}] Using fresh cookies`);
        }
      } catch (cookieError: any) {
        console.error(`[Download ${downloadId}] Cookie error:`, cookieError.message);
      }

      console.log(`[Download ${downloadId}] Attempt ${attempt}/${MAX_RETRIES}`);

      updateProgress(clientDownloadId, {
        progress: attempt > 1 ? 5 : 3,
        message: attempt > 1 ? `Retrying download (${attempt}/${MAX_RETRIES})...` : 'Starting download...',
        phase: 'preparing',
      });

      const result = await executeDownload(url, formatId, tempFile, currentCookiePath, {
        ext: outputExt,
        hasVideo,
        needsMerge: formatId.includes('+'),
        downloadId,
        clientDownloadId,
        attempt,
      });

      if (result.success) {
        console.log(`[Download ${downloadId}] Success on attempt ${attempt}`);

        updateProgress(clientDownloadId, {
          progress: 95,
          message: 'Preparing file for transfer...',
          phase: 'processing',
        });

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

        const fileBuffer = fs.readFileSync(tempFile);
        const filename = sanitizeForHeader(`${sanitizeFilename(title)}.${outputExt}`);
        const contentType = getContentType(outputExt, hasVideo);

        deleteTempFile(tempFile);

        updateProgress(clientDownloadId, {
          progress: 100,
          message: 'Complete!',
          phase: 'complete',
          completed: true,
          fileReady: true,
        });

        console.log(`[Download ${downloadId}] Sending ${formatBytes(fileBuffer.length)}`);

        const headers: Record<string, string> = {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Download-Filename': filename,
          'X-Download-Id': clientDownloadId,
        };
        
        if (usedFallback) {
          headers['X-Used-Fallback-Format'] = 'true';
        }

        return new Response(fileBuffer, { status: 200, headers });
      }

      lastError = result.error || 'Unknown error';
      lastIsBotDetection = result.isBotDetection || false;
      lastIsCorruption = result.isCorruption || false;

      console.log(`[Download ${downloadId}] Attempt ${attempt} failed: ${lastError}`);

      if (lastIsBotDetection || lastError.includes('403') || lastError.includes('429')) {
        invalidateCookiesCache();
      }

      deleteTempFile(tempFile);
      tempFile = getTempFilePath(outputExt);

      if (!lastIsBotDetection && !lastIsCorruption && !result.isTimeout) {
        break;
      }
    }

    console.error(`[Download ${downloadId}] All attempts failed`);

    let userError = lastError;
    if (lastIsCorruption) {
      userError = 'Video file was corrupted during download. Please try a lower quality format.';
    } else if (lastIsBotDetection) {
      userError = 'YouTube blocked the request. Please try again later.';
    }

    updateProgress(clientDownloadId, {
      progress: 0,
      message: userError,
      phase: 'error',
      error: userError,
      completed: false,
    });

    try {
      await addHistoryEntry({
        url,
        title: title || 'Download Failed',
        format: requestedFormatId,
        ip,
        userAgent: request.headers.get('user-agent') || undefined,
        success: false,
        error: lastError,
      });
    } catch (e) {
      console.error('Failed to log history:', e);
    }

    deleteTempFile(tempFile);

    return NextResponse.json(
      { 
        success: false, 
        error: userError,
        isBotDetection: lastIsBotDetection,
        isCorruption: lastIsCorruption,
        suggestion: lastIsCorruption 
          ? 'Try selecting a lower quality format (720p or below)' 
          : lastIsBotDetection 
            ? 'Try again in a few minutes' 
            : undefined,
      },
      { status: lastIsBotDetection ? 403 : 500 }
    );

  } catch (error: any) {
    console.error(`[Download ${downloadId}] Unhandled error:`, error);
    
    deleteTempFile(tempFile);
    activeDownloads.delete(downloadId);

    return NextResponse.json(
      { success: false, error: 'Server error: ' + (error.message || 'Unknown') },
      { status: 500 }
    );
  }
}

// Cleanup on exit
process.on('SIGTERM', () => {
  activeDownloads.forEach(({ process, tempFile, tempCookie, timeoutController }) => {
    if (timeoutController) timeoutController.abort();
    if (process) process.kill('SIGTERM');
    deleteTempFile(tempFile);
    deleteTempFile(tempCookie);
  });
});
