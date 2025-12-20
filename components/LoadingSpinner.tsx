'use client';

import { motion } from 'framer-motion';
import { FiLoader } from 'react-icons/fi';

interface LoadingSpinnerProps {
  progress?: number;
  message?: string;
}

export default function LoadingSpinner({ progress = 0, message }: LoadingSpinnerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card bg-base-200 shadow-xl"
    >
      <div className="card-body items-center text-center py-12">
        {/* Animated spinner */}
        <div className="relative">
          {/* Outer ring */}
          <motion.div
            className="w-20 h-20 rounded-full border-4 border-base-300"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Progress ring */}
          <svg className="absolute inset-0 w-20 h-20 -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              strokeWidth="4"
              className="stroke-primary"
              strokeLinecap="round"
              strokeDasharray={226}
              strokeDashoffset={226 - (226 * progress) / 100}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <FiLoader className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        </div>

        {/* Progress text */}
        <div className="mt-6 space-y-2">
          <p className="text-lg font-medium text-base-content">
            {message || 'Fetching video information...'}
          </p>
          <p className="text-sm text-base-content/60">
            This may take a few seconds
          </p>
          
          {/* Progress bar */}
          <div className="w-64 h-2 bg-base-300 rounded-full overflow-hidden mt-4">
            <motion.div
              className="h-full progress-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <p className="text-xs text-base-content/40">
            {Math.round(progress)}% complete
          </p>
        </div>

        {/* Tips while loading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-xs text-base-content/50"
        >
          <p>💡 Tip: Upload cookies for better success rate with age-restricted content</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
