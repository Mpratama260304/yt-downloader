'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiSettings,
  FiUser,
  FiClock,
  FiLogOut,
  FiMenu,
  FiX,
  FiYoutube,
} from 'react-icons/fi';
import clsx from 'clsx';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: typeof FiHome;
}

// v5.0: Removed Cookies Importer and Cookies Manager
// Cookies are now auto-fetched from external URL
const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: FiHome },
  { href: '/admin/settings', label: 'Settings', icon: FiSettings },
  { href: '/admin/profile', label: 'Profile', icon: FiUser },
  { href: '/admin/history', label: 'History', icon: FiClock },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        onClick={() => setIsMobileMenuOpen(false)}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-content shadow-md'
            : 'hover:bg-base-200 text-base-content/70 hover:text-base-content'
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium">{item.label}</span>
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
            initial={false}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu button - fixed header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-base-100/95 backdrop-blur-sm border-b border-base-200 safe-area-inset">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 min-h-[56px]">
          <Link href="/admin" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
            <FiYoutube className="w-6 h-6 text-primary flex-shrink-0" />
            <span className="font-bold text-base sm:text-lg truncate">Admin Panel</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="btn btn-ghost btn-sm btn-square min-h-[44px] min-w-[44px]"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - drawer on mobile, fixed on desktop */}
      <motion.aside
        initial={false}
        animate={{ 
          x: isMobileMenuOpen ? 0 : '-100%',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={clsx(
          'fixed lg:static lg:translate-x-0 z-50 lg:z-auto',
          'w-[280px] sm:w-72 h-[100dvh] lg:h-screen bg-base-100 border-r border-base-200',
          'flex flex-col shadow-2xl lg:shadow-none',
          'lg:!transform-none' // Override motion on desktop
        )}
        style={{ 
          transform: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'none' : undefined 
        }}
      >
        {/* Logo - hidden on mobile (shown in header), visible on desktop */}
        <div className="hidden lg:block p-6 border-b border-base-200">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
              <FiYoutube className="w-6 h-6 text-primary-content" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Panel</h1>
              <p className="text-xs text-base-content/60">YouTube Downloader</p>
            </div>
          </Link>
        </div>

        {/* Mobile header spacer */}
        <div className="lg:hidden h-14" />

        {/* Navigation - touch-friendly */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Footer - touch-friendly buttons */}
        <div className="p-3 sm:p-4 border-t border-base-200 space-y-2 safe-area-inset">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-base-200 active:bg-base-300 text-base-content/70 hover:text-base-content transition-colors min-h-[48px]"
          >
            <FiYoutube className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">View Site</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-error/10 active:bg-error/20 text-error transition-colors min-h-[48px]"
          >
            <FiLogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
