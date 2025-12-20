/**
 * /api/download-progress/route.ts
 * 
 * Server-Sent Events (SSE) endpoint for real-time download progress
 * Provides live updates during the "Preparing" phase
 * 
 * @version 4.3.0
 */

import { NextRequest } from 'next/server';
import { downloadProgressStore } from '@/lib/progress-store';

/**
 * GET /api/download-progress
 * SSE endpoint for streaming progress updates
 */
export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams;
  const downloadId = searchParams.get('id');

  if (!downloadId) {
    return new Response(
      JSON.stringify({ error: 'Download ID required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create SSE response
  const encoder = new TextEncoder();
  let isActive = true;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialData = JSON.stringify({
        progress: 0,
        message: 'Connecting...',
        phase: 'connecting',
      });
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

      // Poll for updates
      const interval = setInterval(() => {
        if (!isActive) {
          clearInterval(interval);
          return;
        }

        const progressData = downloadProgressStore.get(downloadId);
        
        if (progressData) {
          const data = JSON.stringify({
            progress: progressData.progress,
            message: progressData.message,
            phase: progressData.phase,
            speed: progressData.speed,
            eta: progressData.eta,
            error: progressData.error,
            completed: progressData.completed,
            fileReady: progressData.fileReady,
          });
          
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            // Stream closed
            isActive = false;
            clearInterval(interval);
          }

          // Clean up completed downloads after sending final message
          if (progressData.completed || progressData.error) {
            setTimeout(() => {
              downloadProgressStore.delete(downloadId);
            }, 5000); // Keep for 5 seconds after completion
          }
        } else {
          // No data yet, send heartbeat
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            isActive = false;
            clearInterval(interval);
          }
        }
      }, 500); // Update every 500ms

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      // Auto-close after 10 minutes (timeout)
      setTimeout(() => {
        isActive = false;
        clearInterval(interval);
        try {
          const timeoutData = JSON.stringify({
            progress: 0,
            message: 'Connection timed out',
            phase: 'error',
            error: 'Download took too long',
            completed: false,
          });
          controller.enqueue(encoder.encode(`data: ${timeoutData}\n\n`));
          controller.close();
        } catch {
          // Already closed
        }
      }, 10 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
