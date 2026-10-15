import { readHostPhoto } from '@/lib/host-photos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const { filename } = await context.params;
  const match = /^([a-f0-9]{64})\.webp$/.exec(filename);
  if (!match?.[1]) return new Response(null, { status: 404 });
  try {
    const image = await readHostPhoto(match[1]);
    if (!image) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(image), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(image.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
