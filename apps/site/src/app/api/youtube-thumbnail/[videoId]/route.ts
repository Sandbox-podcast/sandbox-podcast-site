import { bestYouTubeThumbnail } from '@/lib/youtube-thumbnail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: RouteContext<'/api/youtube-thumbnail/[videoId]'>,
): Promise<Response> {
  const { videoId } = await context.params;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return new Response(null, { status: 404 });
  const image = await bestYouTubeThumbnail(videoId);
  if (!image) return new Response(null, { status: 502 });
  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(image.byteLength),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
