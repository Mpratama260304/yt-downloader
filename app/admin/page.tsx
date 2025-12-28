'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FiDownload,
  FiClock,
  FiCheck,
  FiX,
  FiTrendingUp,
  FiSettings,
  FiZap,
  FiRefreshCw,
} from 'react-icons/fi';

interface DashboardStats {
  autoCookies: {
    enabled: boolean;
    url: string;
    lastFetch: string | null;
    lastFetchSuccess: boolean;
    totalFetches: number;
    successfulFetches: number;
    failedFetches: number;
    fallbackUses: number;
  };
  history: {
    total: number;
    success: number;
    failed: number;
  };
  settings: {
    siteName: string;
    siteDescription: string;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        setEditUrl(data.data.autoCookies.url || '');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUrl = () => {
    setEditUrl(stats?.autoCookies.url || '');
    setIsEditingUrl(true);
  };

  const handleCancelEdit = () => {
    setIsEditingUrl(false);
    setEditUrl('');
  };

  const handleSaveUrl = async () => {
    if (!editUrl.trim()) {
      alert('URL cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookiesUrl: editUrl.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setStats((prev) => prev ? { ...prev, autoCookies: { ...prev.autoCookies, url: editUrl.trim() } } : null);
        setIsEditingUrl(false);
        alert('Cookies URL updated successfully');
      } else {
        alert('Failed to update URL: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save URL:', error);
      alert('Failed to save URL');
    } finally {
      setIsSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-base-content/60">Welcome to the admin panel</p>
        </div>
        <Link href="/" className="btn btn-outline btn-sm">
          <FiDownload className="w-4 h-4" />
          View Site
        </Link>
      </div>

      {/* Auto Cookies Status Card */}
      <motion.div variants={itemVariants}>
        <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-lg border border-primary/20">
          <div className="card-body p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <FiZap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Auto-Cookies System</h2>
                <p className="text-sm text-base-content/60">v5.0 - Real-time cookie sync</p>
              </div>
              <div className="ml-auto">
                {stats?.autoCookies.enabled ? (
                  <span className="badge badge-success gap-1">
                    <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                    Active
                  </span>
                ) : (
                  <span className="badge badge-error gap-1">Disabled</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-base-200/50 rounded-lg p-3">
                <p className="text-xs text-base-content/60">Total Fetches</p>
                <p className="text-xl font-bold">{stats?.autoCookies.totalFetches || 0}</p>
              </div>
              <div className="bg-base-200/50 rounded-lg p-3">
                <p className="text-xs text-base-content/60">Successful</p>
                <p className="text-xl font-bold text-success">{stats?.autoCookies.successfulFetches || 0}</p>
              </div>
              <div className="bg-base-200/50 rounded-lg p-3">
                <p className="text-xs text-base-content/60">Failed</p>
                <p className="text-xl font-bold text-error">{stats?.autoCookies.failedFetches || 0}</p>
              </div>
              <div className="bg-base-200/50 rounded-lg p-3">
                <p className="text-xs text-base-content/60">Fallback Uses</p>
                <p className="text-xl font-bold text-warning">{stats?.autoCookies.fallbackUses || 0}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-base-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs text-base-content/60">Cookies URL:</p>
                {!isEditingUrl && (
                  <button
                    onClick={handleEditUrl}
                    className="btn btn-xs btn-ghost text-primary hover:bg-primary/10"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingUrl ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="input input-bordered input-sm w-full text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveUrl}
                      disabled={isSaving}
                      className="btn btn-success btn-sm flex-1"
                    >
                      {isSaving ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        'Save'
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="btn btn-ghost btn-sm flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-mono bg-base-200/50 rounded px-2 py-1 mt-1 break-all">
                  {stats?.autoCookies.url || 'Not configured'}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Downloads */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base-content/60 text-xs sm:text-sm">Total Fetches</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.history.total || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base-content/60 text-xs sm:text-sm">Success Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-success">
                  {stats?.history.total 
                    ? Math.round((stats.history.success / stats.history.total) * 100) 
                    : 100}%
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiCheck className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Auto Cookies Status */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base-content/60 text-xs sm:text-sm">Cookies Status</p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <p className="text-lg sm:text-xl font-bold text-success">Auto</p>
                  <FiRefreshCw className="w-4 h-4 text-success animate-spin-slow" />
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiZap className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              </div>
            </div>
            <div className="text-xs text-base-content/60 mt-1">
              Refreshes every 30s
            </div>
          </div>
        </div>

        {/* Failed Requests */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base-content/60 text-xs sm:text-sm">Failed Requests</p>
                <p className="text-2xl sm:text-3xl font-bold text-error">{stats?.history.failed || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-error/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiX className="w-5 h-5 sm:w-6 sm:h-6 text-error" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link href="/admin/settings" className="card bg-base-200 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer">
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiSettings className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base">Site Settings</h3>
                  <p className="text-xs sm:text-sm text-base-content/60 truncate">Update name, logo & SEO</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/history" className="card bg-base-200 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer">
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base">Download History</h3>
                  <p className="text-xs sm:text-sm text-base-content/60 truncate">View all download logs</p>
                </div>
              </div>
            </div>
          </Link>

          <a href="/" target="_blank" className="card bg-base-200 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer">
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiDownload className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base">Test Download</h3>
                  <p className="text-xs sm:text-sm text-base-content/60 truncate">Try downloading a video</p>
                </div>
              </div>
            </div>
          </a>
        </div>
      </motion.div>

      {/* Site Info */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Site Information</h2>
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-base-content/60">Site Name</p>
                <p className="font-medium text-sm sm:text-base">{stats?.settings.siteName || 'YouTube Downloader'}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-base-content/60">Description</p>
                <p className="font-medium text-sm sm:text-base truncate">{stats?.settings.siteDescription || 'Download videos with yt-dlp'}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
