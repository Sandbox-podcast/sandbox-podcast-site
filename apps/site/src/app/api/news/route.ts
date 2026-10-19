import { newsCursorSchema, type NewsCursor } from '@/domain/news-preview';
import { newsPublicEnabled, readPublishedNews } from '@/lib/news-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  if (!newsPublicEnabled()) return new Response(null, { status: 404 });
  const raw = new URL(request.url).searchParams.get('cursor');
  let cursor: NewsCursor | undefined;
  if (raw !== null) {
    if (raw.length > 1000) return Response.json({ error: 'Curseur invalide.' }, { status: 400 });
    try {
      cursor = newsCursorSchema.parse(JSON.parse(raw) as unknown);
    } catch {
      return Response.json({ error: 'Curseur invalide.' }, { status: 400 });
    }
  }
  try {
    return Response.json(await readPublishedNews(new Date(), cursor), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Fil indisponible.' }, { status: 503 });
  }
}
