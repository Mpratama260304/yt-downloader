'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiTrash2, FiCheck, FiX, FiExternalLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface HistoryEntry {
  id: number;
  url: string;
  title: string | null;
  format: string | null;
  ip: string | null;
  success: boolean;
  error: string | null;
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let filtered = history;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.url.toLowerCase().includes(searchLower) ||
        entry.title?.toLowerCase().includes(searchLower) ||
        entry.ip?.includes(search)
      );
    }

    // Apply status filter
    if (filter === 'success') {
      filtered = filtered.filter(entry => entry.success);
    } else if (filter === 'failed') {
      filtered = filtered.filter(entry => !entry.success);
    }

    setFilteredHistory(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  }, [history, search, filter]);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/admin/history');
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
        setFilteredHistory(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) return;

    try {
      const response = await fetch('/api/admin/history', {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        setHistory([]);
        setFilteredHistory([]);
        toast.success('History cleared');
      }
    } catch (error) {
      console.error('Clear error:', error);
      toast.error('Failed to clear history');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">History</h1>
          <p className="text-base-content/60">Recent video fetches and downloads</p>
        </div>
        <button
          onClick={clearHistory}
          className="btn btn-error btn-sm"
          disabled={history.length === 0}
        >
          <FiTrash2 className="w-4 h-4" />
          Clear All
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
          <input
            type="text"
            placeholder="Search by URL, title, or IP..."
            className="input input-bordered w-full pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="join">
          {(['all', 'success', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`btn join-item btn-sm ${filter === status ? 'btn-primary' : 'btn-ghost'}`}
            >
              {status === 'all' && 'All'}
              {status === 'success' && (
                <>
                  <FiCheck className="w-4 h-4" />
                  Success
                </>
              )}
              {status === 'failed' && (
                <>
                  <FiX className="w-4 h-4" />
                  Failed
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stats stats-vertical sm:stats-horizontal shadow w-full bg-base-200">
        <div className="stat">
          <div className="stat-title">Total</div>
          <div className="stat-value text-lg sm:text-2xl">{history.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Success</div>
          <div className="stat-value text-lg sm:text-2xl text-success">
            {history.filter(h => h.success).length}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Failed</div>
          <div className="stat-value text-lg sm:text-2xl text-error">
            {history.filter(h => !h.success).length}
          </div>
        </div>
      </div>

      {/* History - Responsive Layout */}
      {filteredHistory.length === 0 ? (
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body items-center text-center py-8 sm:py-12 px-4">
            <FiSearch className="w-12 h-12 sm:w-16 sm:h-16 text-base-content/20" />
            <h3 className="text-base sm:text-lg font-bold mt-3 sm:mt-4">
              {search ? 'No results found' : 'No history yet'}
            </h3>
            <p className="text-sm text-base-content/60">
              {search ? 'Try a different search term' : 'Video fetches will appear here'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: Card-based layout */}
          <div className="sm:hidden space-y-3">
            <AnimatePresence>
              {paginatedHistory.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="card bg-base-200 shadow-md"
                >
                  <div className="card-body p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">
                        {entry.success ? (
                          <span className="badge badge-success badge-sm gap-1">
                            <FiCheck className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="badge badge-error badge-sm gap-1">
                            <FiX className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {entry.title && (
                          <p className="font-medium text-sm line-clamp-2 mb-1">{entry.title}</p>
                        )}
                        <div className="flex items-center gap-1 mb-2">
                          <p className="text-xs text-base-content/60 truncate flex-1">{entry.url}</p>
                          {extractVideoId(entry.url) && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-xs btn-square flex-shrink-0"
                            >
                              <FiExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                          {entry.format && (
                            <span className="badge badge-ghost badge-xs">{entry.format}</span>
                          )}
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                        {!entry.success && entry.error && (
                          <p className="text-xs text-error mt-2 line-clamp-2">{entry.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block card bg-base-200 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-sm md:table-md">
                <thead>
                  <tr>
                    <th className="w-16">Status</th>
                    <th>URL / Title</th>
                    <th className="hidden lg:table-cell w-24">Format</th>
                    <th className="hidden md:table-cell w-28">IP</th>
                    <th className="w-36">Time</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {paginatedHistory.map((entry) => (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover"
                      >
                        <td>
                          {entry.success ? (
                            <span className="badge badge-success badge-sm gap-1">
                              <FiCheck className="w-3 h-3" />
                              OK
                            </span>
                          ) : (
                            <div className="tooltip tooltip-error" data-tip={entry.error || 'Unknown error'}>
                              <span className="badge badge-error badge-sm gap-1">
                                <FiX className="w-3 h-3" />
                                Fail
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="max-w-[200px] lg:max-w-[400px]">
                            {entry.title && (
                              <p className="font-medium text-sm truncate">{entry.title}</p>
                            )}
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-base-content/60 truncate">{entry.url}</p>
                              {extractVideoId(entry.url) && (
                                <a
                                  href={entry.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost btn-xs p-0 min-h-0 h-auto"
                                >
                                  <FiExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell">
                          <span className="badge badge-ghost badge-sm">
                            {entry.format || '-'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="text-xs text-base-content/60">
                            {entry.ip || '-'}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-base-content/60">
                            {formatDate(entry.createdAt)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination - mobile-friendly */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <div className="join">
                <button
                  className="join-item btn btn-sm min-h-[44px]"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button className="join-item btn btn-sm min-h-[44px] pointer-events-none">
                  {currentPage} / {totalPages}
                </button>
                <button
                  className="join-item btn btn-sm min-h-[44px]"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
