/**
 * yt-dlp Utilities for Streaming Fix Update
 * 
 * v5.3.0 CHANGES (408 Timeout Final Fix):
 * - STREAMING CONFIG: Optimized for pure stdout streaming
 * - PROXY SUPPORT: Rotate proxies to bypass blocks/slowdowns
 * - KEEP-ALIVE: Heartbeat interval config
 * - NO VALIDATION: Rely on yt-dlp exit code (no FFprobe)
 * - EXTENDED CACHE: 120s cookies cache for stability
 * 
 * @version 5.3.0 - Streaming Fix Update
 */

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

export interface StreamingConfig {
  keepAliveInterval: number;  // ms between heartbeats
  socketTimeout: number;      // yt-dlp socket timeout
  retries: number;            // yt-dlp retries
  fragmentRetries: number;    // yt-dlp fragment retries
  concurrentFragments: number;// parallel fragments
  httpChunkSize: string;      // chunk size
  bufferSize: string;         // buffer size
  maxDuration: number;        // max video duration (seconds)
  maxFileSize: number;        // max file size (bytes)
}

export interface ProxyConfig {
  url: string;
  username?: string;
  password?: string;
  enabled: boolean;
}

// ==========================================
// Constants - v5.3.0 Streaming Optimized
// ==========================================

// Cache TTL: 120 seconds (extended for streaming stability)
const COOKIES_CACHE_TTL = 120 * 1000;

// Fetch timeout for cookies
const COOKIES_FETCH_TIMEOUT = 10000;

// Temp directory
const TEMP_DIR = path.join(os.tmpdir(), 'yt-downloader');

// External cookies URL
const COOKIES_URL = process.env.COOKIES_URL || 'https://amy-subjective-macro-powers.trycloudflare.com/';

/**
 * Streaming configuration - optimized for Phala Cloud/Vercel
 */
export const STREAMING_CONFIG: StreamingConfig = {
  keepAliveInterval: 10000,   // 10s heartbeat
  socketTimeout: 60,          // 60s socket timeout
  retries: 10,                // More retries for resilience
  fragmentRetries: 10,        // Fragment retries
  concurrentFragments: 1,     // Single fragment for stability
  httpChunkSize: '5M',        // 5MB chunks (smaller for faster start)
  bufferSize: '16K',          // 16KB buffer
  maxDuration: 600,           // 10 min max (warn above this)
  maxFileSize: 500 * 1024 * 1024, // 500MB max (warn above this)
};

// ==========================================
// Proxy Management
// ==========================================

// In-memory proxy list
let proxyList: string[] = [];

/**
 * Initialize proxy list from environment or database
 */
export function initProxyList(): void {
  const envProxies = process.env.PROXY_LIST || process.env.PROXIES || '';
  if (envProxies) {
    proxyList = envProxies
      .split(/[,;\n]/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && (p.startsWith('http') || p.startsWith('socks')));
    console.log(`[Proxy] Loaded ${proxyList.length} proxies from env`);
  }
}

/**
 * Get the current proxy list
 */
export function getProxyList(): string[] {
  if (proxyList.length === 0) {
    initProxyList();
  }
  return proxyList;
}

/**
 * Set proxy list (from admin panel)
 */
export function setProxyList(proxies: string[]): void {
  proxyList = proxies.filter(p => p && (p.startsWith('http') || p.startsWith('socks')));
  console.log(`[Proxy] Updated proxy list: ${proxyList.length} proxies`);
}

/**
 * Get a random proxy from the list
 */
export function getRandomProxy(): string | null {
  const proxies = getProxyList();
  if (proxies.length === 0) return null;
  const index = Math.floor(Math.random() * proxies.length);
  return proxies[index];
}

/**
 * Add a single proxy to the list
 */
export function addProxy(proxy: string): void {
  if (proxy && (proxy.startsWith('http') || proxy.startsWith('socks'))) {
    if (!proxyList.includes(proxy)) {
      proxyList.push(proxy);
    }
  }
}

/**
 * Remove a proxy from the list
 */
export function removeProxy(proxy: string): void {
  proxyList = proxyList.filter(p => p !== proxy);
}

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

/**
 * Ensure temp directory exists
 */
function ensureTempDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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
 * Invalidate the cookies cache (force refresh on next request)
 */
export function invalidateCookiesCache(): void {
  console.log('[CookiesCache] Invalidated');
  cookiesCache.isValid = false;
}

/**
 * Get cached cookies or fetch fresh ones
 * Uses 120-second TTL for streaming stability
 */
