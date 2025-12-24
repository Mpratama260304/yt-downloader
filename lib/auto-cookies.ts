/**
 * Auto-Fetch Cookies Utility
 * 
 * Automatically fetches fresh YouTube cookies from an external URL on-demand.
 * Replaces the manual admin cookie upload/rotation system.
 * 
 * The external URL (COOKIES_URL) serves a Netscape format cookies.txt file
 * that is refreshed every ~30 seconds, ensuring real-time sync with cookie changes.
 * 
 * @version 5.0.0
 */

import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

// ==========================================
// Configuration
// ==========================================

// External URL that serves fresh cookies.txt (Netscape format)
// This URL refreshes cookies every ~30 seconds
const COOKIES_URL = process.env.COOKIES_URL || 'https://amy-subjective-macro-powers.trycloudflare.com/';

// Timeout for fetching cookies (in milliseconds)
const FETCH_TIMEOUT = 5000; // 5 seconds

// Temp directory for cookie files
const TEMP_DIR = path.join(os.tmpdir(), 'yt-auto-cookies');

// Fallback consent cookies header for when fetch fails
// These are basic cookies that allow YouTube to work without login
const FALLBACK_CONSENT_COOKIE = 'SOCS=CAISEAIgACgA; CONSENT=YES+cb.20250101-01-p0.en+FX+123;';

// ==========================================
// Zod Schema for Validation
// ==========================================

/**
 * Validates that the fetched content is a valid Netscape cookies file
 * Must start with the Netscape header and contain YouTube domain cookies
 */
const cookiesSchema = z.string()
  .refine(
    (content) => {
      const trimmed = content.trim();
      // Check for Netscape header
      return trimmed.startsWith('# Netscape HTTP Cookie File') || 
             trimmed.startsWith('# HTTP Cookie File');
    },
    { message: 'Invalid cookies format: Missing Netscape header' }
  )
  .refine(
    (content) => {
      // Check for YouTube domain cookies
      return content.includes('.youtube.com') || content.includes('youtube.com');
    },
    { message: 'Invalid cookies format: No YouTube cookies found' }
  );

// ==========================================
// Types
// ==========================================

export interface CookiesFetchResult {
  success: boolean;
  tempPath?: string;
  error?: string;
  usedFallback?: boolean;
}

export interface AutoCookiesStats {
  lastFetchTime: number | null;
  lastFetchSuccess: boolean;
  totalFetches: number;
  successfulFetches: number;
  failedFetches: number;
  fallbackUses: number;
}

// ==========================================
// Statistics Tracking
// ==========================================

const stats: AutoCookiesStats = {
  lastFetchTime: null,
  lastFetchSuccess: false,
  totalFetches: 0,
  successfulFetches: 0,
  failedFetches: 0,
  fallbackUses: 0,
};

/**
 * Get current auto-cookies statistics
 */
export function getAutoCookiesStats(): AutoCookiesStats {
  return { ...stats };
}

/**
 * Reset statistics (for testing)
 */
export function resetStats(): void {
  stats.lastFetchTime = null;
  stats.lastFetchSuccess = false;
  stats.totalFetches = 0;
  stats.successfulFetches = 0;
  stats.failedFetches = 0;
  stats.fallbackUses = 0;
}

// ==========================================
// Core Functions
// ==========================================

/**
 * Ensure temp directory exists
 */
function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log('[AutoCookies] Created temp directory:', TEMP_DIR);
  }
}

/**
 * Generate unique temp file path for cookies
 */
function getTempCookiePath(): string {
  ensureTempDir();
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return path.join(TEMP_DIR, `auto_cookie_${timestamp}_${randomId}.txt`);
}

/**
 * Sanitize fetched cookies content
 * - Removes invalid lines
 * - Trims whitespace
 * - Ensures proper format
 */
function sanitizeCookies(content: string): string {
  const lines = content.split('\n');
  const validLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Keep header comments
    if (trimmed.startsWith('#')) {
      validLines.push(trimmed);
      continue;
    }
    
    // Skip empty lines
    if (trimmed === '') {
      continue;
    }
    
    // Validate cookie line format (tab-separated, 7 fields)
    const fields = trimmed.split('\t');
    if (fields.length >= 6) {
      // Basic sanitization: remove any potentially dangerous characters
      const sanitizedLine = fields
        .map(f => f.replace(/[\r\n]/g, ''))
        .join('\t');
      validLines.push(sanitizedLine);
    }
  }
  
  return validLines.join('\n') + '\n';
}

/**
 * Create a fallback cookies file with consent cookies
 * Used when external URL fetch fails
 */
function createFallbackCookiesFile(): string {
  const tempPath = getTempCookiePath();
  
  // Create minimal Netscape format cookies file with consent cookies
  const fallbackContent = `# Netscape HTTP Cookie File
# This is a fallback file generated when external cookies fetch failed
# Contains basic consent cookies for YouTube access

.youtube.com\tTRUE\t/\tTRUE\t0\tSOCS\tCAISEAIgACgA
.youtube.com\tTRUE\t/\tTRUE\t0\tCONSENT\tYES+cb.20250101-01-p0.en+FX+123
`;
  
  fs.writeFileSync(tempPath, fallbackContent, 'utf-8');
  console.log('[AutoCookies] Created fallback cookies file:', tempPath);
  
  return tempPath;
}

/**
 * Fetch fresh cookies from the external URL and write to a temp file
 * 
 * This function:
 * 1. Fetches cookies.txt content from COOKIES_URL
 * 2. Validates the format using Zod schema
 * 3. Sanitizes the content
 * 4. Writes to a unique temp file
 * 5. Returns the temp file path for yt-dlp to use
 * 
 * On failure, falls back to basic consent cookies
 * 
 * @returns Promise<CookiesFetchResult> - Contains temp path or fallback info
 */
