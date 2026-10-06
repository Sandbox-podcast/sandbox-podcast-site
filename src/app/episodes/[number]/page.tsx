import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EntityCard, EpisodeCover, MiniChart, StoryCard } from '@/components/cards';
import { YouTubeFacade } from '@/components/client';
import { JsonLd } from '@/components/json-ld';
import { ExtLink, Mark, SectionHead } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { formatDate, formatDuration, formatTimestamp, isoDuration } from '@/domain/format';
import { MENTION_KINDS, mentionTag } from '@/domain/kinds';
import type { Episode } from '@/domain/schema';
import { entitiesOfEpisode, storiesForEpisode } from '@/lib/graph';
import {
  allEpisodes,
  currentRanks,
  entityPath,
  findEntity,
  getEpisode,
  getHost,
  getTopic,
} from '@/lib/repository';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return allEpisodes().map((e) => ({ number: String(e.number) }));
}

interface Props {
  params: Promise<{ number: string }>;
}

const find = (raw: string): Episode | undefined => getEpisode(Number(raw));

export async function generateMetadata({ params }: Props) {
  const { number } = await params;
  const episode = find(number);
  if (!episode) return {};
  return pageMetadata({
    title: `Épisode ${String(episode.number)} : ${episode.title}`,
    description: `${episode.dek} Show notes complètes : ${String(episode.mentions.length)} liens cités, chapitres et sources.`,
    path: `/episodes/${String(episode.number)}`,
    type: 'article',
    publishedTime: episode.publishedAt,
    ownImage: true,
  });
}

