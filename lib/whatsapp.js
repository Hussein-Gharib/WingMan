// Build a wa.me deep link that opens WhatsApp chat with the business number.
// The number is stored in international format WITHOUT spaces or a leading "+",
// but we defensively strip any stray non-digits here too.
export function buildWhatsAppUrl(number, message) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  const base = `https://wa.me/${digits}`;
  const text = String(message || '').trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
