'use client';

import { motion } from 'framer-motion';
import { WhatsAppIcon } from './icons.jsx';

// Fixed WhatsApp button shown on every public screen.
// Renders nothing if no number is configured yet.
export default function WhatsAppFab({ href }) {
  if (!href) return null;
  return (
    <motion.a
      className="wa-fab"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with WingMan on WhatsApp"
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.05, y: -3 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="wa-fab__pulse" aria-hidden="true" />
      <WhatsAppIcon size={24} />
      <span className="wa-fab__label">WhatsApp</span>
    </motion.a>
  );
}
