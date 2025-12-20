import { z } from 'zod';

/**
 * Schema for validating YouTube URLs
 */
export const youtubeUrlSchema = z.string().refine(
  (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/|playlist\?list=)|youtu\.be\/|music\.youtube\.com\/watch\?v=).+/i;
    return youtubeRegex.test(url);
  },
  { message: 'Please enter a valid YouTube URL' }
);

/**
 * Schema for format selection request
 */
export const formatRequestSchema = z.object({
  url: youtubeUrlSchema,
  formatId: z.string().min(1, 'Format ID is required'),
});

/**
 * Type definitions for video info
 */
export interface VideoFormat {
  formatId: string;
  formatNote: string;
  ext: string;
  resolution: string;
  filesize: number | null;
  filesizeApprox: number | null;
  vcodec: string;
  acodec: string;
  abr: number | null;
  vbr: number | null;
  fps: number | null;
  quality: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface PlaylistVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  durationString: string;
  url: string;
  channel?: string;
}

// Alias for compatibility
export type PlaylistEntry = PlaylistVideo;

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  duration: number;
  durationString: string;
  channel: string;
  channelUrl: string;
  uploadDate: string;
  viewCount: number;
  likeCount: number;
  formats: VideoFormat[];
  isPlaylist: boolean;
  playlistTitle?: string;
  playlistCount?: number;
  playlistVideos?: PlaylistVideo[];
}

export interface DownloadUrl {
  url: string;
  filename: string;
  ext: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  isBotDetection?: boolean;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    server: boolean;
    ytdlp: boolean;
  };
}
