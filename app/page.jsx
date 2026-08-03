import { getMenu, getOffers, getSettings, getCategories } from '@/lib/queries';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Reveal from './components/Reveal.jsx';
import OffersShowcase from './components/OffersShowcase.jsx';
import MenuExplorer from './components/MenuExplorer.jsx';
import WhatsAppFab from './components/WhatsAppFab.jsx';
import {
  WhatsAppIcon,
  PhoneIcon,
  InstagramIcon,
  ClockIcon,
  PinIcon,
} from './components/icons.jsx';

// Read live data on every request (menu/offers/settings change from admin).
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [menu, offers, settings, categories] = await Promise.all([
    getMenu({ onlyAvailable: true }),
    getOffers({ onlyActive: true }),
    getSettings(),
    getCategories(),
  ]);

  const waUrl = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_message);
  const phoneHref = settings.phone_number ? `tel:${settings.phone_number.replace(/[^\d+]/g, '')}` : '';

  return (
    <>
      <Nav waUrl={waUrl} />

      <main>
        <Hero waUrl={waUrl} />

        {/* ---------------- Offers ---------------- */}
        {offers.length > 0 && (
          <section className="section section--offers" id="offers">
            <div className="container">
              <Reveal className="section-head">
                <span className="eyebrow">Limited time</span>
                <h2 className="section-title">Featured <span className="text-gold">Offers</span></h2>
                <p className="section-sub">Hand-picked deals — crafted to share, priced to move.</p>
              </Reveal>
              <OffersShowcase offers={offers} waUrl={waUrl} />
            </div>
          </section>
        )}

        {/* ---------------- Menu ---------------- */}
        <section className="section" id="menu">
          <div className="container">
            <Reveal className="section-head">
              <span className="eyebrow">The lineup</span>
              <h2 className="section-title">Our <span className="text-gold">Menu</span></h2>
              <p className="section-sub">Wings, boneless thighs, sides and more — pick a category.</p>
            </Reveal>
            <MenuExplorer categories={categories} items={menu} />
          </div>
        </section>

        {/* ---------------- Contact ---------------- */}
        <section className="section section--contact" id="contact">
          <div className="container">
            <Reveal className="section-head section-head--center">
              <span className="eyebrow">Say hello</span>
              <h2 className="section-title">Contact &amp; <span className="text-gold">Delivery</span></h2>
              <p className="section-sub">Order or reach out — we deliver to your area.</p>
            </Reveal>

            <div className="info-grid">
              <Reveal className="info-card" delay={0}>
                <div className="info-card__ic"><WhatsAppIcon size={22} /></div>
                <h3>Get in touch</h3>
                <p>Message us on WhatsApp or call to place your order.</p>
                <div className="info-card__actions">
                  {waUrl && (
                    <a className="btn btn--whatsapp btn--sm" href={waUrl} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon size={18} /> WhatsApp
                    </a>
                  )}
                  {phoneHref && (
                    <a className="btn btn--gold btn--sm" href={phoneHref}>
                      <PhoneIcon /> Call
                    </a>
                  )}
                </div>
                {settings.instagram_url && (
                  <a className="social-btn" href={settings.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <InstagramIcon size={20} />
                  </a>
                )}
              </Reveal>

              <Reveal className="info-card" delay={0.08}>
                <div className="info-card__ic"><ClockIcon size={22} /></div>
                <h3>Working hours</h3>
                <p>{settings.working_hours || 'Contact us for our current hours.'}</p>
              </Reveal>

              <Reveal className="info-card" delay={0.16}>
                <div className="info-card__ic"><PinIcon size={22} /></div>
                <h3>Delivery areas</h3>
                <p>{settings.delivery_areas || 'Ask us about delivery to your location.'}</p>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer__brand">
            <img src="/images/brand/wingman-logo.png" alt="WingMan" />
            <span>WingMan</span>
          </div>
          <p>© {new Date().getFullYear()} WingMan · Premium Wings · Crafted Flavor</p>
        </div>
      </footer>

      <WhatsAppFab href={waUrl} />
    </>
  );
}
