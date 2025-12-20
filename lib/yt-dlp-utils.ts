/**
 * yt-dlp Utilities for Corruption Fix Update
 * 
 * Provides:
 * 1. Cookies caching (30s TTL) to reduce fetch overhead
 * 2. FFprobe validation to detect corrupted downloads
 * 3. Timeout utilities with AbortController support
 * 4. Retry logic with fallback format support
 * 
 * @version 5.1.0 - Corruption Fix Update
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import axios from 'axios';

// ==========================================
// Types
// ==========================================

export interface CookiesCache {
  content: string;
  lastFetch: number;
  tempPath: string | null;
  isValid: boolean;
}

export interface FFprobeResult {
  isValid: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  duration: number;
  format: string;
  error?: string;
  streams: {
    video: number;
    audio: number;
  };
}

export interface DownloadConfig {
  timeout: number;
  maxRetries: number;
  fallbackFormats: string[];
  concurrentFragments: number;
  socketTimeout: number;
  httpChunkSize: string;
}

export interface TimeoutController {
  abort: () => void;
  timeoutId: NodeJS.Timeout;
  isAborted: boolean;
}

// ==========================================
// Constants
// ==========================================

// Cache TTL: 30 seconds (matches external source refresh rate)
const COOKIES_CACHE_TTL = 30 * 1000;

// Fetch timeout for cookies
const COOKIES_FETCH_TIMEOUT = 5000;

// Default download timeout: 60 seconds for initial connection
const DEFAULT_CONNECT_TIMEOUT = 60 * 1000;

// Maximum download time: 5 minutes
const MAX_DOWNLOAD_TIMEOUT = 5 * 60 * 1000;

// FFprobe timeout: 30 seconds
const FFPROBE_TIMEOUT = 30 * 1000;

// Default download configuration
export const DEFAULT_DOWNLOAD_CONFIG: DownloadConfig = {
  timeout: MAX_DOWNLOAD_TIMEOUT,
  maxRetries: 3,
  fallbackFormats: [
    'best[height<=720]',       // 720p max (fast & stable)
    'best[height<=480]',       // 480p fallback
    'best[ext=mp4]',           // Any MP4
    'best',                    // Absolute fallback
  ],
  concurrentFragments: 4,      // Reduced from default for stability
  socketTimeout: 10,           // 10 seconds socket timeout
  httpChunkSize: '10M',        // 10MB chunks
};

// Temp directory for validation
const TEMP_DIR = path.join(os.tmpdir(), 'yt-dlp-validation');

// ==========================================
// Cookies Cache Implementation
// ==========================================

// In-memory cookies cache
const cookiesCache: CookiesCache = {
  content: '',
  lastFetch: 0,
  tempPath: null,
  isValid: false,
};

// External cookies URL
const COOKIES_URL = process.env.COOKIES_URL || 'https://amy-subjective-macro-powers.trycloudflare.com/';

/**
 * Check if cookies cache is still valid
 */
export function isCookiesCacheValid(): boolean {
  if (!cookiesCache.isValid) return false;
  if (!cookiesCache.content) return false;
  if (Date.now() - cookiesCache.lastFetch > COOKIES_CACHE_TTL) return false;
  return true;
}

/**
 * Get cached cookies or fetch fresh ones
 * Uses 30-second TTL to reduce external URL calls
 * 
 * @param forceRefresh - Force a fresh fetch ignoring cache
 * @returns Promise<{ content: string; tempPath: string; fromCache: boolean }>
 */
