/**
 * Application Configuration
 * 
 * All configuration values can be overridden via environment variables.
 * This is designed for deployment on platforms like Phala Cloud that
 * only support docker-compose.yml environment variables (not .env files).
 * 
 * Set environment variables in docker-compose.yml:
 *   environment:
 *     - NODE_ENV=production
 *     - NEXT_PUBLIC_APP_URL=https://your-domain.com
 *     - RATE_LIMIT=20
 */

// Helper to get env var with default
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Application configuration
export const config = {
  // Environment
  nodeEnv: getEnv('NODE_ENV', 'production'),
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  // Server
  port: getEnvInt('PORT', 3000),
  hostname: getEnv('HOSTNAME', '0.0.0.0'),

  // Application URL
  appUrl: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),

  // yt-dlp
  ytdlpPath: getEnv('YTDLP_PATH', ''),

  // Rate limiting
  rateLimit: getEnvInt('RATE_LIMIT', 10),
  rateWindow: getEnvInt('RATE_WINDOW', 60000), // 1 minute in ms

  // Cookie settings
  cookieExpiry: getEnvInt('COOKIE_EXPIRY', 3600000), // 1 hour in ms

  // Logging
  logLevel: getEnv('LOG_LEVEL', 'info'),

  // App info
  version: '3.1.0',
  name: 'YouTube Downloader',
} as const;

// Type for the config
export type Config = typeof config;

// Export individual values for convenience
export const {
  nodeEnv,
  isDev,
  isProd,
  port,
  hostname,
  appUrl,
  ytdlpPath,
  rateLimit,
  rateWindow,
  cookieExpiry,
  logLevel,
} = config;

export default config;
