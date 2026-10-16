import { publicReferenceArtifact, type PublicChartId } from '@/lib/charts-public';
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
    return Response.json({ error: 'Classement ou édition introuvable.' }, { status: 404 });
  try {
    const artifact = await publicReferenceArtifact(
      chart as PublicChartId,
      edition === 'current' ? undefined : edition,
    );
    if (!artifact)
      return Response.json(
        { error: 'Aucune preuve v3 publiée pour cette édition.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    const bytes = new TextEncoder().encode(JSON.stringify(artifact));
    let offset = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= bytes.length) {
          controller.close();
          return;
        }
        controller.enqueue(bytes.subarray(offset, offset + 16384));
        offset += 16384;
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${chart}-${edition}-proof.json"`,
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('Reference proof unavailable:', error instanceof Error ? error.name : 'unknown');
    return Response.json(
      { error: 'Preuve momentanément indisponible.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
