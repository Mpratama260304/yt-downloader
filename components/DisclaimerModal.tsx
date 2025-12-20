'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export default function DisclaimerModal({ isOpen, onAccept }: DisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="card bg-base-100 shadow-2xl max-w-lg w-full"
        >
          <div className="card-body">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="card-title text-xl">Legal Disclaimer</h3>
                <p className="text-sm text-base-content/60">Please read before using</p>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4 text-sm text-base-content/80">
              <p>
                This tool is designed for{' '}
                <strong className="text-base-content">educational and personal use only</strong>.
                By using this service, you agree to the following terms:
              </p>

              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <FiCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span>
                    Only download content you have permission to download or own
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <FiCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span>
                    Respect copyright laws and intellectual property rights
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <FiCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span>
                    Do not use downloaded content for commercial purposes without authorization
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <FiX className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <span>
                    We are not responsible for any misuse of this tool
                  </span>
                </li>
              </ul>

              <div className="alert alert-warning">
                <FiAlertTriangle className="w-4 h-4" />
                <span className="text-xs">
                  Downloading copyrighted content without permission may violate YouTube&apos;s 
                  Terms of Service and applicable copyright laws in your jurisdiction.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="card-actions justify-end mt-6">
              <motion.button
                onClick={onAccept}
                className="btn btn-primary gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiCheck className="w-5 h-5" />
                I Understand & Accept
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
