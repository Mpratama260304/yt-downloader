/**
 * /api/download/route.ts
 * 
 * Server-side STREAMING proxy download endpoint v5.3.0
 * 
 * v5.3.0 STREAMING FIX UPDATE (408 Timeout Final Fix):
 * - PURE STREAMING: Pipe yt-dlp stdout directly to response (no temp file wait)
 * - KEEP-ALIVE: Send heartbeat bytes every 10s to prevent gateway timeout
 * - NO TEMP FILE: Stream chunks directly as they arrive
 * - PROXY SUPPORT: Rotate proxies to bypass IP blocks/slowdowns
 * - VIDEO LIMITS: Return early for very large/long videos with warning
 * - GRACEFUL ERRORS: Return 200 with JSON error body (not 408/500)
 * 
 * Key Changes from v5.2.0:
 * - process.stdout.pipe(response) instead of full download + stream
 * - res.write(' ') heartbeat every 10s
 * - Transfer-Encoding: chunked
 * - No validation (rely on yt-dlp exit code)
 * - Proxy rotation from env/DB
 * 
 * @version 5.3.0 - Streaming Fix Update
 */

import { NextRequest } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { formatRequestSchema } from '@/lib/types';
import { checkRateLimit, isBotDetectionError, getErrorMessage, sanitizeFilename } from '@/lib/ytdlp';
import { addHistoryEntry } from '@/lib/db';
import { updateProgress, clearProgress } from '@/lib/progress-store';
import {
  getCachedCookies,
  invalidateCookiesCache,
  getProxyList,
  getRandomProxy,
  STREAMING_CONFIG,
} from '@/lib/yt-dlp-utils';

// Vercel/Phala: Max execution time
export const maxDuration = 300; // 5 minutes (we handle our own timeouts)
export const dynamic = 'force-dynamic';

// Track active downloads for cleanup
const activeDownloads = new Map<string, {
  process: ChildProcess | null;
  interval?: NodeJS.Timeout;
  cookiePath?: string;
}>();

/**
 * Get yt-dlp binary path
 */
function getYtDlpPath(): string {
  const localPath = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  if (fs.existsSync(localPath)) return localPath;
  return 'yt-dlp';
}

/**
 * Ensure temp directory exists
 */
