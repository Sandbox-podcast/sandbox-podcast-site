import { RankingCatalogRoute, rankingCatalogMetadata } from '@/components/ranking-catalog-route';
export const revalidate = 3600;
export async function generateMetadata({
  params,
}: {
  params: Promise<{
    task: string;
  }>;
}) {
  const { task } = await params;
  return rankingCatalogMetadata(`/charts/models/${task}`);
}
export default async function ModelsRankingPage({
  params,
}: {
  params: Promise<{
    task: string;
  }>;
}) {
  const { task } = await params;
  return <RankingCatalogRoute path={`/charts/models/${task}`} />;
}
