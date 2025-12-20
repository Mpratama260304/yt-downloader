'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="btn btn-ghost btn-circle min-w-[44px] min-h-[44px] sm:btn-sm">
        <div className="w-5 h-5 animate-pulse bg-base-300 rounded-full" />
      </div>
    );
  }

  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <FiMonitor className="w-5 h-5" />;
    }
    if (resolvedTheme === 'dark') {
      return <FiMoon className="w-5 h-5" />;
    }
    return <FiSun className="w-5 h-5" />;
  };

  const getTooltip = () => {
    if (theme === 'system') return 'System theme';
    if (theme === 'light') return 'Light theme';
    return 'Dark theme';
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={cycleTheme}
      className="btn btn-ghost btn-circle min-w-[44px] min-h-[44px] sm:btn-sm tooltip tooltip-bottom"
      data-tip={getTooltip()}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          {getIcon()}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
