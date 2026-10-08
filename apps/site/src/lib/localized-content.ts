import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { cache } from 'react';
import { isMock, siteConfig } from '@/config/site';
import {
  isIndexableRankingLocalization,
  rankingCollectionLocalizationSchema,
  rankingCollectionSchema,
  rankingEntityLocalizationSchema,
  rankingEvidenceSchema,
  type HreflangPage,
  type RankingCollection,
  type RankingCollectionLocalization,
} from '@/domain/ranking-catalog';
import {
  isIndexableSiteLocalization,
  siteContentLocalizationSchema,
  type SiteContentLocalization,
} from '@/domain/site-localization';
import { getDb, hasDatabaseConfiguration } from '@/db/client';
import {
  chartEntities,
  rankingCollectionLocalizations,
  rankingCollections,
  rankingEntityLocalizations,
  rankingEvidence,
  siteContentLocalizations,
  weeklyChartEditions,
  weeklyRankings,
} from '@/db/schema';
import { allEntities, allEpisodes, allTopics } from '@/lib/repository';

export interface PublicRankingCollectionPage {
  collection: RankingCollection;
  localization: RankingCollectionLocalization;
  editionId: string;
  week: string;
  publishedAt: string;
  candidateCount: number;
  publishedEditions: number;
}

export interface PublicLocalizedSitePage {
  localization: SiteContentLocalization;
  alternates: HreflangPage[];
}

const sourceForSiteLocalization = (localization: SiteContentLocalization): unknown => {
  switch (localization.contentKind) {
    case 'home':
      if (localization.contentKey !== 'home') return undefined;
      return {
        name: siteConfig.name,
        tagline: siteConfig.tagline,
        description: siteConfig.description,
        episodes: allEpisodes().map(({ number, title, publishedAt }) => ({
          number,
          title,
          publishedAt,
        })),
      };
    case 'episode':
      return allEpisodes().find((episode) => String(episode.number) === localization.contentKey);
    case 'topic':
      return allTopics().find((topic) => topic.slug === localization.contentKey);
    case 'entity':
      return allEntities().find((entity) => entity.slug === localization.contentKey);
    case 'page':
      if (localization.contentKey !== 'about') return undefined;
      return { name: siteConfig.name, team: siteConfig.team };
  }
};

