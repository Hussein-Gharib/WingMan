import './admin.css';

export const metadata = {
  title: 'WingMan Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <div className="admin-wrap">{children}</div>;
}