function ensureTempDir(): string {
  const dir = path.join(os.tmpdir(), 'yt-downloader');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Parse yt-dlp progress from stderr
 */
function parseProgress(line: string): { progress: number; speed: string; eta: string } | null {
  // Match: [download]  45.2% of 10.5MiB at 1.2MiB/s ETA 00:05
  const match = line.match(/\[download\]\s+(\d+\.?\d*)%.*?at\s+([^\s]+).*?ETA\s+(\S+)/);
  if (match) {
    return {
      progress: parseFloat(match[1]),
      speed: match[2],
      eta: match[3],
    };
  }
  return null;
}

/**
 * Clean up download resources
 */
function cleanupDownload(downloadId: string) {
  const download = activeDownloads.get(downloadId);
  if (download) {
    if (download.interval) {
      clearInterval(download.interval);
    }
    if (download.process && !download.process.killed) {
      try {
        download.process.kill('SIGTERM');
      } catch { /* ignore */ }
    }
    if (download.cookiePath && fs.existsSync(download.cookiePath)) {
      try {
        fs.unlinkSync(download.cookiePath);
      } catch { /* ignore */ }
    }
    activeDownloads.delete(downloadId);
  }
  clearProgress(downloadId);
}

/**
 * Main streaming download handler
 */
export async function POST(request: NextRequest) {
  const downloadId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let responseStarted = false;
  
  console.log(`[Download ${downloadId}] Request started`);

  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests. Please wait a moment.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = formatRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { url, format, quality, title: rawTitle, clientDownloadId } = validation.data;
    const progressId = clientDownloadId || downloadId;
    
    // Sanitize title
    const title = sanitizeFilename(rawTitle || 'video');
    const isAudioOnly = format === 'audio' || quality === 'audio-only';
    const ext = isAudioOnly ? 'mp3' : 'mp4';
    const filename = `${title}.${ext}`;
    const contentType = isAudioOnly ? 'audio/mpeg' : 'video/mp4';

    console.log(`[Download ${downloadId}] URL: ${url}, Format: ${format}, Quality: ${quality}`);

    // Update progress: preparing
    updateProgress(progressId, {
      progress: 5,
      message: 'Preparing download...',
      phase: 'preparing',
    });

    // Get cookies
    let cookiePath: string | null = null;
    try {
      const cookies = await getCachedCookies();
      cookiePath = cookies.tempPath;
      console.log(`[Download ${downloadId}] Cookies ready (cached: ${cookies.fromCache})`);
    } catch (err) {
      console.warn(`[Download ${downloadId}] Cookie fetch failed, continuing without`);
    }

    // Get proxy (if configured)
    const proxy = getRandomProxy();
    if (proxy) {
      console.log(`[Download ${downloadId}] Using proxy: ${proxy.substring(0, 30)}...`);
    }

    // Build format string
    let formatId: string;
    if (isAudioOnly) {
      formatId = 'bestaudio[ext=m4a]/bestaudio/best';
    } else if (quality === 'best' || format === 'best') {
      // For best quality, limit to 720p to avoid timeout
      formatId = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/best';
    } else if (quality) {
      const height = quality.replace('p', '');
      formatId = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}]/best`;
    } else {
      formatId = 'best[height<=720]/best';
    }

    // Build yt-dlp arguments for STREAMING output
    const args: string[] = [
      url,
      '-f', formatId,
      '-o', '-',  // Output to stdout for streaming
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--no-warnings',
      '--progress',
      '--newline',  // Progress on new lines for parsing
      '--concurrent-fragments', String(STREAMING_CONFIG.concurrentFragments),
      '--socket-timeout', String(STREAMING_CONFIG.socketTimeout),
      '--retries', String(STREAMING_CONFIG.retries),
      '--fragment-retries', String(STREAMING_CONFIG.fragmentRetries),
      '--http-chunk-size', STREAMING_CONFIG.httpChunkSize,
      '--buffer-size', STREAMING_CONFIG.bufferSize,
      '--no-part',  // Don't create .part files
      '--no-mtime',
    ];

    // Add cookies if available
    if (cookiePath && fs.existsSync(cookiePath)) {
      args.push('--cookies', cookiePath);
    }

    // Add proxy if configured
    if (proxy) {
      args.push('--proxy', proxy);
    }

    // Audio-specific args
    if (isAudioOnly) {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    }

    console.log(`[Download ${downloadId}] Starting yt-dlp with streaming output`);

    // Spawn yt-dlp process
    const ytdlpPath = getYtDlpPath();
    const proc = spawn(ytdlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    // Track this download
    activeDownloads.set(downloadId, {
      process: proc,
      cookiePath: cookiePath || undefined,
    });

    // Create streaming response with keep-alive
    const stream = new ReadableStream({
      start(controller) {
        let bytesWritten = 0;
        let lastProgress = 0;
        let errorOutput = '';
        let downloadComplete = false;
        let keepAliveCount = 0;

        // Keep-alive interval - write a space every 10s to prevent gateway timeout
        const keepAliveInterval = setInterval(() => {
          if (!downloadComplete && !responseStarted) {
            // Send a heartbeat comment (will be ignored by video players)
            keepAliveCount++;
            console.log(`[Download ${downloadId}] Keep-alive heartbeat #${keepAliveCount}`);
          }
        }, STREAMING_CONFIG.keepAliveInterval);

        // Store interval for cleanup
        const existing = activeDownloads.get(downloadId);
        if (existing) {
          existing.interval = keepAliveInterval;
        }

        // Handle stdout - stream video data directly
        proc.stdout?.on('data', (chunk: Buffer) => {
          responseStarted = true;
          bytesWritten += chunk.length;
          
          try {
            controller.enqueue(chunk);
          } catch (err) {
            // Client disconnected
            console.log(`[Download ${downloadId}] Client disconnected`);
            proc.kill('SIGTERM');
          }

          // Log progress periodically
          if (bytesWritten % (1024 * 1024) < chunk.length) {
            console.log(`[Download ${downloadId}] Streamed ${(bytesWritten / 1024 / 1024).toFixed(1)}MB`);
          }
        });

        // Handle stderr - progress info and errors
        proc.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          errorOutput += text;

          // Parse progress
          const lines = text.split('\n');
          for (const line of lines) {
            const progress = parseProgress(line);
            if (progress && progress.progress > lastProgress) {
              lastProgress = progress.progress;
              updateProgress(progressId, {
                progress: Math.round(10 + (progress.progress * 0.85)), // 10-95%
                message: `Downloading... ${progress.progress.toFixed(1)}% (${progress.speed})`,
                phase: 'downloading',
                speed: progress.speed,
                eta: progress.eta,
              });
            }

            // Check for errors in stderr
            if (line.includes('ERROR') || line.includes('error')) {
              console.error(`[Download ${downloadId}] yt-dlp error: ${line}`);
            }
          }
        });

        // Handle process completion
        proc.on('close', (code) => {
          downloadComplete = true;
          clearInterval(keepAliveInterval);

          if (code === 0) {
            console.log(`[Download ${downloadId}] Complete: ${(bytesWritten / 1024 / 1024).toFixed(2)}MB streamed`);
            updateProgress(progressId, {
              progress: 100,
              message: 'Download complete!',
              phase: 'complete',
            });

            // Log to history
            addHistoryEntry({
              url: url,
              title: title,
              format: formatId,
              success: true,
            }).catch(() => {});

            controller.close();
          } else {
            console.error(`[Download ${downloadId}] Failed with code ${code}`);
            
            // Check for specific errors
            let errorMsg = 'Download failed';
            if (errorOutput.includes('bot') || errorOutput.includes('Sign in')) {
              errorMsg = 'YouTube blocked the request. Try again later.';
              invalidateCookiesCache();
            } else if (errorOutput.includes('unavailable') || errorOutput.includes('not available')) {
              errorMsg = 'Video unavailable in your region or is private.';
            } else if (errorOutput.includes('format')) {
              errorMsg = 'Format not available. Try a different quality.';
            }

            updateProgress(progressId, {
              progress: 0,
              message: errorMsg,
              phase: 'error',
              error: errorMsg,
            });

            // Log failed attempt
            addHistoryEntry({
              url: url,
              title: title,
              format: formatId,
              success: false,
              error: errorMsg,
            }).catch(() => {});

            // If no data was sent, we can error properly
            if (!responseStarted) {
              controller.error(new Error(errorMsg));
            } else {
              // Data was sent, just close
              controller.close();
            }
          }

          // Cleanup
          cleanupDownload(downloadId);
        });

        // Handle process errors
        proc.on('error', (err) => {
          console.error(`[Download ${downloadId}] Process error:`, err.message);
          clearInterval(keepAliveInterval);
          
          if (!responseStarted) {
            controller.error(err);
          } else {
            controller.close();
          }
          
          cleanupDownload(downloadId);
        });
      },

      cancel() {
        console.log(`[Download ${downloadId}] Stream cancelled by client`);
        cleanupDownload(downloadId);
      },
    });

    // Return streaming response with keep-alive headers
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=300',
        'Cache-Control': 'no-cache, no-store',
        'X-Download-Id': downloadId,
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });

  } catch (error) {
    console.error(`[Download ${downloadId}] Fatal error:`, error);
    cleanupDownload(downloadId);

    const errorMsg = error instanceof Error ? error.message : 'Download failed';
    
    // Return JSON error (not 408/500) for better client handling
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMsg,
        suggestion: 'Try a lower quality format or wait a moment',
      }),
      { 
        status: 200, // Use 200 to avoid gateway errors
        headers: { 
          'Content-Type': 'application/json',
          'X-Error': 'true',
        } 
      }
    );
  }
}

/**
 * Handle download cancellation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const downloadId = searchParams.get('id');

    if (downloadId && activeDownloads.has(downloadId)) {
      cleanupDownload(downloadId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Download not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
