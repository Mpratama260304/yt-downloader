import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';
import { VideoInfo, VideoFormat, PlaylistVideo } from './types';
import { getRandomUserAgent } from './user-agents';
import { cleanupOldTempCookies } from './auto-cookies';
import { ytdlpPath as configYtdlpPath } from './config';

// Path to yt-dlp binary - check custom path first, then local, then system
const LOCAL_YTDLP_PATH = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// Check for system yt-dlp if local doesn't exist
function getYtDlpPath(): string {
  // 1. Check for custom path from env var
  if (configYtdlpPath && fs.existsSync(configYtdlpPath)) {
    return configYtdlpPath;
  }
  // 2. Check for local binary
  if (fs.existsSync(LOCAL_YTDLP_PATH)) {
    return LOCAL_YTDLP_PATH;
  }
  // 3. Fallback to system yt-dlp
  return 'yt-dlp';
}

/**
 * Create a new YTDlpWrap instance
 */
export function createYtDlp(): YTDlpWrap {
  return new YTDlpWrap(getYtDlpPath());
}

/**
 * Get anti-bot detection arguments for yt-dlp
 * These options help bypass YouTube's "Sign in to confirm you're not a bot" error
 * 
 * CRITICAL v4.3.0: Do NOT use --add-header for cookies!
 * It causes: "Deprecated Feature: Passing cookies as a header is a potential security risk"
 * Always use --cookies with a temp file instead.
 * 
 * @param cookiePath - Optional direct path to cookies file (REQUIRED for auth)
 * @returns Array of yt-dlp arguments
 */
export function getAntiBotArgs(cookiePath?: string): string[] {
  const args: string[] = [];
  
  // Random User-Agent to avoid detection patterns
  const userAgent = getRandomUserAgent();
  args.push('--user-agent', userAgent);
  
  // Set YouTube as referrer
  args.push('--referer', 'https://www.youtube.com/');
  
  // CRITICAL: Use cookies FILE only, never headers
  // The --add-header Cookie: approach is deprecated and causes security warnings
  if (cookiePath && fs.existsSync(cookiePath)) {
    args.push('--cookies', cookiePath);
  }
  
  // Add non-cookie headers to look more like a browser
  // (These are safe - only Cookie header is deprecated)
  args.push('--add-header', 'Accept-Language: en-US,en;q=0.9');
  args.push('--add-header', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
  
  // Rate limiting to avoid triggering bot detection
  args.push('--sleep-requests', '1');
  args.push('--sleep-interval', '2');
  args.push('--max-sleep-interval', '5');
  
  // Disable certificate check if needed (some environments)
  args.push('--no-check-certificates');
  
  // Use extractor args for YouTube specifically
  args.push('--extractor-args', 'youtube:player_client=web,default;po_token=web+MnQNCfXWk5g0iAblYe-ArcaDndANJ3WZPB7aVb-3u8N_J1E6TOKe5FYmhDXDvbT0ADEX2R6dGmPCB3-2R9t_fqBWCeyTSqPGmMXqMGWdXmCVCSqvMWjx0XA8cFo6jFg_F5BX6AOoHY37MfqKZXJB9g==');
  
  // Geo bypass
  args.push('--geo-bypass');
  
  // Force IPv4 (some servers have issues with IPv6)
  args.push('--force-ipv4');
  
  // Ignore errors and continue
  args.push('--ignore-errors');
  
  // No warnings in output
  args.push('--no-warnings');
  
  return args;
}

/**
 * Check if an error is a bot detection error
 */
export function isBotDetectionError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
  
  const botDetectionPhrases = [
    'sign in to confirm',
    'confirm you\'re not a bot',
    'confirm your identity',
    'unusual traffic',
    'automated requests',
    'captcha',
    'verify you are human',
    'too many requests',
    'rate limit',
    '429',
    'access denied',
    'bot',
  ];
  
  return botDetectionPhrases.some((phrase) => errorMessage.includes(phrase));
}

