import { chartsApiResponse, publicChartHistory } from '@/lib/charts-public';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const chart = new URL(request.url).searchParams.get('chart') ?? 'github';
  if (chart !== 'github' && chart !== 'rising')
    return Response.json({ error: 'Classement introuvable.' }, { status: 404 });
  return (
    await chartsApiResponse(async () => ({ chart, editions: await publicChartHistory(chart) }))
  ).response;
}