export default async function EpisodePage({ params }: Props) {
  const { number } = await params;
  const episode = find(number);
  if (!episode) notFound();

  const youtubeId = episode.platforms.youtubeId;
  const yt = (at: number): string | null =>
    youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}&t=${String(at)}s` : null;
  const stories = storiesForEpisode(episode);
  const entities = entitiesOfEpisode(episode);
  const all = allEpisodes();
  const idx = all.findIndex((e) => e.number === episode.number);
  const older = all[idx + 1];
  const newer = all[idx - 1];
  const path = `/episodes/${String(episode.number)}`;

  const groups = MENTION_KINDS.map((k) => ({
    ...k,
    items: episode.mentions.map((m, index) => ({ m, index })).filter(({ m }) => m.kind === k.kind),
  })).filter((g) => g.items.length > 0);

  return (
    <article className="wrap pt-6">
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/episodes" className="underline decoration-2 underline-offset-4">
          Episodes
        </Link>{' '}
        / {episode.number}
      </nav>

      <header className="grid gap-8 lg:grid-cols-[1fr_26rem] lg:items-end">
        <div>
          <p className="label mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tag tag-hl">Épisode {episode.number}</span>
            <span>{formatDate(episode.publishedAt)}</span>
            <span>{formatDuration(episode.durationSec)}</span>
            <span>{episode.hosts.map((h) => getHost(h).name).join(' · ')}</span>
          </p>
          <h1
            className="display"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', lineHeight: 0.95 }}
          >
            {episode.title}
          </h1>
          <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
            {episode.dek}
          </p>
          <p className="mt-5 flex flex-wrap gap-2">
            <a
              className="btn btn-hl"
              href={episode.platforms.youtubeUrl ?? siteConfig.platforms.youtube}
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube ↗
            </a>
            <a
              className="btn"
              href={episode.platforms.spotifyUrl ?? siteConfig.platforms.spotify}
              target="_blank"
              rel="noopener noreferrer"
            >
              Spotify ↗
            </a>
            <a
              className="btn"
              href={episode.platforms.appleUrl ?? siteConfig.platforms.apple}
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple Podcasts ↗
            </a>
            <a className="btn" href="#mentions">
              Show notes ↓
            </a>
          </p>
        </div>
        <EpisodeCover episode={episode} showTitle={false} />
      </header>

      <div className="mt-12 grid gap-x-12 gap-y-14 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-14">
          <section aria-label="Lecteur">
            {youtubeId ? (
              <YouTubeFacade id={youtubeId} title={episode.title} />
            ) : (
              <div className="grid aspect-video w-full place-items-center border-2 border-dashed border-ink bg-paper-2 p-6 text-center">
                <div>
                  <p className="display text-3xl">Lecteur à venir</p>
                  <p className="label mt-2 text-ink-2">
                    Aucun identifiant YouTube n’est renseigné pour cet épisode (démonstration).
                  </p>
                </div>
              </div>
            )}
            {episode.platforms.audioUrl ? (
              <audio
                className="mt-4 w-full"
                controls
                preload="none"
                src={episode.platforms.audioUrl}
              >
                <track kind="captions" />
              </audio>
            ) : null}
            <p className="mt-6 max-w-3xl text-lg leading-relaxed">{episode.description}</p>
            {episode.topics.length > 0 ? (
              <p className="mt-4 flex flex-wrap gap-2">
                {episode.topics.map((t) => (
                  <Link key={t} href={`/topics/${t}`} className="chip hover:bg-hl hover:text-on-hl">
                    #{getTopic(t).label}
                  </Link>
                ))}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="chapters">
            <SectionHead
              kicker={`${String(episode.chapters.length)} chapitres`}
              title="Chapitres"
              id="chapters"
            />
            <ol className="m-0 list-none p-0">
              {episode.chapters.map((c, i) => {
                const link = yt(c.at);
                return (
                  <li
                    key={c.at}
                    className="grid grid-cols-[4.5rem_2rem_1fr] items-baseline gap-2 border-t border-hair py-2.5"
                  >
                    <span className="font-mono text-sm tnum">
                      {link ? (
                        <ExtLink
                          href={link}
                          className="underline decoration-2 underline-offset-2 hover:bg-hl hover:text-on-hl"
                        >
                          {formatTimestamp(c.at)}
                        </ExtLink>
                      ) : (
                        formatTimestamp(c.at)
                      )}
                    </span>
                    <span className="label text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-display text-lg font-extrabold leading-tight">
                      {c.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="mentions-title" id="mentions">
            <SectionHead
              kicker="Les show notes ultimes"
              title="Mentioned in this episode"
              id="mentions-title"
            />
            <p className="label mb-6 text-ink-2">
              {episode.mentions.length} éléments cités · chaque ligne renvoie vers sa source. Un
              lien manquant est signalé, jamais inventé.
            </p>
            <div className="grid gap-10">
              {groups.map((g) => (
                <div key={g.kind}>
                  <h3 className="label mb-1 flex items-center gap-2 border-b-2 border-ink pb-1.5">
                    <span className="tag">{g.tag}</span> {g.label}{' '}
                    <span className="text-ink-3">{g.items.length}</span>
                  </h3>
                  <ul className="m-0 list-none p-0">
                    {g.items.map(({ m, index }) => {
                      const entity = m.entity ? findEntity(m.entity) : undefined;
                      const ranks = entity ? currentRanks(entity.slug) : [];
                      const timeLink = m.at !== undefined ? yt(m.at) : null;
                      return (
                        <li
                          key={index}
                          id={`m-${String(index)}`}
                          className="grid scroll-mt-6 grid-cols-[4rem_1fr] gap-3 border-b border-hair py-3 target:bg-hl target:text-on-hl"
                        >
                          <span className="font-mono text-xs tnum text-ink-2">
                            {m.at === undefined ? (
                              '—'
                            ) : timeLink ? (
                              <ExtLink href={timeLink}>{formatTimestamp(m.at)}</ExtLink>
                            ) : (
                              formatTimestamp(m.at)
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              {entity ? <Mark entity={entity} size={26} /> : null}
                              {m.url ? (
                                <ExtLink
                                  href={m.url}
                                  className="font-semibold underline decoration-2 underline-offset-2 hover:bg-ink hover:text-paper"
                                >
                                  {m.label}
                                </ExtLink>
                              ) : (
                                <span className="font-semibold">{m.label}</span>
                              )}
                              {!m.url ? (
                                <span className="chip border-dashed text-accent-ink">
                                  lien à compléter
                                </span>
                              ) : null}
                            </p>
                            {m.note ? (
                              <p className="mt-1 max-w-2xl text-sm text-ink-2">{m.note}</p>
                            ) : null}
                            {entity ? (
                              <p className="label mt-1.5 flex flex-wrap items-center gap-2 text-ink-2">
                                <Link
                                  href={entityPath(entity)}
                                  className="underline decoration-2 underline-offset-2 hover:bg-hl hover:text-on-hl"
                                >
                                  Fiche {entity.name} →
                                </Link>
                                {ranks.map((r) => (
                                  <span key={r.chart.slug} className="chip">
                                    {r.chart.short} n°{r.rank}
                                  </span>
                                ))}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {episode.sources.length > 0 ? (
            <section aria-labelledby="sources">
              <SectionHead
                kicker="Ce qu’on a lu pour préparer l’émission"
                title="Sources"
                id="sources"
              />
              <ul className="m-0 list-none p-0">
                {episode.sources.map((s) => (
                  <li
                    key={s.url + s.label}
                    className="grid grid-cols-[5.5rem_1fr] items-baseline gap-3 border-t border-hair py-2.5"
                  >
                    <span className="label text-ink-3">{mentionTag(s.kind)}</span>
                    <span>
                      <ExtLink
                        href={s.url}
                        className="font-semibold underline decoration-2 underline-offset-2 hover:bg-ink hover:text-paper"
                      >
                        {s.label}
                      </ExtLink>
                      {s.publisher ? (
                        <span className="label ml-2 text-ink-3">{s.publisher}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="grid h-fit content-start gap-12 lg:sticky lg:top-6">
          {episode.charts.length > 0 ? (
            <section aria-labelledby="discussed">
              <h2 id="discussed" className="label mb-4 border-t-4 border-ink pt-2">
                Classements commentés
              </h2>
              <div className="grid gap-8">
                {episode.charts.map((c) => (
                  <MiniChart key={c.chart + c.week} chart={c.chart} week={c.week} top={5} />
                ))}
              </div>
            </section>
          ) : null}
          {entities.length > 0 ? (
            <section aria-labelledby="entities">
              <h2 id="entities" className="label mb-4 border-t-4 border-ink pt-2">
                Fiches des projets et modèles cités
              </h2>
              <div className="grid gap-6">
                {entities.slice(0, 6).map((e) => (
                  <EntityCard key={e.slug} entity={e} />
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {stories.length > 0 ? (
        <section className="mt-16" aria-labelledby="stories">
          <SectionHead kicker="À lire ensuite" title="Articles liés" id="stories" />
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
            {stories.slice(0, 3).map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </div>
        </section>
      ) : null}

      <nav
        aria-label="Épisodes voisins"
        className="mt-16 grid gap-px border-2 border-ink bg-ink sm:grid-cols-2"
      >
        {older ? (
          <Link
            href={`/episodes/${String(older.number)}`}
            className="bg-paper p-4 hover:bg-hl hover:text-on-hl"
            rel="prev"
          >
            <span className="label">← Épisode précédent</span>
            <span className="mt-1 block font-display text-lg font-extrabold">
              {older.number}. {older.title}
            </span>
          </Link>
        ) : (
          <span className="bg-paper p-4" />
        )}
        {newer ? (
          <Link
            href={`/episodes/${String(newer.number)}`}
            className="bg-paper p-4 text-right hover:bg-hl hover:text-on-hl"
            rel="next"
          >
            <span className="label">Épisode suivant →</span>
            <span className="mt-1 block font-display text-lg font-extrabold">
              {newer.number}. {newer.title}
            </span>
          </Link>
        ) : (
          <span className="bg-paper p-4" />
        )}
      </nav>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'PodcastEpisode',
            name: episode.title,
            episodeNumber: episode.number,
            description: episode.description,
            datePublished: episode.publishedAt,
            timeRequired: isoDuration(episode.durationSec),
            url: absoluteUrl(path),
            inLanguage: siteConfig.language,
            partOfSeries: { '@type': 'PodcastSeries', name: siteConfig.name, url: siteConfig.url },
            keywords: episode.topics.map((t) => getTopic(t).label).join(', '),
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Épisodes', path: '/episodes' },
            { name: `Épisode ${String(episode.number)}`, path },
          ]),
        ]}
      />
    </article>
  );
}
