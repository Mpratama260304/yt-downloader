'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { FiPlay, FiChevronDown, FiList } from 'react-icons/fi';
import type { PlaylistVideo } from '@/lib/types';
import clsx from 'clsx';

interface PlaylistViewProps {
  videos: PlaylistVideo[];
  onSelectVideo: (url: string) => void;
}

export default function PlaylistView({ videos, onSelectVideo }: PlaylistViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const handleSelect = (video: PlaylistVideo, index: number) => {
    setSelectedIndex(index);
    onSelectVideo(video.url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-200 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-6 py-4 hover:bg-base-300/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FiList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">
            Playlist Videos
          </h3>
          <span className="badge badge-primary badge-sm">
            {videos.length} videos
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      {/* Video list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-2"
              >
                {videos.map((video, index) => (
                  <motion.div
                    key={video.id || index}
                    variants={itemVariants}
                    onClick={() => handleSelect(video, index)}
                    className={clsx(
                      'flex gap-3 p-2 rounded-lg cursor-pointer transition-all group',
                      selectedIndex === index
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'bg-base-100 hover:bg-base-100/80 hover:shadow-md'
                    )}
                  >
                    {/* Index number */}
                    <div className="flex items-center justify-center w-8 text-sm font-medium text-base-content/50">
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-28 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-base-300">
                      {video.thumbnail ? (
                        <>
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="112px"
                            unoptimized
                          />
                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                            <motion.div
                              initial={{ scale: 0 }}
                              whileHover={{ scale: 1 }}
                              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FiPlay className="w-4 h-4 text-white ml-0.5" />
                            </motion.div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiPlay className="w-6 h-6 text-base-content/30" />
                        </div>
                      )}
                      {/* Duration badge */}
                      {video.durationString && (
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                          {video.durationString}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-1">
                      <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h4>
                    </div>

                    {/* Selection indicator */}
                    {selectedIndex === index && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center"
                      >
                        <div className="badge badge-primary badge-sm gap-1">
                          <FiPlay className="w-3 h-3" />
                          Selected
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>

              {/* Load more hint */}
              {videos.length > 10 && (
                <p className="text-center text-xs text-base-content/50 mt-4">
                  Showing all {videos.length} videos • Scroll to see more
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
