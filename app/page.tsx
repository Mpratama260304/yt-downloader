'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  FiDownload, 
  FiVideo, 
  FiMusic, 
  FiList, 
  FiShield, 
  FiZap,
  FiGlobe,
  FiArrowDown
} from 'react-icons/fi';
import UrlForm from '@/components/UrlForm';
import VideoInfoCard from '@/components/VideoInfo';
import FormatSelector from '@/components/FormatSelector';
import DownloadButton from '@/components/DownloadButton';
import PlaylistView from '@/components/PlaylistView';
import LoadingSpinner from '@/components/LoadingSpinner';
import { VideoInfo, VideoFormat } from '@/lib/types';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const features = [
  {
    icon: FiVideo,
    title: 'HD Videos',
    description: 'Download up to 4K/8K quality',
    color: 'text-primary',
  },
  {
    icon: FiMusic,
    title: 'Audio Only',
    description: 'Extract MP3 & M4A audio',
    color: 'text-secondary',
  },
  {
    icon: FiList,
    title: 'Playlists',
    description: 'Download entire playlists',
    color: 'text-accent',
  },
  {
    icon: FiShield,
    title: 'Bot Bypass',
    description: '2025 anti-detection fixes',
    color: 'text-success',
  },
  {
    icon: FiZap,
    title: 'Direct Links',
    description: 'No server bandwidth used',
    color: 'text-warning',
  },
  {
    icon: FiGlobe,
    title: 'Geo Bypass',
    description: 'Access blocked content',
    color: 'text-info',
  },
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');

  const handleFetchInfo = async (url: string) => {
    setIsLoading(true);
    setVideoInfo(null);
    setSelectedFormat(null);
    setCurrentUrl(url);
    setLoadingProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch('/api/fetch-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.isBotDetection) {
          toast.error(
            'YouTube detected bot activity. Admin may need to update cookies.',
            { duration: 8000, icon: '🤖' }
          );
        }
        throw new Error(data.error || 'Failed to fetch video information');
      }

      setLoadingProgress(100);
      setVideoInfo(data.data);

      if (data.data.isPlaylist) {
        toast.success(`Playlist loaded: ${data.data.playlistCount} videos`, {
          icon: '📋',
        });
      } else {
        toast.success('Video information loaded!', { icon: '✅' });
        if (data.data.formats.length > 0) {
          setSelectedFormat(data.data.formats[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching video info:', error);
      toast.error(error.message || 'Failed to fetch video information');
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handlePlaylistVideoSelect = (url: string) => {
    handleFetchInfo(url);
  };

  const handleReset = () => {
    setVideoInfo(null);
    setSelectedFormat(null);
    setCurrentUrl('');
  };

  const scrollToMain = () => {
    document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient min-h-[50vh] sm:min-h-[60vh] flex items-center justify-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-60 sm:w-80 h-60 sm:h-80 bg-primary/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-60 sm:w-80 h-60 sm:h-80 bg-secondary/10 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-16 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto"
          >
            {/* Logo & Title */}
            <motion.div variants={itemVariants} className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <YouTubeLogo className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16" />
                </motion.div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
                  <span className="text-gradient">YouTube</span>
                  <span className="text-base-content"> Downloader</span>
                </h1>
              </div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-sm sm:text-lg md:text-xl text-base-content/70 mb-4 max-w-2xl mx-auto px-2"
            >
              Download videos and audio from YouTube using yt-dlp with 
              <span className="text-success font-semibold"> 2025 bot detection fixes</span>
            </motion.p>

            {/* Status badge */}
            <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
              <div className="badge badge-success badge-md sm:badge-lg gap-2 p-3 sm:p-4">
                <span className="loading loading-ring loading-xs"></span>
                Updated & Working
              </div>
            </motion.div>

            {/* Feature grid - responsive */}
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-6 sm:mb-10 px-2"
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  className="feature-card p-2 sm:p-4"
                >
                  <feature.icon className={`w-5 h-5 sm:w-8 sm:h-8 ${feature.color} mx-auto mb-1 sm:mb-2`} />
                  <h3 className="font-semibold text-xs sm:text-sm">{feature.title}</h3>
                  <p className="text-[10px] sm:text-xs text-base-content/60 hidden sm:block">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Scroll indicator */}
            <motion.button
              variants={itemVariants}
              onClick={scrollToMain}
              className="btn btn-ghost btn-circle animate-bounce"
              aria-label="Scroll to content"
            >
              <FiArrowDown className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Main Content - v5.4.0: Added overflow-hidden to prevent layout issues on mobile */}
      <section id="main-content" className="py-8 sm:py-12 px-3 sm:px-4 overflow-hidden">
        <div className="container mx-auto max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-4 sm:space-y-6 w-full max-w-full"
          >
            {/* URL Form */}
            <div className="card glass-card">
              <div className="card-body p-4 sm:p-6">
                <UrlForm onSubmit={handleFetchInfo} isLoading={isLoading} />
              </div>
            </div>

            {/* Loading state */}
            <AnimatePresence mode="wait">
              {isLoading && (
                <LoadingSpinner progress={loadingProgress} />
              )}
            </AnimatePresence>

            {/* Video Info */}
            <AnimatePresence mode="wait">
              {videoInfo && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  {/* Back button for playlist navigation */}
                  {videoInfo.isPlaylist && currentUrl !== videoInfo.playlistVideos?.[0]?.url && (
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={handleReset}
                      className="btn btn-ghost btn-sm sm:btn-md gap-2"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to playlist
                    </motion.button>
                  )}

                  {/* Video card */}
                  <VideoInfoCard videoInfo={videoInfo} />

                  {/* Playlist videos */}
                  {videoInfo.isPlaylist && videoInfo.playlistVideos && (
                    <PlaylistView
                      videos={videoInfo.playlistVideos}
                      onSelectVideo={handlePlaylistVideoSelect}
                    />
                  )}

                  {/* Format selector (only for single videos) */}
                  {!videoInfo.isPlaylist && videoInfo.formats.length > 0 && (
                    <>
                      <FormatSelector
                        formats={videoInfo.formats}
                        onSelect={setSelectedFormat}
                        selectedFormat={selectedFormat}
                      />

                      {/* Download button */}
                      <DownloadButton
                        videoUrl={currentUrl}
                        format={selectedFormat}
                        videoTitle={videoInfo.title}
                      />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            <AnimatePresence>
              {!videoInfo && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8 sm:py-16"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="inline-flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 bg-base-200 rounded-full mb-4 sm:mb-6"
                  >
                    <FiDownload className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                  </motion.div>
                  <h2 className="text-xl sm:text-2xl font-bold text-base-content mb-2 sm:mb-3">
                    Ready to download
                  </h2>
                  <p className="text-sm sm:text-base text-base-content/60 max-w-md mx-auto px-4">
                    Paste a YouTube video or playlist URL above to get started.
                    We&apos;ll fetch the available formats and let you choose the best quality.
                  </p>

                  {/* Tips */}
                  <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-base-content/50">
                    <span className="flex items-center gap-2 justify-center">
                      <span className="badge badge-ghost badge-xs sm:badge-sm">Tip</span>
                      Supports YouTube Music too
                    </span>
                    <span className="flex items-center gap-2 justify-center">
                      <span className="badge badge-ghost badge-xs sm:badge-sm">Tip</span>
                      Works with Shorts and playlists
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

// YouTube Logo SVG Component
function YouTubeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <defs>
        <linearGradient id="youtube-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF0000" />
          <stop offset="100%" stopColor="#CC0000" />
        </linearGradient>
      </defs>
      <path
        fill="url(#youtube-gradient)"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    </svg>
  );
}