export async function getCachedCookies(forceRefresh = false): Promise<{
  content: string;
  tempPath: string;
  fromCache: boolean;
  usedFallback: boolean;
}> {
  // Check cache validity
  if (!forceRefresh && isCookiesCacheValid() && cookiesCache.tempPath && fs.existsSync(cookiesCache.tempPath)) {
    const age = Math.round((Date.now() - cookiesCache.lastFetch) / 1000);
    console.log(`[CookiesCache] Using cached cookies (age: ${age}s)`);
    return {
      content: cookiesCache.content,
      tempPath: cookiesCache.tempPath,
      fromCache: true,
      usedFallback: false,
    };
  }

  console.log('[CookiesCache] Fetching fresh cookies from:', COOKIES_URL);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COOKIES_FETCH_TIMEOUT);

    const response = await axios.get(COOKIES_URL, {
      timeout: COOKIES_FETCH_TIMEOUT,
      responseType: 'text',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YT-Downloader/5.3)',
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
      } catch { /* ignore */ }
    }

    // Write to new temp file
    ensureTempDir(TEMP_DIR);
    const tempPath = path.join(TEMP_DIR, `cookies_${Date.now()}.txt`);
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

  } catch (error) {
    console.error('[CookiesCache] Fetch failed:', error instanceof Error ? error.message : error);

    // Generate fallback consent cookies
    const fallbackContent = generateConsentCookies();
    
    ensureTempDir(TEMP_DIR);
    const tempPath = path.join(TEMP_DIR, `cookies_fallback_${Date.now()}.txt`);
    fs.writeFileSync(tempPath, fallbackContent, 'utf-8');

    // Update cache with fallback
    cookiesCache.content = fallbackContent;
    cookiesCache.lastFetch = Date.now();
    cookiesCache.tempPath = tempPath;
    cookiesCache.isValid = true;

    console.log('[CookiesCache] Using fallback consent cookies');

    return {
      content: fallbackContent,
      tempPath,
      fromCache: false,
      usedFallback: true,
    };
  }
}

/**
 * Generate basic YouTube consent cookies
 */
function generateConsentCookies(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const expiry = timestamp + (365 * 24 * 60 * 60); // 1 year
  
  return `# Netscape HTTP Cookie File
# Generated by YT-Downloader v5.3.0
# This file contains consent cookies for YouTube

.youtube.com\tTRUE\t/\tTRUE\t${expiry}\tCONSENT\tYES+cb.20240101-00-p0.en+FX+${timestamp}
.youtube.com\tTRUE\t/\tFALSE\t${expiry}\tPREF\ttz=UTC&f6=40000000
.youtube.com\tTRUE\t/\tTRUE\t${expiry}\tSECS\t${timestamp}
.google.com\tTRUE\t/\tTRUE\t${expiry}\tCONSENT\tYES+cb.20240101-00-p0.en+FX+${timestamp}
`;
}

// ==========================================
// Video Limit Checking
// ==========================================

/**
 * Check if video exceeds recommended limits
 */
export function checkVideoLimits(duration: number, fileSize: number): {
  exceedsLimits: boolean;
  durationWarning: boolean;
  sizeWarning: boolean;
  message: string;
} {
  const durationWarning = duration > STREAMING_CONFIG.maxDuration;
  const sizeWarning = fileSize > STREAMING_CONFIG.maxFileSize;
  const exceedsLimits = durationWarning || sizeWarning;

  let message = '';
  if (durationWarning && sizeWarning) {
    message = `Video is ${Math.round(duration / 60)} min and ${Math.round(fileSize / 1024 / 1024)}MB. May timeout - try lower quality.`;
  } else if (durationWarning) {
    message = `Video is ${Math.round(duration / 60)} min. Longer videos may timeout - try lower quality.`;
  } else if (sizeWarning) {
    message = `File is ${Math.round(fileSize / 1024 / 1024)}MB. Large files may timeout - try lower quality.`;
  }

  return { exceedsLimits, durationWarning, sizeWarning, message };
}

// ==========================================
// Error Detection
// ==========================================

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('etimedout') ||
    lower.includes('econnreset') ||
    lower.includes('socket hang up') ||
    lower.includes('408')
  );
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('network') ||
    lower.includes('dns') ||
    lower.includes('unreachable')
  );
}

/**
 * Check if error is a bot detection error
 */
export function isBotError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('bot') ||
    lower.includes('sign in') ||
    lower.includes('confirm') ||
    lower.includes('captcha') ||
    lower.includes('blocked') ||
    lower.includes('403')
  );
}

// ==========================================
// Format Helpers
// ==========================================

/**
 * Get fallback format for lower quality retry
 */
export function getFallbackFormat(currentFormat: string): string | null {
  const fallbackChain: Record<string, string> = {
    'best': 'best[height<=720]',
    'bestvideo+bestaudio': 'best[height<=720]',
    'best[height<=1080]': 'best[height<=720]',
    'best[height<=720]': 'best[height<=480]',
    'best[height<=480]': 'best[height<=360]',
    'best[height<=360]': 'best',
  };

  // Check for height pattern
  const heightMatch = currentFormat.match(/height<=(\d+)/);
  if (heightMatch) {
    const height = parseInt(heightMatch[1]);
    if (height > 720) return 'best[height<=720]';
    if (height > 480) return 'best[height<=480]';
    if (height > 360) return 'best[height<=360]';
    return 'best';
  }

  return fallbackChain[currentFormat] || 'best[height<=480]';
}

/**
 * Check if format is "best quality" (may timeout)
 */
export function isBestQualityFormat(format: string): boolean {
  if (!format) return false;
  const lower = format.toLowerCase();
  return (
    lower === 'best' ||
    lower === 'bestvideo+bestaudio' ||
    lower.includes('1080') ||
    lower.includes('1440') ||
    lower.includes('2160') ||
    lower.includes('4k')
  );
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format duration to human readable string
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Initialize proxy list on module load
initProxyList();
