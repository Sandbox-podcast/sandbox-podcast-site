import { newsPreviewEnabled, refreshNewsPreview } from '../../../../lib/news-preview-store';

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!newsPreviewEnabled()) return new Response(null, { status: 404 });
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    request.headers.get('origin') !== url.origin
  )
    return new Response(null, { status: 403 });
  try {
    return Response.json(await refreshNewsPreview(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { error: 'La collecte est indisponible. Le dernier relevé reste affiché.' },
      { status: 503 },
    );
  }
}
