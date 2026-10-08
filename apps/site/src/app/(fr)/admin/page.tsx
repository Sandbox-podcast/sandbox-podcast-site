import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Backoffice éditorial',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
