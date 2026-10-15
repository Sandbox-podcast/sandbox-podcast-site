import { OG_SIZE, OG_TYPE, demoCard, entityCard } from '@/lib/og';
import { allEntities, currentRanks, getEntity } from '@/lib/repository';
import { isDemoEntity } from '@/lib/demo-content';

export const alt = 'Fiche du classement';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return allEntities()
    .filter((e) => e.kind === 'model')
    .map((e) => ({ slug: e.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entity = getEntity(slug);
  if (isDemoEntity(slug)) return demoCard(entity.name);
  const ranks = currentRanks(slug).map((r) => ({ chart: r.chart.short, rank: r.rank }));
  return entityCard(entity, ranks);
}
