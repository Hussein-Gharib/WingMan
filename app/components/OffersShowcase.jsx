'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { formatUSD, formatLBP } from '@/lib/currency';
import { WhatsAppIcon } from './icons.jsx';

function PricePills({ offer, size }) {
  const usd = formatUSD(offer.price_usd);
  const lbp = formatLBP(offer.price_lbp);
  if (!usd && !lbp) return null;
  return (
    <div className={`price-pills ${size === 'lg' ? 'price-pills--lg' : ''}`}>
      {usd && <span className="price-pill price-pill--usd">{usd}</span>}
      {lbp && <span className="price-pill price-pill--lbp">{lbp}</span>}
    </div>
  );
}

export default function OffersShowcase({ offers, waUrl }) {
  const reduce = useReducedMotion();
  if (!offers || offers.length === 0) return null;

  const [featured, ...rest] = offers;
  const maskReveal = reduce
    ? {}
    : { initial: { clipPath: 'inset(0 0 100% 0)' }, whileInView: { clipPath: 'inset(0 0 0% 0)' } };

  return (
    <div className="offers">
      {/* Featured — full-width cinematic banner */}
      <motion.article
        className="offer-hero"
        initial={reduce ? false : { opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="offer-hero__media"
          {...maskReveal}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={featured.image_url} alt={featured.name || 'WingMan offer'} />
        </motion.div>
        <div className="offer-hero__body">
          <span className="badge-gold">Featured Offer</span>
          {featured.name && <h3 className="offer-hero__title">{featured.name}</h3>}
          <PricePills offer={featured} size="lg" />
          {waUrl && (
            <a className="btn btn--whatsapp btn--sm offer-hero__cta" href={waUrl} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={18} /> Order this
            </a>
          )}
        </div>
      </motion.article>

      {/* Remaining offers — responsive card grid */}
      {rest.length > 0 && (
        <motion.div
          className="offer-grid-pub"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {rest.map((o) => (
            <motion.article
              className="offer-card-pub"
              key={o.id}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
            >
              <div className="offer-card-pub__media">
                <img src={o.image_url} alt={o.name || 'WingMan offer'} loading="lazy" />
                <span className="badge-gold badge-gold--corner">Offer</span>
              </div>
              <div className="offer-card-pub__body">
                {o.name && <h4>{o.name}</h4>}
                <PricePills offer={o} />
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}
    </div>
  );
}