export async function getCachedCookies(forceRefresh = false): Promise<{
  content: string;
  tempPath: string;
  fromCache: boolean;
  usedFallback: boolean;
}> {
  // Check cache validity
  if (!forceRefresh && isCookiesCacheValid() && cookiesCache.tempPath && fs.existsSync(cookiesCache.tempPath)) {
    console.log('[CookiesCache] Using cached cookies (age: ' + Math.round((Date.now() - cookiesCache.lastFetch) / 1000) + 's)');
    return {
      content: cookiesCache.content,
      tempPath: cookiesCache.tempPath,
      fromCache: true,
      usedFallback: false,
    };
  }

  // Fetch fresh cookies
  console.log('[CookiesCache] Fetching fresh cookies from:', COOKIES_URL);
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COOKIES_FETCH_TIMEOUT);

    const response = await axios.get(COOKIES_URL, {
      timeout: COOKIES_FETCH_TIMEOUT,
      responseType: 'text',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YT-Downloader/5.1)',
        'Accept': 'text/plain, */*',
      },
      validateStatus: (status) => status < 500,
    });

    clearTimeout(timeoutId);

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = typeof response.data === 'string' ? response.data : String(response.data);

    // Validate basic format
    if (!content.includes('# Netscape') && !content.includes('# HTTP Cookie')) {
      throw new Error('Invalid cookies format');
    }

    if (!content.includes('.youtube.com') && !content.includes('youtube.com')) {
      throw new Error('No YouTube cookies found');
    }

    // Clean up old temp file
    if (cookiesCache.tempPath && fs.existsSync(cookiesCache.tempPath)) {
      try {
        fs.unlinkSync(cookiesCache.tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Write to new temp file
    ensureTempDir(TEMP_DIR);
    const tempPath = path.join(TEMP_DIR, `cached_cookies_${Date.now()}.txt`);
    fs.writeFileSync(tempPath, content, 'utf-8');

    // Update cache
    cookiesCache.content = content;
    cookiesCache.lastFetch = Date.now();
    cookiesCache.tempPath = tempPath;
    cookiesCache.isValid = true;

    console.log('[CookiesCache] Fresh cookies cached, length:', content.length);

    return {
      content,
      tempPath,
      fromCache: false,
      usedFallback: false,
    };
  } catch (error: any) {
    console.error('[CookiesCache] Fetch failed:', error.message);
    
    // Return fallback consent cookies
    return createFallbackCookies();
  }
}

/**
 * Create fallback consent cookies when fetch fails
 */
function createFallbackCookies(): {
  content: string;
  tempPath: string;
  fromCache: boolean;
  usedFallback: boolean;
} {
  const fallbackContent = `# Netscape HTTP Cookie File
# Fallback consent cookies generated by yt-dlp-utils
# Generated at: ${new Date().toISOString()}

.youtube.com\tTRUE\t/\tTRUE\t0\tSOCS\tCAISEAIgACgA
.youtube.com\tTRUE\t/\tTRUE\t0\tCONSENT\tYES+cb.20250101-01-p0.en+FX+123
`;

  ensureTempDir(TEMP_DIR);
  const tempPath = path.join(TEMP_DIR, `fallback_cookies_${Date.now()}.txt`);
  fs.writeFileSync(tempPath, fallbackContent, 'utf-8');

  console.log('[CookiesCache] Using fallback consent cookies');

  return {
    content: fallbackContent,
    tempPath,
    fromCache: false,
    usedFallback: true,
  };
}

/**
 * Invalidate cookies cache (force refresh on next request)
 */
export function invalidateCookiesCache(): void {
  cookiesCache.isValid = false;
  console.log('[CookiesCache] Cache invalidated');
}

/**
 * Cleanup cached cookies temp file
 */
export function cleanupCachedCookies(): void {
  if (cookiesCache.tempPath && fs.existsSync(cookiesCache.tempPath)) {
    try {
      fs.unlinkSync(cookiesCache.tempPath);
      cookiesCache.tempPath = null;
    } catch (error) {
      console.warn('[CookiesCache] Cleanup warning:', error);
    }
  }
}

// ==========================================
// FFprobe Validation Implementation
// ==========================================

/**
 * Ensure temp directory exists
 */
function ensureTempDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Validate downloaded video file using ffprobe
 * 
 * Checks:
 * 1. File exists and has content
 * 2. FFprobe can read the file (exit code 0)
 * 3. Has at least one video or audio stream
 * 4. Duration is reasonable (> 0)
 * 
 * @param filePath - Path to the downloaded video file
 * @returns Promise<FFprobeResult>
 */
export async function validateWithFFprobe(filePath: string): Promise<FFprobeResult> {
  console.log('[FFprobe] Validating file:', path.basename(filePath));

  // Check file exists
  if (!fs.existsSync(filePath)) {
    return {
      isValid: false,
      hasVideo: false,
      hasAudio: false,
      duration: 0,
      format: '',
      error: 'File does not exist',
      streams: { video: 0, audio: 0 },
    };
  }

  // Check file size (minimum 1KB to rule out empty/stub files)
  const stats = fs.statSync(filePath);
  if (stats.size < 1024) {
    return {
      isValid: false,
      hasVideo: false,
      hasAudio: false,
      duration: 0,
      format: '',
      error: `File too small: ${stats.size} bytes`,
      streams: { video: 0, audio: 0 },
    };
  }

  return new Promise((resolve) => {
    // FFprobe arguments for validation
    const args = [
      '-v', 'error',           // Only show errors
      '-show_format',          // Show format info
      '-show_streams',         // Show stream info
      '-of', 'json',           // Output as JSON
      filePath,
    ];

    const process = spawn('ffprobe', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    // Set timeout
    const timeout = setTimeout(() => {
      console.log('[FFprobe] Timeout - killing process');
      process.kill('SIGTERM');
      resolve({
        isValid: false,
        hasVideo: false,
        hasAudio: false,
        duration: 0,
        format: '',
        error: 'FFprobe timeout',
        streams: { video: 0, audio: 0 },
      });
    }, FFPROBE_TIMEOUT);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[FFprobe] Process error:', error.message);
      resolve({
        isValid: false,
        hasVideo: false,
        hasAudio: false,
        duration: 0,
        format: '',
        error: `FFprobe error: ${error.message}`,
        streams: { video: 0, audio: 0 },
      });
    });

    process.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        console.error('[FFprobe] Exit code:', code, 'stderr:', stderr.substring(0, 200));
        resolve({
          isValid: false,
          hasVideo: false,
          hasAudio: false,
          duration: 0,
          format: '',
          error: `FFprobe failed with code ${code}: ${stderr.substring(0, 100)}`,
          streams: { video: 0, audio: 0 },
        });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        
        // Count streams
        const streams = result.streams || [];
        let videoStreams = 0;
        let audioStreams = 0;

        for (const stream of streams) {
          if (stream.codec_type === 'video') {
            videoStreams++;
          } else if (stream.codec_type === 'audio') {
            audioStreams++;
          }
        }

        // Get duration from format
        const duration = parseFloat(result.format?.duration || '0');
        const format = result.format?.format_name || '';

        // Determine if valid
        // Valid if: has at least one stream AND duration > 0
        const hasVideo = videoStreams > 0;
        const hasAudio = audioStreams > 0;
        const isValid = (hasVideo || hasAudio) && duration > 0;

        console.log(`[FFprobe] Validation result: valid=${isValid}, video=${videoStreams}, audio=${audioStreams}, duration=${duration}s`);

        resolve({
          isValid,
          hasVideo,
          hasAudio,
          duration,
          format,
          streams: { video: videoStreams, audio: audioStreams },
        });
      } catch (parseError: any) {
        console.error('[FFprobe] JSON parse error:', parseError.message);
        resolve({
          isValid: false,
          hasVideo: false,
          hasAudio: false,
          duration: 0,
          format: '',
          error: 'Failed to parse FFprobe output',
          streams: { video: 0, audio: 0 },
        });
      }
    });
  });
}

