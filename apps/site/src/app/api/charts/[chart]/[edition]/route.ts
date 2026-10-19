import { publicChartEdition, chartsApiResponse } from '@/lib/charts-public';
import type { PublicChartId } from '@/lib/charts-public';
import { editionFromRoute } from '@/domain/edition-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chart: string; edition: string }> },
) {
  const { chart, edition: rawEdition } = await params;
  const edition = rawEdition === 'current' ? 'current' : editionFromRoute(rawEdition);
  if (!['github', 'rising', 'skills', 'models'].includes(chart) || !edition)
    return Response.json({ error: 'Classement ou semaine introuvable.' }, { status: 404 });
  const result = await chartsApiResponse(
    () => publicChartEdition(chart as PublicChartId, edition === 'current' ? undefined : edition),
    edition === 'current',
  );
  if (!result.ok) return result.response;
  if (result.data === null)
    return Response.json(
      {
        chart,
        status: 'pending',
        entries: [],
        message:
          chart === 'rising'
            ? 'Rising attend au moins vingt projets éligibles avec deux périodes de sept jours mesurées et une accélération positive.'
            : 'Historique en cours de collecte.',
      },
      {
        status: edition === 'current' ? 202 : 404,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  return result.response;
}
