import { publicChartEdition, chartsApiResponse } from '@/lib/charts-public';
import { weekIdSchema } from '@/domain/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chart: string; edition: string }> },
) {
  const { chart, edition } = await params;
  if (
    (chart !== 'github' && chart !== 'rising') ||
    (edition !== 'current' && !weekIdSchema.safeParse(edition).success)
  )
    return Response.json({ error: 'Classement ou semaine introuvable.' }, { status: 404 });
  const result = await chartsApiResponse(() =>
    publicChartEdition(chart, edition === 'current' ? undefined : edition),
  );
  if (!result.ok) return result.response;
  if (result.data === null)
    return Response.json(
      { chart, status: 'pending', entries: [], message: 'Historique en cours de collecte.' },
      {
        status: edition === 'current' ? 202 : 404,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  return result.response;
}
