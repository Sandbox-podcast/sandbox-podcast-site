import { timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { collectGithub, discoverGithub, freezeGithubWeek } from '@/pipeline/github-jobs';
import { collectExternalCharts, freezeExternalCharts } from '@/pipeline/external-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env['CRON_SECRET'];
  const received = request.headers.get('authorization') ?? '';
  const expected = secret ? `Bearer ${secret}` : '';
  if (
    !secret ||
    secret.length < 16 ||
    Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  )
    return Response.json({ error: 'Accès refusé.' }, { status: 401 });
  const { job } = await params;
  if (!['github-discovery', 'github-daily', 'github-weekly', 'external-daily'].includes(job))
    return Response.json({ error: 'Job inconnu.' }, { status: 404 });
  try {
    let summary;
    if (job === 'github-discovery') summary = await discoverGithub();
    else if (job === 'github-daily') summary = await collectGithub();
    else if (job === 'external-daily') summary = await collectExternalCharts();
    else {
      const [github, external] = await Promise.all([freezeGithubWeek(), freezeExternalCharts()]);
      summary = {
        processed: github.processed + external.processed,
        succeeded: github.succeeded + external.succeeded,
        failed: github.failed + external.failed,
        snapshotsCreated: github.snapshotsCreated + external.snapshotsCreated,
        status:
          github.status === 'failed' && external.status === 'failed'
            ? 'failed'
            : github.status === 'success' && external.status === 'success'
              ? 'success'
              : github.status === 'insufficient_history' &&
                  external.status === 'insufficient_history'
                ? 'insufficient_history'
                : github.status === 'skipped' && external.status === 'skipped'
                  ? 'skipped'
                  : 'partial',
        details: [...github.details, ...external.details],
      };
    }
    if (job === 'github-weekly' && summary.snapshotsCreated > 0)
      revalidatePath('/charts', 'layout');
    return Response.json(summary, {
      status: summary.status === 'failed' ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('SANDBOX CHARTS cron failed:', error instanceof Error ? error.name : 'unknown');
    return Response.json(
      { error: 'Job indisponible. Vérifiez la base, ses migrations et GITHUB_TOKEN.' },
      { status: 503 },
    );
  }
}
