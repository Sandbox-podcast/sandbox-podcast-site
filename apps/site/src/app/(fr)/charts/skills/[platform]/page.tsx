import { RankingCatalogRoute, rankingCatalogMetadata } from '@/components/ranking-catalog-route';
export const revalidate = 3600;
export async function generateMetadata({
  params,
}: {
  params: Promise<{
    platform: string;
  }>;
}) {
  const { platform } = await params;
  return rankingCatalogMetadata(`/charts/skills/${platform}`);
}
export default async function SkillsRankingPage({
  params,
}: {
  params: Promise<{
    platform: string;
  }>;
}) {
  const { platform } = await params;
  return <RankingCatalogRoute path={`/charts/skills/${platform}`} />;
}
