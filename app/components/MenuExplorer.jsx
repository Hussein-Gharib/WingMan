'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { formatUSD, formatLBP } from '@/lib/currency';

const UNCATEGORIZED = { id: '__none__', name: 'Other' };

function PriceRow({ item }) {
  const usd = formatUSD(item.price_usd);
  const lbp = formatLBP(item.price_lbp);
  if (!usd && !lbp) return null;
  return (
    <div className="price-pills">
      {usd && <span className="price-pill price-pill--usd">{usd}</span>}
      {lbp && <span className="price-pill price-pill--lbp">{lbp}</span>}
    </div>
  );
}

function Card({ item, reduce }) {
  return (
    <motion.article
      className="dish"
      layout={!reduce}
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      <div className="dish__media">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" />
        ) : (
          <div className="dish__fallback" aria-hidden="true">🍗</div>
        )}
        {item.category_name && <span className="dish__tag">{item.category_name}</span>}
      </div>
      <div className="dish__body">
        <h4>{item.name}</h4>
        {item.description && <p className="dish__desc">{item.description}</p>}
        <PriceRow item={item} />
      </div>
    </motion.article>
  );
}

export default function MenuExplorer({ categories, items }) {
  const reduce = useReducedMotion();

  const present = useMemo(() => {
    const withItems = categories.filter((c) => items.some((it) => it.category_id === c.id));
    const hasUncategorized = items.some((it) => !it.category_id);
    return hasUncategorized ? [...withItems, UNCATEGORIZED] : withItems;
  }, [categories, items]);

  const [active, setActive] = useState('all');

  const itemsFor = (catId) =>
    catId === UNCATEGORIZED.id
      ? items.filter((it) => !it.category_id)
      : items.filter((it) => it.category_id === catId);

  const showGroups = active === 'all';
  const visibleCats = showGroups ? present : present.filter((c) => String(c.id) === String(active));

  if (items.length === 0) {
    return <p className="empty-note">The menu is being updated. Please check back soon.</p>;
  }

  const grid = (
    <motion.div
      className="dish-grid"
      key={active}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
    >
      {visibleCats.map((cat) => {
        const catItems = itemsFor(cat.id);
        if (catItems.length === 0) return null;
        return catItems.map((item) => <Card key={item.id} item={item} reduce={reduce} />);
      })}
    </motion.div>
  );

  // In "All" view with multiple categories, show titled sections.
  const groupedGrid = (
    <div key="all">
      {visibleCats.map((cat, ci) => {
        const catItems = itemsFor(cat.id);
        if (catItems.length === 0) return null;
        return (
          <div className="menu-group" key={cat.id}>
            <h3 className="menu-group__title">{cat.name}</h3>
            <motion.div
              className="dish-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: ci * 0.02 } } }}
            >
              {catItems.map((item) => <Card key={item.id} item={item} reduce={reduce} />)}
            </motion.div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {present.length > 1 && (
        <div className="cat-nav-wrap">
          <div className="cat-nav" role="tablist" aria-label="Menu categories">
            <button
              className={`cat-pill ${active === 'all' ? 'is-active' : ''}`}
              onClick={() => setActive('all')}
            >
              All
            </button>
            {present.map((c) => (
              <button
                key={c.id}
                className={`cat-pill ${String(active) === String(c.id) ? 'is-active' : ''}`}
                onClick={() => setActive(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={showGroups ? 'all' : active}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? {} : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {showGroups && present.length > 1 ? groupedGrid : grid}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
