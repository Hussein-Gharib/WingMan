'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WhatsAppIcon } from './icons.jsx';

const LINKS = [
  ['#menu', 'Menu'],
  ['#offers', 'Offers'],
  ['#contact', 'Contact'],
];

export default function Nav({ waUrl }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <motion.header
        className={`nav ${scrolled ? 'nav--solid' : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container nav__inner">
          <a className="nav__brand" href="#home" aria-label="WingMan home">
            <img src="/images/brand/wingman-logo.png" alt="WingMan" />
            <span>WingMan</span>
          </a>

          <nav className="nav__links">
            {LINKS.map(([href, label]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </nav>

          <div className="nav__right">
            {waUrl && (
              <a className="btn btn--gold btn--sm nav__cta" href={waUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={17} /> Order
              </a>
            )}
            <button
              className={`burger ${open ? 'is-open' : ''}`}
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <motion.nav
              className="mobile-menu__links"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } } }}
            >
              {LINKS.map(([href, label]) => (
                <motion.a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                >
                  {label}
                </motion.a>
              ))}
              {waUrl && (
                <motion.a
                  className="btn btn--gold mobile-menu__cta"
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                >
                  <WhatsAppIcon size={20} /> Order on WhatsApp
                </motion.a>
              )}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
