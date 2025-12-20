'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { FiUser, FiEye, FiThumbsUp, FiClock, FiCalendar, FiExternalLink, FiList } from 'react-icons/fi';
import type { VideoInfo } from '@/lib/types';

interface VideoInfoCardProps {
  videoInfo: VideoInfo;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return '';
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function VideoInfoCard({ videoInfo }: VideoInfoCardProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  if (videoInfo.isPlaylist) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="card bg-base-200 shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
          <div className="flex items-center gap-2 text-primary-content">
            <FiList className="w-6 h-6" />
            <h2 className="text-xl font-bold">Playlist</h2>
            <span className="badge badge-ghost bg-white/20">
              {videoInfo.playlistCount} videos
            </span>
          </div>
        </div>
        <div className="card-body">
          <motion.h3 variants={itemVariants} className="card-title text-xl">
            {videoInfo.playlistTitle || videoInfo.title}
          </motion.h3>
          <motion.p variants={itemVariants} className="text-base-content/70">
            Channel: <span className="font-medium text-base-content">{videoInfo.channel}</span>
          </motion.p>
          <motion.p variants={itemVariants} className="text-sm text-base-content/50">
            Select a video from the list below to download
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="card bg-base-200 shadow-xl overflow-hidden"
    >
      {/* Responsive layout: Stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row">
        {/* Thumbnail - full width on mobile, 40% on desktop */}
        <figure className="relative w-full md:w-2/5 aspect-video md:aspect-auto md:min-h-[200px]">
          <Image
            src={videoInfo.thumbnail}
            alt={videoInfo.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
            unoptimized
            priority
          />
          {videoInfo.durationString && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="absolute bottom-2 right-2 badge badge-neutral gap-1 text-xs sm:text-sm"
            >
              <FiClock className="w-3 h-3" />
              {videoInfo.durationString}
            </motion.div>
          )}
        </figure>

        {/* Content - responsive padding */}
        <div className="card-body p-4 sm:p-6 md:w-3/5">
          <motion.h2
            variants={itemVariants}
            className="card-title text-base sm:text-lg md:text-xl line-clamp-2 leading-tight"
          >
            {videoInfo.title}
          </motion.h2>

          {/* Channel info */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 mt-2">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-7 sm:w-8">
                <FiUser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <a
              href={videoInfo.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary font-medium flex items-center gap-1 text-sm sm:text-base truncate"
            >
              <span className="truncate max-w-[150px] sm:max-w-none">{videoInfo.channel}</span>
              <FiExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </motion.div>

          {/* Stats - responsive grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-base-content/70"
          >
            {videoInfo.viewCount > 0 && (
              <div className="flex items-center gap-1">
                <FiEye className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{formatNumber(videoInfo.viewCount)} views</span>
              </div>
            )}
            {videoInfo.likeCount > 0 && (
              <div className="flex items-center gap-1">
                <FiThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{formatNumber(videoInfo.likeCount)} likes</span>
              </div>
            )}
            {videoInfo.uploadDate && (
              <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                <FiCalendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{formatDate(videoInfo.uploadDate)}</span>
              </div>
            )}
          </motion.div>

          {/* Description - collapsible */}
          {videoInfo.description && (
            <motion.div variants={itemVariants} className="mt-3 sm:mt-4">
              <div className="collapse collapse-arrow bg-base-100 rounded-lg">
                <input type="checkbox" />
                <div className="collapse-title text-xs sm:text-sm font-medium py-2 min-h-0">
                  Show Description
                </div>
                <div className="collapse-content">
                  <p className="text-xs sm:text-sm text-base-content/70 whitespace-pre-wrap line-clamp-6">
                    {videoInfo.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
