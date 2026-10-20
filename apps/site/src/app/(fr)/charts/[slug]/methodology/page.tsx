import { notFound } from 'next/navigation';
import { PublishedMethodology } from '@/components/published-methodology';
import { chartIdForSlug } from '@/domain/chart-seo';
import { chartMethodPath } from '@/domain/chart-publication';
import { editionIdSchema } from '@/domain/schema';
import { CHART_LABELS } from '@/domain/sandbox-charts';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

async function methodEdition(searchParams: Props['searchParams']) {
  const raw = (await searchParams)?.['edition'];
  if (raw === undefined) return undefined;
  const parsed = editionIdSchema.safeParse(raw);
  if (!parsed.success) notFound();
  return parsed.data;
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const chart = chartIdForSlug(slug);
  if (!chart) notFound();
  const edition = await methodEdition(searchParams);
  return pageMetadata({
    title: `Méthode ${CHART_LABELS[chart].title}${edition ? ` · ${edition}` : ''}`,
    description: 'Méthode, dates, sources et limites de la version réellement publiée.',
    path: chartMethodPath(slug, edition),
  });
}

export default async function MethodologyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const chart = chartIdForSlug(slug);
  if (!chart) notFound();
  return <PublishedMethodology chart={chart} editionId={await methodEdition(searchParams)} />;
}
