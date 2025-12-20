'use client';

import { motion } from 'framer-motion';
import { FiHeart, FiGithub, FiExternalLink, FiAlertTriangle } from 'react-icons/fi';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="footer footer-center p-4 sm:p-6 bg-base-200 text-base-content border-t border-base-300"
    >
      <aside className="max-w-3xl">
        {/* Legal Disclaimer */}
        <div className="alert alert-warning shadow-sm mb-4 text-xs sm:text-sm text-left">
          <FiAlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Legal Disclaimer</p>
            <p className="opacity-80 text-[10px] sm:text-xs mt-1">
              This tool is for personal, non-commercial use only. Downloading copyrighted content without 
              permission may violate YouTube&apos;s Terms of Service and applicable copyright laws. 
              You are solely responsible for ensuring your use complies with all applicable laws and regulations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm opacity-70">
          <span>Made with</span>
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <FiHeart className="w-3 h-3 sm:w-4 sm:h-4 text-error" />
          </motion.span>
          <span>using</span>
          <a
            href="https://github.com/yt-dlp/yt-dlp"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary inline-flex items-center gap-1"
          >
            yt-dlp
            <FiExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <p className="text-[10px] sm:text-xs opacity-50 mt-2">
          © {currentYear} YouTube Downloader. For personal use only.
        </p>
        
        <div className="flex gap-4 mt-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-xs gap-1"
          >
            <FiGithub className="w-4 h-4" />
            GitHub
          </a>
        </div>
      </aside>
    </motion.footer>
  );
}
