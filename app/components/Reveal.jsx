'use client';

import { motion, useReducedMotion } from 'framer-motion';

// Scroll-triggered entrance. Animates once when it enters the viewport.
// Honors prefers-reduced-motion (renders instantly, no transform).
export default function Reveal({
  children,
  as = 'div',
  delay = 0,
  y = 28,
  className = '',
  ...rest
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  return (
    <MotionTag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

// Container + item variants for staggered reveals (used by the hero and grids).
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
