'use client';

import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-[100dvh] bg-base-100">
        <AdminSidebar />
        {/* Main content area - offset for mobile header, full width on mobile */}
        <main className="flex-1 w-full lg:w-auto pt-14 lg:pt-0 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-[calc(100dvh-56px)] lg:min-h-screen p-3 sm:p-4 md:p-6 lg:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toaster
        position="top-center"
        containerStyle={{
          top: 70, // Account for mobile header
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--b2))',
            color: 'hsl(var(--bc))',
            border: '1px solid hsl(var(--b3))',
            maxWidth: '90vw',
          },
        }}
      />
    </ThemeProvider>
  );
}
