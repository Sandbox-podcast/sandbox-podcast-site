import { siteConfig } from '@/config/site';
import {
  AWARD_CAMPAIGNS,
  AWARD_DEFINITIONS,
  assignedAwardBadgePath,
  assignedAwardSnippets,
} from '@/domain/awards';
import { badgePath, badgeSnippets } from '@/domain/badges';
import { chartBadgesSchema, type ChartBadge } from '@/domain/chart-badges';
import { slugSchema } from '@/domain/schema';
import { readPublicAwards } from '@/lib/awards-store';
import { readRankingBadge } from '@/lib/badges-store';
import { liveChartEntities } from '@/lib/charts-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const headers = { 'Cache-Control': 'no-store' };
  if (!slugSchema.safeParse(slug).success)
    return Response.json({ error: 'Projet introuvable.' }, { status: 404, headers });
  try {
    const [row] = await liveChartEntities([slug]);
    if (!row) return Response.json({ error: 'Projet introuvable.' }, { status: 404, headers });
    const [ranking, awards] = await Promise.all([
      row.repo ? readRankingBadge(String(row.repo.githubId)) : null,
      readPublicAwards({ entityId: row.entity.id, limit: 260 }),
    ]);
    const badges: ChartBadge[] = [];
    if (row.repo && ranking?.eligibility.status === 'ranked') {
      const project = { githubId: row.repo.githubId, slug, name: row.entity.name };
      badges.push({
        id: 'rank',
        label: 'Sandbox Top 100',
        source: badgePath(project.githubId),
        campaign: 'github_top_100',
        snippets: badgeSnippets(siteConfig.url, project),
      });
    }
    for (const award of awards) {
      if (award.withdrawnAt) continue;
      badges.push({
        id: award.id,
        label: `${AWARD_DEFINITIONS[award.type].name} · ${award.period}${award.scope ? ` · ${award.scope}` : ''}`,
        source: assignedAwardBadgePath(award.id),
        campaign: AWARD_CAMPAIGNS[award.type],
        snippets: assignedAwardSnippets(siteConfig.url, award),
      });
    }
    return Response.json(chartBadgesSchema.parse({ badges }), { headers });
  } catch (error) {
    console.error('Chart badges unavailable:', error instanceof Error ? error.name : 'unknown');
    return Response.json({ error: 'Badges indisponibles.' }, { status: 503, headers });
  }
}
