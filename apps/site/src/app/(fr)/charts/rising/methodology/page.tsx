import { ChartsMethodology } from '@/components/charts-methodology';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'SANDBOX CHARTS · Méthode Rising 20',
  description: 'La méthode pour repérer les projets IA en accélération sur GitHub.',
  path: '/charts/rising/methodology',
});
export default function Page() {
  return <ChartsMethodology rising />;
}
