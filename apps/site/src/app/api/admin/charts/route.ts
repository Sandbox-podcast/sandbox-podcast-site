import { revalidatePath } from 'next/cache';
import { chartsAdminWriteSchema } from '@/domain/charts-admin';
import { trackingStatusSchema } from '@/domain/github-charts';
import { originIsSameSite } from '@/lib/admin-auth';
import { adminCan, getAuthenticatedAdmin } from '@/lib/admin-auth-db';
import { chartsAdminData } from '@/lib/charts-admin';
import { modifyChartRepository, publishFrozenCharts, writeChartsConfig } from '@/lib/charts-store';
import { writeChartsEditorial } from '@/lib/charts-editorial';
import { ContentConflictError } from '@/lib/admin-content-conflict';
import { vercelOidcToken } from '@/pipeline/external-clients';
import { collectExternalCharts, freezeExternalCharts } from '@/pipeline/external-jobs';
import { collectGithub, discoverGithub, freezeGithubWeek } from '@/pipeline/github-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request: Request) {
  const user = await getAuthenticatedAdmin(request);
  if (!user || !adminCan(user, 'read'))
    return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  const url = new URL(request.url);
  const page = Math.max(0, Math.min(10000, Number(url.searchParams.get('page')) || 0));
  const status = trackingStatusSchema.safeParse(url.searchParams.get('status'));
  return Response.json(
    await chartsAdminData(
      Math.floor(page),
      status.success ? status.data : undefined,
      (url.searchParams.get('q') ?? '').slice(0, 100),
      url.searchParams.get('edition') ?? undefined,
    ),
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(request: Request) {
  if (!originIsSameSite(request))
    return Response.json({ error: 'Requête refusée.' }, { status: 403 });
  const user = await getAuthenticatedAdmin(request);
  if (!user) return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  if (Number(request.headers.get('content-length')) > 64000)
    return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > 64000)
    return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }
  const parsed = chartsAdminWriteSchema.safeParse(value);
  if (!parsed.success)
    return Response.json({ error: 'Action ou données invalides.' }, { status: 422 });
  if (
    !adminCan(
      user,
      parsed.data.action === 'editorial' && parsed.data.layer === 'draft' ? 'draft' : 'publish',
    )
  )
    return Response.json({ error: 'Droits insuffisants.' }, { status: 403 });
  try {
    const command = parsed.data;
    if (command.action === 'editorial') {
      const etag = await writeChartsEditorial(
        command.editionId,
        command.edition,
        command.layer,
        command.expectedEtag,
        user.displayName,
      );
      if (command.layer === 'published') revalidatePath('/charts', 'layout');
      return Response.json({ ok: true, etag });
    }
    if (command.action === 'repository') await modifyChartRepository(command.id, command);
    if (command.action === 'config') await writeChartsConfig(command.config);
    if (command.action === 'publish') {
      await publishFrozenCharts(command.week);
      revalidatePath('/charts', 'layout');
    }
    if (command.action === 'job') {
      const result =
        command.job === 'discover'
          ? await discoverGithub()
          : command.job === 'collect'
            ? await collectGithub()
            : command.job === 'external-collect'
              ? await collectExternalCharts(vercelOidcToken(request))
              : command.job === 'external-weekly'
                ? await freezeExternalCharts({ dryRun: command.dryRun, publish: false })
                : await freezeGithubWeek({ dryRun: command.dryRun, publish: false });
      return Response.json(
        { ok: result.status !== 'failed', summary: result },
        { status: result.status === 'failed' ? 503 : 200 },
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ContentConflictError)
      return Response.json({ error: error.message }, { status: 409 });
    console.error(
      'SANDBOX CHARTS admin action failed:',
      error instanceof Error ? error.name : 'unknown',
    );
    return Response.json(
      { error: 'Action impossible. Vérifiez la configuration et les journaux des collectes.' },
      { status: 503 },
    );
  }
}
