'use client';

import { motion } from 'framer-motion';
import { FiAlertTriangle } from 'react-icons/fi';

export default function Disclaimer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="alert alert-warning shadow-lg"
    >
      <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
      <div>
        <h4 className="font-bold">Disclaimer</h4>
        <p className="text-sm">
          This tool is for personal use only. Respect copyright laws and YouTube&apos;s Terms of Service. 
          Only download content you have permission to download.
        </p>
      </div>
    </motion.div>
  );
}
