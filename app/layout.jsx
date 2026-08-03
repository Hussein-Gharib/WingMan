import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'WingMan — Premium Wings',
  description:
    'WingMan: premium chicken wings and boneless thighs with crafted flavor. Browse the menu and order via WhatsApp.',
  openGraph: {
    title: 'WingMan — Premium Wings',
    description: 'Premium chicken wings and boneless thighs with crafted flavor.',
    images: ['/images/brand/wingman-logo.jpeg'],
  },
};

export const viewport = {
  themeColor: '#0f0f10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
