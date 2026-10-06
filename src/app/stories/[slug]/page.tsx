import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EntityCard, StoryCard, readingMinutes } from '@/components/cards';
import { JsonLd } from '@/components/json-ld';
import { Blocks, Inline } from '@/components/prose';
import { ExtLink, TypeTag } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { formatDate } from '@/domain/format';
import { plainText } from '@/domain/markup';
import { chartsForStory, episodesForStory, relatedStories, storyEntitySlugs } from '@/lib/graph';
import { allStories, findChart, getHost, getStory, getEntity, getTopic } from '@/lib/repository';
import { absoluteUrl, breadcrumbLd, pageMetadata, publisherLd } from '@/lib/seo';

export const dynamicParams = true;

export function generateStaticParams() {
  return allStories().map((s) => ({ slug: s.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return {};
  return pageMetadata({
    title: story.title,
    description: plainText(story.dek),
    path: `/stories/${story.slug}`,
    type: 'article',
    ownImage: true,
    publishedTime: story.publishedAt,
    ...(story.updatedAt ? { modifiedTime: story.updatedAt } : {}),
  });
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();
  const author = getHost(story.author);
  const path = `/stories/${story.slug}`;
  const episodes = episodesForStory(story);
  const charts = chartsForStory(story);
  const entities = storyEntitySlugs(story).map(getEntity).slice(0, 4);
  const more = relatedStories(story);

  return (
    <article className="wrap pt-6">
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/latest" className="underline decoration-2 underline-offset-4">
          Latest
        </Link>{' '}
        / {story.type}
      </nav>

      <header className="max-w-4xl">
        <p className="mb-4 flex flex-wrap items-center gap-3">
          <TypeTag type={story.type} />
          {story.topics.map((t) => (
            <Link key={t} href={`/topics/${t}`} className="chip hover:bg-hl hover:text-on-hl">
              #{getTopic(t).label}
            </Link>
          ))}
        </p>
        <h1
          className="font-display font-extrabold"
          style={{
            fontSize: 'clamp(2.25rem, 6.2vw, 4.75rem)',
            lineHeight: 0.98,
            fontStretch: '78%',
            letterSpacing: '-0.015em',
          }}
        >
          {story.title}
        </h1>
        <p className="mt-5 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          <Inline text={story.dek} />
        </p>
        <p className="label mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
          <span className="flex items-center gap-2">
            <span className="take-who" aria-hidden="true">
              {author.name.slice(0, 1)}
            </span>
            {author.name}
          </span>
          <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
          {story.updatedAt ? <span>Mis à jour le {formatDate(story.updatedAt)}</span> : null}
          <span>{readingMinutes(story)} min de lecture</span>
        </p>
        {story.type === 'opinion' ? (
          <p className="mt-6 border-2 border-ink bg-hl p-3 text-on-hl" role="note">
            <span className="label mr-2">Opinion</span>
            <span className="text-sm">
              Cet article exprime le point de vue de {author.name}. Les données des classements sont
              ailleurs, sourcées et séparées.
            </span>
          </p>
        ) : null}
        {siteConfig.dataMode === 'mock' ? (
          <p className="label mt-4 text-accent-ink">
            Contenu de démonstration : chiffres et faits simulés avec les données du site.
          </p>
        ) : null}
      </header>

      <div className="mt-10 grid gap-x-16 gap-y-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <Blocks blocks={story.body} />
          {story.sources.length > 0 ? (
            <section
              aria-labelledby="sources"
              className="mt-14 max-w-2xl border-t-4 border-ink pt-3"
            >
              <h2 id="sources" className="label mb-3">
                Sources
              </h2>
              <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
                {story.sources.map((s) => (
                  <li key={s.url}>
                    <ExtLink
                      href={s.url}
                      className="underline decoration-2 underline-offset-2 hover:bg-ink hover:text-paper"
                    >
                      {s.label}
                    </ExtLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside
          aria-label="Contenus liés"
          className="grid h-fit content-start gap-10 lg:sticky lg:top-6"
        >
          <h2 className="label border-t-4 border-ink pt-2">Related</h2>
          {charts.length > 0 ? (
            <div>
              <h3 className="label mb-2 text-ink-2">Classements</h3>
              <ul className="m-0 grid list-none gap-2 p-0">
                {charts.map((c) => {
                  const chart = findChart(c.slug);
                  return chart ? (
                    <li key={c.slug}>
                      <Link
                        href={`/charts/${c.slug}`}
                        className="flex items-center justify-between gap-3 border-2 border-ink p-2.5 hover:bg-hl hover:text-on-hl"
                      >
                        <span className="font-display font-extrabold">{chart.title}</span>
                        <span className="label">
                          {c.rank !== null && c.entity
                            ? `${c.entity.name} n°${String(c.rank)}`
                            : 'Voir'}
                        </span>
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          ) : null}
          {episodes.length > 0 ? (
            <div>
              <h3 className="label mb-2 text-ink-2">Mentioned in</h3>
              <ul className="m-0 grid list-none gap-2 p-0">
                {episodes.map((e) => (
                  <li key={e.number}>
                    <Link
                      href={`/episodes/${String(e.number)}`}
                      className="block border-2 border-ink p-2.5 hover:bg-hl hover:text-on-hl"
                    >
                      <span className="label">Épisode {e.number}</span>
                      <span className="block font-display font-extrabold leading-tight">
                        {e.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {entities.length > 0 ? (
            <div>
              <h3 className="label mb-2 text-ink-2">Fiches</h3>
              <div className="grid gap-6">
                {entities.map((e) => (
                  <EntityCard key={e.slug} entity={e} />
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {more.length > 0 ? (
        <section className="mt-20" aria-labelledby="more">
          <h2 id="more" className="section-title border-t-4 border-ink pt-2 mb-6">
            À lire aussi
          </h2>
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
            {more.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </div>
        </section>
      ) : null}

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type':
              story.type === 'news'
                ? 'NewsArticle'
                : story.type === 'opinion'
                  ? 'OpinionNewsArticle'
                  : 'Article',
            headline: story.title,
            description: plainText(story.dek),
            datePublished: story.publishedAt,
            dateModified: story.updatedAt ?? story.publishedAt,
            inLanguage: siteConfig.language,
            url: absoluteUrl(path),
            mainEntityOfPage: absoluteUrl(path),
            author: { '@type': 'Person', name: author.name },
            publisher: publisherLd,
            articleSection: story.type,
            keywords: story.topics.map((t) => getTopic(t).label).join(', '),
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Latest', path: '/latest' },
            { name: story.title, path },
          ]),
        ]}
      />
    </article>
  );
}
