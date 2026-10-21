import { newsLocaleSchema, newsCursorSchema, type NewsCursor } from '@/domain/news-preview';
import { newsPublicEnabled, readPublishedNews } from '@/lib/news-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  if (!newsPublicEnabled()) return new Response(null, { status: 404 });
  const parameters = new URL(request.url).searchParams;
  const language = newsLocaleSchema.safeParse(parameters.get('locale') ?? 'fr-FR');
  if (!language.success) return Response.json({ error: 'Langue invalide.' }, { status: 400 });
  const raw = parameters.get('cursor');
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
    return Response.json(await readPublishedNews(new Date(), cursor, language.data), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Fil indisponible.' }, { status: 503 });
  }
}
