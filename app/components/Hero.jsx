'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { WhatsAppIcon } from './icons.jsx';

const parent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
};
const child = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero({ waUrl }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Subtle parallax on the background image.
  const bgY = useTransform(scrollY, [0, 600], [0, 140]);
  const bgScale = useTransform(scrollY, [0, 600], [1, 1.12]);

  return (
    <section className="hero" id="home">
      <motion.div
        className="hero__bg"
        style={reduce ? undefined : { y: bgY, scale: bgScale }}
        aria-hidden="true"
      >
        <img src="/images/menu/12-pcs-wings.jpeg" alt="" />
      </motion.div>
      <div className="hero__overlay" aria-hidden="true" />
      <div className="hero__glow" aria-hidden="true" />

      <motion.div
        className="container hero__inner"
        variants={parent}
        initial={reduce ? false : 'hidden'}
        animate="show"
      >
        <motion.img
          className="hero__logo"
          src="/images/brand/wingman-logo.png"
          alt="WingMan"
          variants={child}
        />
        <motion.p className="hero__eyebrow" variants={child}>Premium Wings · Crafted Flavor</motion.p>
        <motion.h1 className="hero__title" variants={child}>
          Wings done <span className="text-gold">right.</span>
        </motion.h1>
        <motion.p className="hero__tagline" variants={child}>
          Crispy, bold and freshly made. Premium chicken wings and boneless thighs,
          delivered hot to your door.
        </motion.p>
        <motion.div className="hero__actions" variants={child}>
          <a className="btn btn--gold" href="#menu">View menu</a>
          {waUrl && (
            <a className="btn btn--whatsapp" href={waUrl} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> Order on WhatsApp
            </a>
          )}
        </motion.div>
      </motion.div>

      <motion.a
        className="hero__scroll"
        href="#offers"
        aria-label="Scroll down"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <span className="hero__scroll-dot" />
      </motion.a>
    </section>
  );
}