export async function fetchFreshCookies(): Promise<CookiesFetchResult> {
  stats.totalFetches++;
  stats.lastFetchTime = Date.now();
  
  // Get cookies URL from database or env
  const cookiesUrl = await getCookiesUrlAsync();
  
  console.log('[AutoCookies] Fetching fresh cookies from:', cookiesUrl);
  
  try {
    // Fetch cookies from external URL with timeout
    const response = await axios.get(cookiesUrl, {
      timeout: FETCH_TIMEOUT,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YT-Downloader/5.0)',
        'Accept': 'text/plain, */*',
      },
      // Don't throw on non-2xx status
      validateStatus: (status) => status < 500,
    });
    
    // Check response status
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Get content as string
    const content = typeof response.data === 'string' 
      ? response.data 
      : String(response.data);
    
    // Validate cookies format
    const validationResult = cookiesSchema.safeParse(content);
    
    if (!validationResult.success) {
      console.warn('[AutoCookies] Validation failed:', validationResult.error.errors[0].message);
      throw new Error(validationResult.error.errors[0].message);
    }
    
    // Sanitize and write to temp file
    const sanitizedContent = sanitizeCookies(content);
    const tempPath = getTempCookiePath();
    
    fs.writeFileSync(tempPath, sanitizedContent, 'utf-8');
    
    // Update stats
    stats.successfulFetches++;
    stats.lastFetchSuccess = true;
    
    console.log('[AutoCookies] Successfully fetched and saved cookies to:', tempPath);
    console.log('[AutoCookies] Content length:', sanitizedContent.length, 'bytes');
    
    return {
      success: true,
      tempPath,
      usedFallback: false,
    };
    
  } catch (error) {
    // Update stats
    stats.failedFetches++;
    stats.lastFetchSuccess = false;
    
    // Log error details
    const errorMessage = error instanceof AxiosError 
      ? `Network error: ${error.code || error.message}`
      : error instanceof Error 
        ? error.message 
        : 'Unknown error';
    
    console.error('[AutoCookies] Fetch failed:', errorMessage);
    
    // Use fallback
    stats.fallbackUses++;
    const fallbackPath = createFallbackCookiesFile();
    
    console.log('[AutoCookies] Using fallback cookies');
    
    return {
      success: false,
      tempPath: fallbackPath,
      error: errorMessage,
      usedFallback: true,
    };
  }
}

/**
 * Get fresh cookies temp file path for yt-dlp
 * 
 * Convenience wrapper that returns just the path.
 * The caller should clean up the temp file after use.
 * 
 * @returns Promise<string> - Path to temp cookies file
 */
export async function getFreshCookiesTempPath(): Promise<string> {
  const result = await fetchFreshCookies();
  return result.tempPath!;
}

/**
 * Clean up a temporary cookies file
 * 
 * Should be called in a finally block after yt-dlp operations
 * 
 * @param tempPath - Path to the temp cookie file to delete
 */
export async function cleanupTempCookies(tempPath: string | null | undefined): Promise<void> {
  if (!tempPath) return;
  
  try {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      console.log('[AutoCookies] Cleaned up temp file:', path.basename(tempPath));
    }
  } catch (error) {
    // Ignore cleanup errors - file may already be deleted
    console.warn('[AutoCookies] Cleanup warning:', error);
  }
}

/**
 * Clean up all old temp cookie files (older than 5 minutes)
 * 
 * Should be called periodically to prevent temp directory bloat
 */
export function cleanupOldTempCookies(): void {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;
    
    const files = fs.readdirSync(TEMP_DIR);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let cleanedCount = 0;
    
    for (const file of files) {
      if (file.startsWith('auto_cookie_')) {
        const filePath = path.join(TEMP_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs < fiveMinutesAgo) {
            fs.unlinkSync(filePath);
            cleanedCount++;
          }
        } catch {
          // Ignore individual file errors
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[AutoCookies] Cleaned up ${cleanedCount} old temp files`);
    }
  } catch (error) {
    console.warn('[AutoCookies] Cleanup old files warning:', error);
  }
}

/**
 * Get fallback cookie header for --add-header argument
 * 
 * Used when you want to add cookies via header instead of file
 * NOTE: This is deprecated by yt-dlp but may be needed for edge cases
 * 
 * @returns Consent cookie string
 */
export function getFallbackCookieHeader(): string {
  return FALLBACK_CONSENT_COOKIE;
}

/**
 * Check if auto-cookies feature is enabled
 * 
 * @returns true if COOKIES_URL is configured
 */
export function isAutoCookiesEnabled(): boolean {
  return Boolean(COOKIES_URL);
}

/**
 * Get the configured cookies URL (for admin dashboard display)
 * Tries to load from database first, falls back to env variable
 */
export function getCookiesUrl(): string {
  return COOKIES_URL;
}

/**
 * Get the configured cookies URL with database fallback
 * This is async and should be used for actual cookie fetching
 */
export async function getCookiesUrlAsync(): Promise<string> {
  try {
    // Try to get from database first
    const { getSetting } = await import('@/lib/db');
    const dbUrl = await getSetting('cookies_url');
    if (dbUrl && dbUrl.trim()) {
      return dbUrl.trim();
    }
  } catch (error) {
    // If database access fails, fall through to env variable
    console.warn('[AutoCookies] Failed to fetch cookies_url from database:', error);
  }
  
  return COOKIES_URL;
}

/**
 * Set the cookies URL in the database
 */
export async function setCookiesUrl(url: string): Promise<void> {
  try {
    const { setSetting } = await import('@/lib/db');
    await setSetting('cookies_url', url.trim());
  } catch (error) {
    console.error('[AutoCookies] Failed to set cookies_url in database:', error);
    throw error;
  }
}
