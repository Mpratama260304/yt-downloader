/**
 * Re-export all database functions from db/index.ts
 * This allows importing from '@/lib/db' instead of '@/lib/db/index'
 * 
 * v5.0: Removed Cookie type export - cookies are now auto-fetched
 */

export * from './db/index';
export type { HistoryEntry, Setting, User } from './db/schema';
