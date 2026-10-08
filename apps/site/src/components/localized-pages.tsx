import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import type { PublicRankingCollectionPage } from '@/lib/localized-content';
import type { SiteContentLocalization } from '@/domain/site-localization';
import type { HreflangPage } from '@/domain/ranking-catalog';
import { localeLabel, localeRouteSegment } from '@/i18n/locales';
import { siteMessages } from '@/i18n/messages';
import { formatRankingCount, rankingMessages } from '@/i18n/ranking-messages';

export function EnglishHomePage() {
  return (
    <div className="wrap media-home localized-home" lang="en">
      <section className="featured-episode" aria-labelledby="english-home-title">
        <div className="featured-episode-shade" aria-hidden="true" />
        <div className="featured-episode-copy">
          <p className="label featured-kicker">SANDBOX · PODCASTS & AI CHARTS</p>
          <h1 id="english-home-title" className="display featured-title">
            Discover what is moving in AI.
          </h1>
          <p className="featured-dek">
            Watch thoughtful conversations, follow measured rankings and explore the sources behind
            every position.
          </p>
          <div className="featured-actions">
            <Link href="/en/charts" className="btn btn-solid">
              Explore AI rankings
            </Link>
            <a href="#podcast-library" className="btn">
              About the podcast library
            </a>
          </div>
        </div>
      </section>
      <section className="media-shelf" aria-labelledby="english-charts-title">
        <p className="label text-ink-3">Measured, dated, sourced</p>
        <h2 id="english-charts-title" className="section-title">
          AI rankings with a method you can inspect.
        </h2>
        <p className="library-description">
          Popularity, momentum, benchmark performance and editorial recommendations answer different
          questions. Sandbox keeps those methods separate and publishes a ranking only when its data
          and review are ready.
        </p>
        <Link href="/en/charts" className="shelf-link">
          Browse ranking methods <span aria-hidden="true">→</span>
        </Link>
      </section>
      <section className="media-shelf" id="podcast-library" aria-labelledby="english-podcast-title">
        <p className="label text-ink-3">Video podcast library</p>
        <h2 id="english-podcast-title" className="section-title">
          Conversations, episodes and useful links.
        </h2>
        <p className="library-description">
          The French podcast library is available on the default site. Localized episode pages will
          appear here as their descriptions, chapters and resources are translated and reviewed.
        </p>
        <Link href="/episodes" className="shelf-link" lang="fr">
          Parcourir les épisodes en français <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}

export function LocalizedRankingHub({
  pages,
  locale,
}: {
  pages: PublicRankingCollectionPage[];
  locale: string;
}) {
  const messages = rankingMessages(locale);
  return (
    <article
      className="wrap localized-content"
      lang={locale}
      data-ranking-ui-locale={messages.sourceLocale}
    >
      <header className="localized-content-heading">
        <p className="sc-label">SANDBOX CHARTS</p>
        <h1 lang={messages.sourceLocale}>{messages.hubTitle}</h1>
        <p lang={messages.sourceLocale}>{messages.hubIntroduction}</p>
      </header>
      {pages.length ? (
        <ul className="localized-ranking-cards">
          {pages.map((page) => (
            <li key={`${page.collection.key}:${page.localization.locale}`}>
              <Link href={page.localization.path} lang={page.localization.locale}>
                <span className="sc-label">
                  <span lang={messages.sourceLocale}>{messages.week}</span> {page.week}
                </span>
                <strong>{page.localization.heading}</strong>
                <span>{page.localization.introduction}</span>
                <span className="shelf-link" lang={messages.sourceLocale}>
                  {messages.openRanking}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-note" lang={messages.sourceLocale}>
          {messages.emptyHub}
        </p>
      )}
    </article>
  );
}

export function LocalizedRankingPage({
  page,
  entries,
  alternates = [],
}: {
  page: PublicRankingCollectionPage;
  entries: Awaited<ReturnType<typeof import('@/lib/localized-content').publicRankingEntries>>;
  alternates?: HreflangPage[];
}) {
  const { localization, candidateCount, publishedEditions, week, publishedAt } = page;
  const rankingCopy = rankingMessages(localization.locale);
  const localePrefix = localeRouteSegment(localization.locale);
  const hubPath = `${localePrefix ? `/${localePrefix}` : ''}/charts`;
  const date = new Intl.DateTimeFormat(localization.locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(publishedAt));
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: localization.heading,
          description: localization.metaDescription,
          inLanguage: localization.locale,
          numberOfItems: entries.length,
          itemListElement: entries.map((entry, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: entry.name,
            url: entry.sourceUrl,
          })),
        }}
      />
      <article
        className="wrap localized-content sc-project"
        lang={localization.locale}
        data-ranking-ui-locale={rankingCopy.sourceLocale}
      >
        <nav aria-label={rankingCopy.rankings} className="localized-breadcrumbs">
          <Link href={hubPath} lang={rankingCopy.sourceLocale}>
            {rankingCopy.rankings}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{localization.heading}</span>
        </nav>
        <header className="localized-content-heading">
          <p className="sc-label" lang={rankingCopy.sourceLocale}>
            {rankingCopy.week} {week}
          </p>
          <h1>{localization.heading}</h1>
          <p>{localization.introduction}</p>
          <p className="sc-label">
            <span lang={rankingCopy.sourceLocale}>
              {formatRankingCount(rankingCopy.rankedEntries, candidateCount, localization.locale)}
              {' · '}
              {formatRankingCount(
                rankingCopy.publishedEditions,
                publishedEditions,
                localization.locale,
              )}
              {' · '}
              {rankingCopy.updated}
            </span>{' '}
            <time dateTime={publishedAt}>{date}</time>
          </p>
        </header>
        {alternates.length > 1 ? (
          <nav aria-label={rankingCopy.availableLanguages} className="localized-language-links">
            <span lang={rankingCopy.sourceLocale}>{rankingCopy.availableLanguages}:</span>
            {alternates.map((alternate) => (
              <Link
                key={alternate.locale}
                href={alternate.path}
                lang={alternate.locale}
                hrefLang={alternate.locale}
              >
                {localeLabel(alternate.locale)}
              </Link>
            ))}
          </nav>
        ) : null}
        <section aria-labelledby="localized-ranking-title">
          <h2 id="localized-ranking-title">{localization.title}</h2>
          <div className="sc-table-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th scope="col" lang={rankingCopy.sourceLocale}>
                    {rankingCopy.rank}
                  </th>
                  <th scope="col" lang={rankingCopy.sourceLocale}>
                    {rankingCopy.name}
                  </th>
                  <th scope="col" lang={rankingCopy.sourceLocale}>
                    {rankingCopy.score}
                  </th>
                  <th scope="col" lang={rankingCopy.sourceLocale}>
                    {rankingCopy.movement}
                  </th>
                  <th scope="col" lang={rankingCopy.sourceLocale}>
                    {rankingCopy.source}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.slug}>
                    <td>#{entry.rank}</td>
                    <th scope="row">
                      {entry.name}
                      {entry.tagline ? (
                        <small className="localized-entry-tagline">{entry.tagline}</small>
                      ) : null}
                      {entry.description ? (
                        <details className="localized-entity-details">
                          <summary lang={rankingCopy.sourceLocale}>{rankingCopy.profile}</summary>
                          <p>{entry.description}</p>
                          {entry.limitations ? (
                            <p>
                              <strong lang={rankingCopy.sourceLocale}>
                                {rankingCopy.limitations}:
                              </strong>{' '}
                              {entry.limitations}
                            </p>
                          ) : null}
                        </details>
                      ) : null}
                    </th>
                    <td>
                      {new Intl.NumberFormat(localization.locale, {
                        maximumFractionDigits: 1,
                      }).format(entry.score)}
                    </td>
                    <td>
                      {entry.status === 'new'
                        ? rankingCopy.newEntry
                        : entry.rankChange > 0
                          ? `↑${entry.rankChange}`
                          : entry.rankChange < 0
                            ? `↓${Math.abs(entry.rankChange)}`
                            : '—'}
                    </td>
                    <td>
                      <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {entry.slug} ↗
                      </a>
                      {entry.evidence.length ? (
                        <details className="localized-evidence">
                          <summary lang={rankingCopy.sourceLocale}>
                            {formatRankingCount(
                              rankingCopy.evidence,
                              entry.evidence.length,
                              localization.locale,
                            )}
                          </summary>
                          <ul>
                            {entry.evidence.slice(0, 5).map((fact) => (
                              <li key={fact.id}>
                                <code lang="en">{fact.factKey}</code>:{' '}
                                <span>
                                  {typeof fact.value === 'string' || typeof fact.value === 'number'
                                    ? String(fact.value)
                                    : JSON.stringify(fact.value)}
                                  {fact.unit ? ` ${fact.unit}` : ''}
                                </span>{' '}
                                <a
                                  href={fact.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  lang={rankingCopy.sourceLocale}
                                >
                                  {fact.sourceKind === 'repository'
                                    ? rankingCopy.sourceRepository
                                    : fact.sourceKind === 'publisher'
                                      ? rankingCopy.sourcePublisher
                                      : fact.sourceKind === 'independent_test'
                                        ? rankingCopy.sourceIndependentTest
                                        : fact.sourceKind === 'benchmark'
                                          ? rankingCopy.sourceBenchmark
                                          : rankingCopy.sourceEditorial}{' '}
                                  ↗
                                </a>
                                <time dateTime={fact.observedAt}>
                                  {' '}
                                  {new Intl.DateTimeFormat(localization.locale, {
                                    dateStyle: 'medium',
                                    timeZone: 'UTC',
                                  }).format(new Date(fact.observedAt))}
                                </time>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 lang={rankingCopy.sourceLocale}>{rankingCopy.methodology}</h2>
          <p>{localization.methodologySummary}</p>
        </section>
      </article>
    </>
  );
}

export function LocalizedSiteContentPage({
  page,
  alternates = [],
}: {
  page: SiteContentLocalization;
  alternates?: HreflangPage[];
}) {
  const messages = siteMessages(page.locale);
  return (
    <article className="wrap localized-content" lang={page.locale}>
      <header className="localized-content-heading">
        <p className="sc-label">SANDBOX · {page.contentKind.toUpperCase()}</p>
        <h1>{page.heading}</h1>
        <p>{page.introduction}</p>
      </header>
      {alternates.length > 1 ? (
        <nav aria-label={messages.availableLanguages} className="localized-language-links">
          <span>{messages.availableLanguages}:</span>
          {alternates.map((alternate) => (
            <Link
              key={alternate.locale}
              href={alternate.path}
              lang={alternate.locale}
              hrefLang={alternate.locale}
            >
              {localeLabel(alternate.locale)}
            </Link>
          ))}
        </nav>
      ) : null}
      {page.sections.map((section, index) => (
        <section key={`${index}:${section.heading}`}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      {page.chapters.length ? (
        <section>
          <h2>{messages.chapters}</h2>
          <ol>
            {page.chapters.map((chapter) => (
              <li key={`${chapter.startSec}:${chapter.title}`}>
                <time dateTime={`PT${chapter.startSec}S`}>
                  {new Intl.NumberFormat(page.locale, { minimumIntegerDigits: 2 }).format(
                    Math.floor(chapter.startSec / 60),
                  )}
                  :
                  {new Intl.NumberFormat(page.locale, { minimumIntegerDigits: 2 }).format(
                    chapter.startSec % 60,
                  )}
                </time>{' '}
                {chapter.title}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
