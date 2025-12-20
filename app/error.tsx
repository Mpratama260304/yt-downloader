'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import Link from 'next/link';

// Note: In client components, we check NODE_ENV directly
// This is always available in Next.js without .env files
const isDev = process.env.NODE_ENV === 'development';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-error/10 flex items-center justify-center"
        >
          <FiAlertTriangle className="w-12 h-12 text-error" />
        </motion.div>

        {/* Message */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-base-content mb-2"
        >
          Something went wrong!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/60 mb-4"
        >
          An unexpected error occurred. Don&apos;t worry, we&apos;ve been notified and are working on it.
        </motion.p>

        {/* Error details (development only) */}
        {isDev && error.message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="collapse collapse-arrow bg-base-200 rounded-lg">
              <input type="checkbox" />
              <div className="collapse-title text-sm font-medium">
                Error Details
              </div>
              <div className="collapse-content">
                <pre className="text-xs text-left bg-base-300 p-3 rounded overflow-x-auto">
                  {error.message}
                  {error.digest && (
                    <span className="block mt-2 text-base-content/50">
                      Digest: {error.digest}
                    </span>
                  )}
                </pre>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <button onClick={reset} className="btn btn-primary gap-2">
            <FiRefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <Link href="/" className="btn btn-ghost gap-2">
            <FiHome className="w-5 h-5" />
            Go Home
          </Link>
        </motion.div>

        {/* Help text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-base-content/50 mt-8"
        >
          If this problem persists, please{' '}
          <a
            href="https://github.com/yourusername/youtube-downloader/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            report an issue
          </a>
          .
        </motion.p>
      </motion.div>
    </div>
  );
}