/**
 * Quick validation without FFprobe (fallback when ffprobe unavailable)
 * Checks file size and basic header bytes
 */
export function quickValidateFile(filePath: string, isVideo: boolean = true): {
  isValid: boolean;
  error?: string;
} {
  if (!fs.existsSync(filePath)) {
    return { isValid: false, error: 'File not found' };
  }

  const stats = fs.statSync(filePath);
  
  // Minimum sizes
  const minSize = isVideo ? 50 * 1024 : 10 * 1024; // 50KB for video, 10KB for audio
  
  if (stats.size < minSize) {
    return { isValid: false, error: `File too small (${stats.size} bytes)` };
  }

  // Read first bytes to check for valid container signatures
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // Check for common container signatures
    const hex = buffer.toString('hex');
    
    // MP4/M4A/M4V: starts with ftyp at offset 4
    if (hex.includes('66747970')) { // 'ftyp'
      return { isValid: true };
    }
    
    // WebM/MKV: starts with 1A45DFA3
    if (hex.startsWith('1a45dfa3')) {
      return { isValid: true };
    }
    
    // MP3: ID3 tag or sync word
    if (hex.startsWith('494433') || hex.startsWith('fffb') || hex.startsWith('fff3')) {
      return { isValid: true };
    }

    // OGG/Opus: OggS
    if (hex.startsWith('4f676753')) {
      return { isValid: true };
    }

    // File has content but unknown format - could still be valid
    console.log('[QuickValidate] Unknown format, assuming valid. Header:', hex.substring(0, 16));
    return { isValid: true };
  } catch (error: any) {
    return { isValid: false, error: `Read error: ${error.message}` };
  }
}

// ==========================================
// Timeout and Process Management
// ==========================================

/**
 * Create a timeout controller for long-running operations
 */
