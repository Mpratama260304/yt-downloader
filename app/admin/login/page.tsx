'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiLock, FiUser, FiLogIn, FiYoutube } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Welcome back!', { icon: '👋' });
        const redirect = searchParams.get('redirect') || '/admin';
        router.push(redirect);
        router.refresh();
      } else {
        toast.error(data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-control">
        <label className="label py-1 sm:py-2">
          <span className="label-text font-medium text-sm sm:text-base">Username</span>
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <FiUser className="w-5 h-5 text-base-content/40" />
          </span>
          <input
            type="text"
            placeholder="Enter username"
            className="input input-bordered w-full pl-10 h-11 sm:h-12 text-sm sm:text-base"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            required
            autoComplete="username"
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label py-1 sm:py-2">
          <span className="label-text font-medium text-sm sm:text-base">Password</span>
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <FiLock className="w-5 h-5 text-base-content/40" />
          </span>
          <input
            type="password"
            placeholder="Enter password"
            className="input input-bordered w-full pl-10 h-11 sm:h-12 text-sm sm:text-base"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary w-full mt-6 min-h-[52px] text-base"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="loading loading-spinner"></span>
        ) : (
          <>
            <FiLogIn className="w-5 h-5" />
            Sign In
          </>
        )}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <ThemeProvider>
      <div className="min-h-[100dvh] flex items-center justify-center bg-base-200 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="card bg-base-100 shadow-2xl">
            <div className="card-body p-5 sm:p-8">
              {/* Logo */}
              <div className="text-center mb-4 sm:mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-3 sm:mb-4"
                >
                  <FiYoutube className="w-7 h-7 sm:w-8 sm:h-8 text-primary-content" />
                </motion.div>
                <h1 className="text-xl sm:text-2xl font-bold">Admin Login</h1>
                <p className="text-sm sm:text-base text-base-content/60 mt-1">
                  YouTube Downloader Admin Panel
                </p>
              </div>

              {/* Form wrapped in Suspense */}
              <Suspense fallback={
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              }>
                <LoginForm />
              </Suspense>

              {/* Info */}
              <div className="divider text-xs text-base-content/40">DEFAULT CREDENTIALS</div>
              <div className="text-center text-sm text-base-content/60">
                <p>Username: <code className="bg-base-200 px-2 py-0.5 rounded">admin</code></p>
                <p>Password: <code className="bg-base-200 px-2 py-0.5 rounded">admin123</code></p>
              </div>
            </div>
          </div>

          {/* Back to site link */}
          <div className="text-center mt-4">
            <a href="/" className="text-sm text-base-content/60 hover:text-primary transition-colors">
              ← Back to YouTube Downloader
            </a>
          </div>
        </motion.div>
      </div>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
