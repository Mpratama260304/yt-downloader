import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { config } from '@/lib/config';

/**
 * GET /api/health
 * Health check endpoint for Docker and load balancers
 */
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: config.version,
    checks: {
      server: true,
      ytdlp: false,
    },
  };

  // Check if yt-dlp binary exists
  const ytdlpPaths = [
    path.join(process.cwd(), 'bin', 'yt-dlp'),
    path.join(process.cwd(), 'bin', 'yt-dlp.exe'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];

  for (const ytdlpPath of ytdlpPaths) {
    if (fs.existsSync(ytdlpPath)) {
      health.checks.ytdlp = true;
      break;
    }
  }

  // Return 200 if healthy, 503 if not
  const isHealthy = health.checks.server && health.checks.ytdlp;
  
  return NextResponse.json(health, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