export function createTimeoutController(timeoutMs: number, onTimeout?: () => void): TimeoutController {
  let isAborted = false;
  
  const controller: TimeoutController = {
    isAborted: false,
    timeoutId: setTimeout(() => {
      isAborted = true;
      controller.isAborted = true;
      if (onTimeout) onTimeout();
    }, timeoutMs),
    abort: () => {
      clearTimeout(controller.timeoutId);
      isAborted = true;
      controller.isAborted = true;
    },
  };

  return controller;
}

/**
 * Kill a child process with timeout
 */
export async function killProcessWithTimeout(
  process: ChildProcess,
  signal: NodeJS.Signals = 'SIGTERM',
  timeoutMs: number = 5000
): Promise<void> {
  return new Promise((resolve) => {
    if (!process.pid) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      try {
        process.kill('SIGKILL');
      } catch {
        // Ignore
      }
      resolve();
    }, timeoutMs);

    process.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      process.kill(signal);
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });
}

// ==========================================
// Fallback Format Selection
// ==========================================

/**
 * Get fallback format based on retry attempt
 * 
 * Attempt 0: Original format
 * Attempt 1: 720p max
 * Attempt 2: 480p max
 * Attempt 3+: best available
 */
export function getFallbackFormat(attempt: number, originalFormat: string): string {
  if (attempt === 0) {
    return originalFormat;
  }

  const fallbackIndex = Math.min(attempt - 1, DEFAULT_DOWNLOAD_CONFIG.fallbackFormats.length - 1);
  return DEFAULT_DOWNLOAD_CONFIG.fallbackFormats[fallbackIndex];
}

/**
 * Check if format is a "best quality" merge format
 * These formats are more prone to corruption
 */
export function isBestQualityFormat(formatId: string): boolean {
  const bestFormats = [
    'bestvideo+bestaudio',
    'bv*+ba',
    'bv+ba',
    'bestvideo*+bestaudio',
  ];
  
  return bestFormats.some(f => formatId.toLowerCase().includes(f.toLowerCase()));
}

/**
 * Get optimized yt-dlp format string for best quality
 * Uses safer alternatives to raw bestvideo+bestaudio
 */
export function getOptimizedBestFormat(preferredExt: string = 'mp4'): string {
  // Prioritize pre-merged formats, then merge if needed
  // This reduces the chance of merge failures
  if (preferredExt === 'webm') {
    return 'bestvideo[ext=webm]+bestaudio[ext=webm]/bestvideo+bestaudio/best';
  }
  
  // For MP4: prefer formats that don't require remuxing
  return 'bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/best[ext=mp4]/best';
}

// ==========================================
// Error Detection
// ==========================================

/**
 * Check if error indicates corruption
 */
export function isCorruptionError(error: string | Error): boolean {
  const errorStr = typeof error === 'string' ? error : error.message;
  const lower = errorStr.toLowerCase();
  
  const corruptionIndicators = [
    'corrupt',
    'invalid',
    'malformed',
    'truncated',
    'incomplete',
    'moov atom not found',
    'no such file',
    'premature end',
    'unexpected end',
    'broken',
  ];
  
  return corruptionIndicators.some(indicator => lower.includes(indicator));
}

/**
 * Check if error indicates timeout
 */
export function isTimeoutError(error: string | Error): boolean {
  const errorStr = typeof error === 'string' ? error : error.message;
  const lower = errorStr.toLowerCase();
  
  return lower.includes('timeout') || 
         lower.includes('timed out') || 
         lower.includes('deadline') ||
         lower.includes('etimedout');
}

/**
 * Check if error indicates rate limiting / bot detection
 */
export function isRateLimitError(error: string | Error): boolean {
  const errorStr = typeof error === 'string' ? error : error.message;
  const lower = errorStr.toLowerCase();
  
  return lower.includes('429') ||
         lower.includes('rate limit') ||
         lower.includes('too many') ||
         lower.includes('sign in') ||
         lower.includes('bot') ||
         lower.includes('captcha') ||
         lower.includes('403');
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Clean up old validation temp files
 */
export function cleanupValidationTempFiles(): void {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;
    
    const files = fs.readdirSync(TEMP_DIR);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < fiveMinutesAgo) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore individual file errors
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Get file size in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Check if ffprobe is available
 */
export async function isFFprobeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('ffprobe', ['-version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      process.kill();
      resolve(false);
    }, 5000);

    process.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });

    process.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// Run cleanup on module load
cleanupValidationTempFiles();
