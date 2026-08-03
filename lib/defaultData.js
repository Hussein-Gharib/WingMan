// Canonical WingMan data.
// Used to seed Neon (database/seed.mjs) and as an offline fallback when
// DATABASE_URL is not configured (e.g. local preview or first build).
//
// Prices: price_lbp is in Lebanese pounds (L.L); price_usd is in US dollars.
// Both are optional per item — the original WingMan menu was priced in L.L, so
// price_usd is left null here and can be filled from the admin dashboard.
// Categories and products come from the existing project only — nothing new is
// invented.

export const defaultCategories = [
  { id: 1, name: 'Wings', sort_order: 1 },
  { id: 2, name: 'Boneless', sort_order: 2 },
  { id: 3, name: 'Combos', sort_order: 3 },
  { id: 4, name: 'Sides', sort_order: 4 },
  { id: 5, name: 'Drinks', sort_order: 5 },
];

export const defaultMenu = [
  { id: 1, name: '12 PCS Wings', description: '1 Pickles + 2 Toum + 1 Coleslaw', price_usd: null, price_lbp: 600, category_id: 1, image_url: '/images/menu/12-pcs-wings.jpeg', available: true, sort_order: 1 },
  { id: 2, name: '6 PCS Wings', description: '1 Pickles + 1 Toum + 1 Coleslaw', price_usd: null, price_lbp: 350, category_id: 1, image_url: '/images/menu/6-pcs-wings.jpeg', available: true, sort_order: 2 },
  { id: 3, name: '3 PCS Boneless Chicken Thighs', description: '2 Toum + 1 Pickles + 1 Coleslaw', price_usd: null, price_lbp: 800, category_id: 2, image_url: '/images/menu/3-pcs-boneless-chicken-thighs.jpeg', available: true, sort_order: 3 },
  { id: 4, name: '6 PCS Boneless Chicken Thighs', description: '3 Toum + 1 Pickles + 1 Coleslaw', price_usd: null, price_lbp: 1200, category_id: 2, image_url: '/images/menu/6-pcs-boneless-chicken-thighs.jpeg', available: true, sort_order: 4 },
  { id: 5, name: 'Fries Box', description: '250g', price_usd: null, price_lbp: 250, category_id: 4, image_url: '/images/menu/fries-box.jpeg', available: true, sort_order: 5 },
  { id: 6, name: 'Kinza', description: '250ml', price_usd: null, price_lbp: 50, category_id: 5, image_url: '', available: true, sort_order: 6 },
  { id: 7, name: 'Garlic Cup', description: '40g', price_usd: null, price_lbp: 30, category_id: 4, image_url: '/images/menu/garlic-cup.jpeg', available: true, sort_order: 7 },
  { id: 8, name: 'Coleslaw', description: '70g', price_usd: null, price_lbp: 40, category_id: 4, image_url: '/images/menu/coleslaw.jpeg', available: true, sort_order: 8 },
  { id: 9, name: 'Pickles Cup', description: '1 cup', price_usd: null, price_lbp: 30, category_id: 4, image_url: '/images/menu/pickles-cup.jpeg', available: true, sort_order: 9 },
  { id: 10, name: 'Combo', description: 'Fries + Kinza', price_usd: null, price_lbp: 150, category_id: 3, image_url: '', available: true, sort_order: 10 },
];

export const defaultOffers = [
  { id: 1, name: 'Weekly Special', image_url: '/images/offers/sample-offer.jpeg', price_usd: null, price_lbp: null, active: true, sort_order: 1 },
];

export const defaultSettings = {
  whatsapp_number: '',
  whatsapp_message: 'Hi WingMan! I would like to place an order.',
  phone_number: '',
  instagram_url: '',
  working_hours: '',
  delivery_areas: '',
};

// Attach category_name to a list of items using the provided categories.
// Used by the offline fallback so items render with their category label.
export function withCategoryNames(items, categories) {
  const byId = new Map(categories.map((c) => [c.id, c.name]));
  return items.map((it) => ({ ...it, category_name: byId.get(it.category_id) || null }));
}