/**
 * Get user-friendly error message
 * v5.0: Updated message for auto-cookies system
 */
export function getErrorMessage(error: any): string {
  if (isBotDetectionError(error)) {
    return 'YouTube detected bot activity. The auto-cookies system will retry with fresh cookies. If this persists, the external cookie source may be unavailable.';
  }
  
  const errorMessage = error?.message?.toLowerCase() || '';
  
  if (errorMessage.includes('video unavailable') || errorMessage.includes('unavailable')) {
    return 'This video is unavailable or has been removed.';
  }
  if (errorMessage.includes('private')) {
    return 'This video is private and cannot be accessed.';
  }
  if (errorMessage.includes('age')) {
    return 'This video is age-restricted. Please upload cookies from a logged-in YouTube account to access it.';
  }
  if (errorMessage.includes('copyright')) {
    return 'This video is not available due to copyright restrictions.';
  }
  if (errorMessage.includes('geo') || errorMessage.includes('country')) {
    return 'This video is not available in your region.';
  }
  if (errorMessage.includes('live')) {
    return 'Live streams cannot be downloaded while they are live.';
  }
  
  return error?.message || 'Failed to fetch video information. Please try again.';
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Parse format information from yt-dlp output
 */
function parseFormats(formats: any[]): VideoFormat[] {
  if (!formats || !Array.isArray(formats)) return [];
  
  return formats
    .filter((f) => f.format_id && (f.vcodec !== 'none' || f.acodec !== 'none'))
    .map((f) => ({
      formatId: f.format_id,
      formatNote: f.format_note || f.resolution || 'Unknown',
      ext: f.ext || 'mp4',
      resolution: f.resolution || (f.height ? `${f.height}p` : 'audio only'),
      filesize: f.filesize || null,
      filesizeApprox: f.filesize_approx || null,
      vcodec: f.vcodec || 'none',
      acodec: f.acodec || 'none',
      abr: f.abr || null,
      vbr: f.vbr || null,
      fps: f.fps || null,
      quality: getQualityLabel(f),
      hasVideo: f.vcodec !== 'none',
      hasAudio: f.acodec !== 'none',
    }))
    .sort((a, b) => {
      // Sort by quality (video first, then by resolution)
      if (a.hasVideo && !b.hasVideo) return -1;
      if (!a.hasVideo && b.hasVideo) return 1;
      
      const aHeight = parseInt(a.resolution) || 0;
      const bHeight = parseInt(b.resolution) || 0;
      return bHeight - aHeight;
    });
}

/**
 * Get a user-friendly quality label
 */
function getQualityLabel(format: any): string {
  const parts: string[] = [];
  
  if (format.height) {
    parts.push(`${format.height}p`);
  }
  
  if (format.fps && format.fps > 30) {
    parts.push(`${format.fps}fps`);
  }
  
  if (format.vcodec === 'none' && format.acodec !== 'none') {
    parts.push('Audio Only');
    if (format.abr) {
      parts.push(`${Math.round(format.abr)}kbps`);
    }
  }
  
  if (format.format_note) {
    parts.push(format.format_note);
  }
  
  return parts.join(' - ') || format.format_id;
}

/**
 * Execute yt-dlp with JSON output and parse response
 * Uses execPromise directly to have full control over arguments
 */
async function execYtDlpJson(ytDlp: YTDlpWrap, args: string[]): Promise<any> {
  const result = await ytDlp.execPromise([...args, '--dump-json']);
  
  // Handle multiple JSON objects (e.g., for playlists with --flat-playlist)
  const lines = result.trim().split('\n').filter(Boolean);
  
  if (lines.length === 1) {
    return JSON.parse(lines[0]);
  }
  
  // Multiple entries (playlist)
  const entries = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
  
  // Return as playlist format
  if (entries.length > 0) {
    return {
      _type: 'playlist',
      entries,
      playlist_count: entries.length,
    };
  }
  
  throw new Error('No valid JSON response from yt-dlp');
}

/**
 * Fetch video information from YouTube
 * @param url - YouTube video or playlist URL
 * @param cookiePath - Optional path to cookies file for authentication
 */
export async function fetchVideoInfo(url: string, cookiePath?: string): Promise<VideoInfo> {
  const ytDlp = createYtDlp();
  
  // Clean up old temp cookies periodically (v5.0: using auto-cookies)
  cleanupOldTempCookies();
  
  try {
    // Check if it's a playlist
    const isPlaylist = url.includes('list=');
    
    // Get anti-bot detection arguments
    const antiBotArgs = getAntiBotArgs(cookiePath);
    
    let rawInfo: any;
    
    // Build full argument list
    const baseArgs = [url, ...antiBotArgs];
    
    if (isPlaylist) {
      // For playlists, get flat list first
      rawInfo = await execYtDlpJson(ytDlp, [...baseArgs, '--flat-playlist']);
    } else {
      rawInfo = await execYtDlpJson(ytDlp, [...baseArgs, '--no-playlist']);
    }

    if (isPlaylist && rawInfo.entries) {
      // Handle playlist
      const playlistVideos: PlaylistVideo[] = rawInfo.entries.slice(0, 50).map((entry: any) => ({
        id: entry.id,
        title: entry.title || 'Unknown Title',
        thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
        duration: entry.duration || 0,
        durationString: formatDuration(entry.duration || 0),
        url: `https://www.youtube.com/watch?v=${entry.id}`,
      }));

      return {
        id: rawInfo.id || 'playlist',
        title: rawInfo.title || 'Playlist',
        thumbnail: rawInfo.thumbnail || playlistVideos[0]?.thumbnail || '',
        description: rawInfo.description || '',
        duration: 0,
        durationString: '',
        channel: rawInfo.channel || rawInfo.uploader || 'Unknown',
        channelUrl: rawInfo.channel_url || rawInfo.uploader_url || '',
        uploadDate: '',
        viewCount: 0,
        likeCount: 0,
        formats: [],
        isPlaylist: true,
        playlistTitle: rawInfo.title,
        playlistCount: rawInfo.playlist_count || playlistVideos.length,
        playlistVideos,
      };
    }

    // Handle single video
    const formats = parseFormats(rawInfo.formats);
    
    // Add combined formats for convenience
    const combinedFormats = getCombinedFormats(formats);

    return {
      id: rawInfo.id,
      title: rawInfo.title || 'Unknown Title',
      thumbnail: rawInfo.thumbnail || `https://i.ytimg.com/vi/${rawInfo.id}/hqdefault.jpg`,
      description: rawInfo.description?.slice(0, 500) || '',
      duration: rawInfo.duration || 0,
      durationString: formatDuration(rawInfo.duration || 0),
      channel: rawInfo.channel || rawInfo.uploader || 'Unknown',
      channelUrl: rawInfo.channel_url || rawInfo.uploader_url || '',
      uploadDate: rawInfo.upload_date || '',
      viewCount: rawInfo.view_count || 0,
      likeCount: rawInfo.like_count || 0,
      formats: [...combinedFormats, ...formats],
      isPlaylist: false,
    };
  } catch (error: any) {
    console.error('yt-dlp error:', error);
    
    // Use the enhanced error message handler
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get combined format options (video + audio)
 */
function getCombinedFormats(formats: VideoFormat[]): VideoFormat[] {
  const combined: VideoFormat[] = [];
  
  // Best video + audio
  combined.push({
    formatId: 'bestvideo+bestaudio/best',
    formatNote: 'Best Quality',
    ext: 'mp4',
    resolution: 'Best',
    filesize: null,
    filesizeApprox: null,
    vcodec: 'auto',
    acodec: 'auto',
    abr: null,
    vbr: null,
    fps: null,
    quality: '🏆 Best Quality (Video + Audio)',
    hasVideo: true,
    hasAudio: true,
  });

  // 1080p
  combined.push({
    formatId: 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    formatNote: '1080p',
    ext: 'mp4',
    resolution: '1080p',
    filesize: null,
    filesizeApprox: null,
    vcodec: 'auto',
    acodec: 'auto',
    abr: null,
    vbr: null,
    fps: null,
    quality: '📺 1080p Full HD (Video + Audio)',
    hasVideo: true,
    hasAudio: true,
  });

  // 720p
  combined.push({
    formatId: 'bestvideo[height<=720]+bestaudio/best[height<=720]',
    formatNote: '720p',
    ext: 'mp4',
    resolution: '720p',
    filesize: null,
    filesizeApprox: null,
    vcodec: 'auto',
    acodec: 'auto',
    abr: null,
    vbr: null,
    fps: null,
    quality: '📺 720p HD (Video + Audio)',
    hasVideo: true,
    hasAudio: true,
  });

  // 480p
  combined.push({
    formatId: 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    formatNote: '480p',
    ext: 'mp4',
    resolution: '480p',
    filesize: null,
    filesizeApprox: null,
    vcodec: 'auto',
    acodec: 'auto',
    abr: null,
    vbr: null,
    fps: null,
    quality: '📺 480p SD (Video + Audio)',
    hasVideo: true,
    hasAudio: true,
  });

  // Audio only (best)
  combined.push({
    formatId: 'bestaudio/best',
    formatNote: 'Audio Only',
    ext: 'm4a',
    resolution: 'audio only',
    filesize: null,
    filesizeApprox: null,
    vcodec: 'none',
    acodec: 'auto',
    abr: null,
    vbr: null,
    fps: null,
    quality: '🎵 Best Audio Only',
    hasVideo: false,
    hasAudio: true,
  });

  // MP3 Audio
  combined.push({
    formatId: 'bestaudio[ext=m4a]/bestaudio/best',
    formatNote: 'MP3 Audio',
    ext: 'mp3',
    resolution: 'audio only',
    filesize: null,
    filesizeApprox: null,
    vcodec: 'none',
    acodec: 'mp3',
    abr: null,
    vbr: null,
    fps: null,
    quality: '🎵 Audio (MP3 format)',
    hasVideo: false,
    hasAudio: true,
  });

  return combined;
}

/**
 * Get direct download URL for a specific format
 * @param url - YouTube video URL
 * @param formatId - Format ID to download
 * @param cookiePath - Optional path to cookies file for authentication
 */
export async function getDownloadUrl(url: string, formatId: string, cookiePath?: string): Promise<{ url: string; filename: string }> {
  const ytDlp = createYtDlp();
  
  // Get anti-bot detection arguments
  const antiBotArgs = getAntiBotArgs(cookiePath);
  
  try {
    // Get the direct URL using -g flag
    const args = [
      url,
      '-f', formatId,
      '-g',
      '--no-playlist',
      ...antiBotArgs,
    ];
    
    const result = await ytDlp.execPromise(args);
    const urls = result.trim().split('\n').filter(Boolean);
    
    if (!urls.length) {
      throw new Error('No download URL returned');
    }
    
    // Get filename
    const filenameArgs = [
      url,
      '-f', formatId,
      '--get-filename',
      '-o', '%(title)s.%(ext)s',
      '--no-playlist',
      ...antiBotArgs,
    ];
    
    const filenameResult = await ytDlp.execPromise(filenameArgs);
    const filename = sanitizeFilename(filenameResult.trim());
    
    // If there are multiple URLs (video + audio separate streams), 
    // return the first one (video) - browser can only handle single URL
    // For merged formats, yt-dlp returns the combined stream URL
    return {
      url: urls[0],
      filename,
    };
  } catch (error: any) {
    console.error('Error getting download URL:', error);
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Sanitize filename for safe download
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Simple in-memory rate limiter
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests
const RATE_WINDOW = 60 * 1000; // 1 minute

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((record, ip) => {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  });
}, 60 * 1000);
