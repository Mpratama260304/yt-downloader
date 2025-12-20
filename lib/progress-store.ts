/**
 * Progress Store for Download Tracking
 * 
 * Shared store for tracking download progress across API routes
 * Used by download route to update and download-progress SSE to read
 * 
 * @version 4.3.0
 */

// Store for active download progress (in-memory)
// In production with multiple instances, consider Redis
export const downloadProgressStore = new Map<string, {
  progress: number;
  message: string;
  phase: string;
  speed?: string;
  eta?: string;
  error?: string;
  completed: boolean;
  fileReady: boolean;
  filePath?: string;
}>();

/**
 * Update progress for a download
 */
export function updateProgress(
  downloadId: string,
  data: Partial<{
    progress: number;
    message: string;
    phase: string;
    speed?: string;
    eta?: string;
    error?: string;
    completed: boolean;
    fileReady: boolean;
    filePath?: string;
  }>
): void {
  const existing = downloadProgressStore.get(downloadId) || {
    progress: 0,
    message: 'Initializing...',
    phase: 'preparing',
    completed: false,
    fileReady: false,
  };

  downloadProgressStore.set(downloadId, {
    ...existing,
    ...data,
  });
}

/**
 * Clear progress for a download
 */
export function clearProgress(downloadId: string): void {
  downloadProgressStore.delete(downloadId);
}

/**
 * Get progress for a download
 */
export function getProgress(downloadId: string) {
  return downloadProgressStore.get(downloadId);
}
