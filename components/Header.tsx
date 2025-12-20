'use client';

import { motion } from 'framer-motion';
import { FiYoutube, FiGithub } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-50 border-b border-base-200 shadow-sm min-h-[56px] sm:min-h-[64px]"
    >
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex-1">
          <motion.a
            href="/"
            className="flex items-center gap-2 text-lg sm:text-xl font-bold text-primary py-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiYoutube className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="hidden xs:inline text-sm sm:text-base">YT Downloader</span>
          </motion.a>
        </div>
        
        <div className="flex-none gap-1 sm:gap-2">
          <motion.a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-circle min-w-[44px] min-h-[44px] sm:btn-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="GitHub repository"
          >
            <FiGithub className="w-5 h-5" />
          </motion.a>
          
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