export function contentSourceHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const readPublishedRankingPages = cache(async (): Promise<PublicRankingCollectionPage[]> => {
  if (isMock || !hasDatabaseConfiguration()) return [];
  try {
    const rows = await getDb()
      .select({
        collection: rankingCollections,
        localization: rankingCollectionLocalizations,
        editionId: weeklyChartEditions.id,
        week: weeklyChartEditions.week,
        publishedAt: weeklyChartEditions.publishedAt,
        rankingId: weeklyRankings.id,
      })
      .from(rankingCollections)
      .innerJoin(
        rankingCollectionLocalizations,
        eq(rankingCollectionLocalizations.collectionKey, rankingCollections.key),
      )
      .leftJoin(
        weeklyChartEditions,
        and(
          eq(weeklyChartEditions.chart, rankingCollections.key),
          isNotNull(weeklyChartEditions.publishedAt),
        ),
      )
      .leftJoin(weeklyRankings, eq(weeklyRankings.editionId, weeklyChartEditions.id))
      .where(
        and(
          eq(rankingCollections.active, true),
          eq(rankingCollectionLocalizations.state, 'published'),
        ),
      )
      .orderBy(desc(weeklyChartEditions.publishedAt), desc(weeklyChartEditions.week));

    const grouped = new Map<
      string,
      {
        collection: RankingCollection;
        localization: RankingCollectionLocalization;
        editionWeeks: Set<string>;
        editionId?: string;
        week?: string;
        publishedAt?: string;
        candidateCount: number;
      }
    >();

    for (const row of rows) {
      const collectionResult = rankingCollectionSchema.safeParse({
        key: row.collection.key,
        sourceChart: row.collection.sourceChart,
        entityKind: row.collection.entityKind,
        intent: row.collection.intent,
        method: row.collection.method,
        target: row.collection.target,
        cadence: row.collection.cadence,
        minimumCandidates: row.collection.minimumCandidates,
        minimumPublicEditions: row.collection.minimumPublicEditions,
        active: row.collection.active,
      });
      const localizationResult = rankingCollectionLocalizationSchema.safeParse({
        collectionKey: row.localization.collectionKey,
        locale: row.localization.locale,
        slug: row.localization.slug,
        path: row.localization.path,
        title: row.localization.title,
        metaTitle: row.localization.metaTitle,
        metaDescription: row.localization.metaDescription,
        heading: row.localization.heading,
        introduction: row.localization.introduction,
        methodologySummary: row.localization.methodologySummary,
        state: row.localization.state,
        sourceLocale: row.localization.sourceLocale,
        sourceHash: row.localization.sourceHash,
        reviewedAt: row.localization.reviewedAt ?? undefined,
        publishedAt: row.localization.publishedAt ?? undefined,
      });
      if (!collectionResult.success || !localizationResult.success) continue;

      const key = `${collectionResult.data.key}:${localizationResult.data.locale}`;
      let group = grouped.get(key);
      if (!group) {
        group = {
          collection: collectionResult.data,
          localization: localizationResult.data,
          editionWeeks: new Set(),
          candidateCount: 0,
        };
        grouped.set(key, group);
      }
      if (!row.editionId || !row.week || !row.publishedAt) continue;
      group.editionWeeks.add(row.week);
      if (!group.editionId) {
        group.editionId = row.editionId;
        group.week = row.week;
        group.publishedAt = row.publishedAt;
      }
      if (group.editionId === row.editionId && row.rankingId) group.candidateCount += 1;
    }

    return [...grouped.values()].flatMap((group) => {
      if (!group.editionId || !group.week || !group.publishedAt) return [];
      const readiness = {
        liveData: true,
        candidateCount: group.candidateCount,
        publishedEditions: group.editionWeeks.size,
      };
      if (!isIndexableRankingLocalization(group.collection, group.localization, readiness))
        return [];
      return [
        {
          collection: group.collection,
          localization: group.localization,
          editionId: group.editionId,
          week: group.week,
          publishedAt: group.publishedAt,
          candidateCount: group.candidateCount,
          publishedEditions: group.editionWeeks.size,
        },
      ];
    });
  } catch (error) {
    console.error(
      'Localized ranking pages unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return [];
  }
});

export async function publicRankingCollectionPages(): Promise<PublicRankingCollectionPage[]> {
  return readPublishedRankingPages();
}

export async function publicRankingCollectionPageByPath(
  path: string,
): Promise<PublicRankingCollectionPage | null> {
  return (
    (await readPublishedRankingPages()).find((page) => page.localization.path === path) ?? null
  );
}

export async function publicRankingCollectionPagesFor(
  collectionKey: string,
): Promise<PublicRankingCollectionPage[]> {
  return (await readPublishedRankingPages()).filter(
    (page) => page.collection.key === collectionKey,
  );
}

export async function publicRankingEntries(
  collectionKey: string,
  editionId: string,
  locale: string,
) {
  if (isMock || !hasDatabaseConfiguration()) return [];
  try {
    const rows = await getDb()
      .select({
        entityId: chartEntities.id,
        rank: weeklyRankings.rank,
        score: weeklyRankings.score,
        rankChange: weeklyRankings.rankChange,
        status: weeklyRankings.status,
        name: chartEntities.name,
        slug: chartEntities.slug,
        sourceUrl: chartEntities.sourceUrl,
        localization: {
          entityId: rankingEntityLocalizations.entityId,
          locale: rankingEntityLocalizations.locale,
          displayName: rankingEntityLocalizations.displayName,
          tagline: rankingEntityLocalizations.tagline,
          description: rankingEntityLocalizations.description,
          limitations: rankingEntityLocalizations.limitations,
          state: rankingEntityLocalizations.state,
          sourceLocale: rankingEntityLocalizations.sourceLocale,
          sourceHash: rankingEntityLocalizations.sourceHash,
          reviewedAt: rankingEntityLocalizations.reviewedAt,
          publishedAt: rankingEntityLocalizations.publishedAt,
        },
      })
      .from(weeklyRankings)
      .innerJoin(chartEntities, eq(chartEntities.id, weeklyRankings.entityId))
      .leftJoin(
        rankingEntityLocalizations,
        and(
          eq(rankingEntityLocalizations.entityId, chartEntities.id),
          eq(rankingEntityLocalizations.locale, locale),
          eq(rankingEntityLocalizations.state, 'published'),
        ),
      )
      .where(eq(weeklyRankings.editionId, editionId))
      .orderBy(weeklyRankings.rank);
    const entityIds = rows.map((row) => row.entityId);
    const evidence = entityIds.length
      ? await getDb()
          .select()
          .from(rankingEvidence)
          .where(
            and(
              eq(rankingEvidence.collectionKey, collectionKey),
              eq(rankingEvidence.state, 'verified'),
              inArray(rankingEvidence.entityId, entityIds),
            ),
          )
          .orderBy(desc(rankingEvidence.observedAt))
      : [];
    const evidenceByEntity = new Map<string, ReturnType<typeof rankingEvidenceSchema.parse>[]>();
    for (const row of evidence) {
      const parsed = rankingEvidenceSchema.safeParse({
        id: row.id,
        entityId: row.entityId,
        collectionKey: row.collectionKey ?? undefined,
        factKey: row.factKey,
        value: row.value,
        unit: row.unit ?? undefined,
        sourceKind: row.sourceKind,
        sourceUrl: row.sourceUrl,
        observedAt: row.observedAt,
        verifiedAt: row.verifiedAt ?? undefined,
        reviewer: row.reviewer ?? undefined,
        state: row.state,
      });
      if (!parsed.success || parsed.data.state !== 'verified') continue;
      const list = evidenceByEntity.get(parsed.data.entityId) ?? [];
      list.push(parsed.data);
      evidenceByEntity.set(parsed.data.entityId, list);
    }
    return rows.map((row) => {
      const localization = row.localization?.entityId
        ? rankingEntityLocalizationSchema.safeParse({
            ...row.localization,
            reviewedAt: row.localization.reviewedAt ?? undefined,
            publishedAt: row.localization.publishedAt ?? undefined,
          })
        : undefined;
      return {
        rank: row.rank,
        score: row.score,
        rankChange: row.rankChange,
        status: row.status,
        name:
          localization?.success && localization.data.state === 'published'
            ? localization.data.displayName
            : row.name,
        tagline:
          localization?.success && localization.data.state === 'published'
            ? localization.data.tagline
            : undefined,
        description:
          localization?.success && localization.data.state === 'published'
            ? localization.data.description
            : undefined,
        limitations:
          localization?.success && localization.data.state === 'published'
            ? localization.data.limitations
            : undefined,
        slug: row.slug,
        sourceUrl: row.sourceUrl,
        evidence: evidenceByEntity.get(row.entityId) ?? [],
      };
    });
  } catch (error) {
    console.error(
      'Localized ranking entries unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return [];
  }
}

const readPublishedSitePages = cache(async (): Promise<SiteContentLocalization[]> => {
  if (isMock || !hasDatabaseConfiguration()) return [];
  try {
    const rows = await getDb()
      .select()
      .from(siteContentLocalizations)
      .where(eq(siteContentLocalizations.state, 'published'))
      .orderBy(desc(siteContentLocalizations.publishedAt));
    return rows.flatMap((row) => {
      const parsed = siteContentLocalizationSchema.safeParse({
        contentKind: row.contentKind,
        contentKey: row.contentKey,
        locale: row.locale,
        path: row.path,
        title: row.title,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        heading: row.heading,
        introduction: row.introduction,
        sections: row.sections,
        chapters: row.chapters,
        state: row.state,
        sourceLocale: row.sourceLocale,
        sourceHash: row.sourceHash,
        reviewedAt: row.reviewedAt ?? undefined,
        publishedAt: row.publishedAt ?? undefined,
      });
      if (!parsed.success) return [];
      const source = sourceForSiteLocalization(parsed.data);
      if (!source) return [];
      return isIndexableSiteLocalization(parsed.data, {
        sourcePublished: true,
        sourceHashCurrent: contentSourceHash(source) === parsed.data.sourceHash,
      })
        ? [parsed.data]
        : [];
    });
  } catch (error) {
    console.error(
      'Localized site pages unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return [];
  }
});

export async function publicLocalizedSitePages(): Promise<SiteContentLocalization[]> {
  return readPublishedSitePages();
}

export async function publicLocalizedSitePageByPath(
  path: string,
): Promise<PublicLocalizedSitePage | null> {
  const localizations = await readPublishedSitePages();
  const localization = localizations.find((page) => page.path === path);
  if (!localization) return null;
  const alternates = localizations
    .filter(
      (page) =>
        page.contentKind === localization.contentKind &&
        page.contentKey === localization.contentKey,
    )
    .map((page) => ({ locale: page.locale, path: page.path, indexable: true }));
  return { localization, alternates };
}
