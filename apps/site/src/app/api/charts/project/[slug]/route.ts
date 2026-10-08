import { slugSchema } from '@/domain/schema';
import { chartsApiResponse, githubProjectDetail } from '@/lib/charts-public';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success)
    return Response.json({ error: 'Projet introuvable.' }, { status: 404 });
  const result = await chartsApiResponse(() => githubProjectDetail(slug));
  if (!result.ok) return result.response;
  if (result.data === null)
    return Response.json(
      { error: 'Projet introuvable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  return result.response;
}
