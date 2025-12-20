/**
 * Logging utility for the application
 * Uses winston for structured logging in production
 * Falls back to console in development
 * 
 * Configure via environment variables:
 *   LOG_LEVEL=debug|info|warn|error (default: info)
 *   NODE_ENV=development|production
 */

import winston from 'winston';
import { isDev, logLevel } from './config';

// Custom log format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

// JSON format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create winston logger
const winstonLogger = winston.createLogger({
  level: isDev ? 'debug' : logLevel,
  format: isDev ? devFormat : prodFormat,
  defaultMeta: { service: 'youtube-downloader' },
  transports: [
    new winston.transports.Console({
      silent: false,
    }),
  ],
});

// Logger interface
export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

// Create logger instance
export const logger: Logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, meta || '');
    } else {
      winstonLogger.info(message, meta);
    }
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, meta || '');
    } else {
      winstonLogger.warn(message, meta);
    }
  },

  error: (message: string, meta?: Record<string, unknown>) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, meta || '');
    } else {
      winstonLogger.error(message, meta);
    }
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, meta || '');
    } else {
      winstonLogger.debug(message, meta);
    }
  },
};

// Export default
export default logger;
