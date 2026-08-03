import { getMenu, getOffers, getSettings, getCategories } from '@/lib/queries';
import DashboardClient from './DashboardClient.jsx';

// Access is enforced by middleware before this page renders.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [menu, offers, settings, categories] = await Promise.all([
    getMenu(),
    getOffers(),
    getSettings(),
    getCategories(),
  ]);

  return (
    <DashboardClient
      initialMenu={menu}
      initialOffers={offers}
      initialSettings={settings}
      initialCategories={categories}
    />
  );
}
