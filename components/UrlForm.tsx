'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiLoader, FiLink, FiClipboard } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface UrlFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function UrlForm({ onSubmit, isLoading }: UrlFormProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast.success('URL pasted!');
    } catch {
      toast.error('Failed to read clipboard');
    }
  };

  const isValidUrl = (input: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
      /^(https?:\/\/)?(music\.youtube\.com)\/.+$/i,
    ];
    return patterns.some(pattern => pattern.test(input));
  };

  const showUrlHint = url.length > 0 && !isValidUrl(url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full"
    >
      <form onSubmit={handleSubmit} className="w-full">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-base font-medium">
              YouTube URL
            </span>
            {showUrlHint && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="label-text-alt text-warning text-xs"
              >
                Please enter a valid YouTube URL
              </motion.span>
            )}
          </label>
          
          {/* Mobile-first: Stack on mobile, join on desktop */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            {/* Input with icon - full width on mobile */}
            <div className="join w-full shadow-lg flex-1">
              <div className="join-item hidden sm:flex items-center px-3 sm:px-4 bg-base-200">
                <FiLink className="w-4 h-4 sm:w-5 sm:h-5 text-base-content/50" />
              </div>
              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                className="input input-bordered join-item flex-1 h-12 sm:h-auto text-base focus:outline-none focus:border-primary"
                disabled={isLoading}
                autoComplete="off"
                spellCheck="false"
                enterKeyHint="search"
              />
              {/* Paste button inside input on mobile */}
              <motion.button
                type="button"
                onClick={handlePaste}
                disabled={isLoading}
                className="btn btn-ghost join-item h-12 sm:h-auto min-w-[44px] px-2 sm:px-4"
                whileTap={{ scale: 0.95 }}
                aria-label="Paste from clipboard"
              >
                <FiClipboard className="w-5 h-5" />
                <span className="hidden md:inline ml-1">Paste</span>
              </motion.button>
            </div>
            
            {/* Submit button - full width on mobile */}
            <motion.button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="btn btn-primary h-12 sm:h-auto min-h-[48px] gap-2 w-full sm:w-auto sm:min-w-[120px] sm:join-item"
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.95 }}
            >
              {isLoading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <FiSearch className="w-5 h-5" />
                  <span>Fetch Info</span>
                </>
              )}
            </motion.button>
          </div>
          
          <label className="label pb-0">
            <span className="label-text-alt text-base-content/60 text-xs sm:text-sm">
              Supports videos, playlists, shorts, and YouTube Music
            </span>
          </label>
        </div>
      </form>
      
      {/* Quick Examples - scrollable on mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2 items-center"
      >
        <span className="text-xs text-base-content/50 mr-1">Examples:</span>
        {[
          'youtube.com/watch?v=...',
          'youtu.be/...',
          'youtube.com/playlist?list=...',
        ].map((example, i) => (
          <span
            key={i}
            className="badge badge-ghost badge-xs sm:badge-sm text-base-content/50 whitespace-nowrap"
          >
            {example}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}
