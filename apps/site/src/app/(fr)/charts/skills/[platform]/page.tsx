import { RankingCatalogRoute, rankingCatalogMetadata } from '@/components/ranking-catalog-route';
import ChartWeekPage, {
  generateMetadata as chartWeekMetadata,
} from '@/app/(fr)/charts/[slug]/[week]/page';
import { editionIdSchema } from '@/domain/schema';

export const dynamic = 'force-dynamic';
interface Props {
  params: Promise<{
    platform: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { platform } = await params;
  if (editionIdSchema.safeParse(platform).success)
    return chartWeekMetadata({
      params: Promise.resolve({ slug: 'skills', week: platform }),
      searchParams,
    });
  return rankingCatalogMetadata(`/charts/skills/${platform}`);
}
export default async function SkillsRankingPage({ params, searchParams }: Props) {
  const { platform } = await params;
  if (editionIdSchema.safeParse(platform).success)
    return ChartWeekPage({
      params: Promise.resolve({ slug: 'skills', week: platform }),
      searchParams,
    });
  return <RankingCatalogRoute path={`/charts/skills/${platform}`} />;
}
