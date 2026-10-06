import Link from 'next/link';
import Image from 'next/image';
import { EpisodeCard, EpisodeCover, MiniChart, StoryCard } from '@/components/cards';
import { TimeAgo } from '@/components/client';
import { TakeCard } from '@/components/take-card';
import { Mark, SectionHead } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { formatDateShort, formatDayMonth, formatDuration } from '@/domain/format';
import { shortWeek, weekEnd, weekStart } from '@/domain/weeks';
import { lastUpdated } from '@/lib/graph';
import { highlightDetail, highlightTicker, movePath } from '@/lib/moves';
import {
  allCharts,
  allEpisodes,
  allHosts,
  allStories,
  allTopics,
  chartView,
  entityPath,
  getHost,
  latestWeek,
  weeklyHighlights,
} from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';

export async function generateMetadata() {
  await preparePublishedEditorialContent();
  return pageMetadata({
    title: `${siteConfig.name} : ${siteConfig.tagline}`,
    description: siteConfig.description,
    path: '/',
    ownImage: true,
  });
}

const MOVE_CLASS = {
  up: 'move-up',
  down: 'move-down',
  hot: 'move-new',
  neutral: 'move-re',
} as const;

export default function HomePage() {
  const week = latestWeek();
  const updated = lastUpdated();
  const episodes = allEpisodes();
  const latest = episodes[0];
  const highlights = weeklyHighlights(week).slice(0, 9);
  const stories = allStories();
  const featured = stories.find((s) => s.featured) ?? stories[0];
  const rest = stories.filter((s) => s.slug !== featured?.slug).slice(0, 5);
  const charts = allCharts();

  // L'avis de la semaine : celui qui accompagne la première place du premier classement qui en a un.
  const leadTake = charts
    .map((c) => chartView(c.slug, week).rows.find((r) => r.take && r.rank <= 3))
    .find((r) => r?.take);

  return (
    <div className="wrap pt-5 md:pt-10">
      <section className="sandbox-hero" aria-labelledby="sandbox-hero-title">
        <div className="sandbox-hero-copy">
          <span className="eyebrow">{siteConfig.heroEyebrow}</span>
          <h1 id="sandbox-hero-title" className="sandbox-hero-title">
            {siteConfig.heroTitle}
          </h1>
          <p className="sandbox-hero-dek">{siteConfig.heroDek}</p>
          <div className="sandbox-hero-actions">
            <Link
              href={latest ? `/episodes/${String(latest.number)}` : '/episodes'}
              className="btn btn-solid"
            >
              Voir le dernier épisode <span aria-hidden="true">→</span>
            </Link>
            <Link href="/charts" className="sandbox-text-link">
              Explorer les charts <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <p className="label sandbox-hero-meta">
            Semaine {shortWeek(week).slice(1)} · du {formatDayMonth(weekStart(week))} au{' '}
            {formatDayMonth(weekEnd(week))} · mis à jour <TimeAgo iso={updated.publishedAt} />
          </p>
        </div>
        <div className="sandbox-hero-art">
          <Image
            src="/sandbox-logo.png"
            alt="Sandbox, le studio podcast"
            width={768}
            height={512}
            priority
          />
        </div>
      </section>

      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
        {latest ? (
          <section className="lg:col-span-8" aria-labelledby="latest-episode">
            <SectionHead
              kicker={`Épisode ${String(latest.number)} · ${formatDateShort(latest.publishedAt)}`}
              title="Latest episode"
              id="latest-episode"
              href="/episodes"
              linkLabel="Tous les épisodes"
            />
            <Link
              href={`/episodes/${String(latest.number)}`}
              className="block"
              aria-label={`Ouvrir l’épisode ${String(latest.number)} : ${latest.title}`}
            >
              <EpisodeCover episode={latest} />
            </Link>
            <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <p className="max-w-2xl text-lg leading-snug">{latest.description}</p>
                <p className="label mt-3 text-ink-2">
                  {formatDuration(latest.durationSec)} ·{' '}
                  {latest.hosts.map((h) => getHost(h).name).join(', ')} · {latest.mentions.length}{' '}
                  mentions · {latest.chapters.length} chapitres
                </p>
              </div>
              <div className="flex flex-col gap-2 md:min-w-52">
                <Link
                  href={`/episodes/${String(latest.number)}`}
                  className="btn btn-solid justify-between"
                >
                  Voir l’épisode <span aria-hidden="true">→</span>
                </Link>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    className="btn justify-center px-2"
                    href={latest.platforms.youtubeUrl ?? siteConfig.platforms.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    YouTube
                  </a>
                  <a
                    className="btn justify-center px-2"
                    href={latest.platforms.spotifyUrl ?? siteConfig.platforms.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Spotify
                  </a>
                  <a
                    className="btn justify-center px-2"
                    href={latest.platforms.appleUrl ?? siteConfig.platforms.apple}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apple
                  </a>
                </div>
                <Link
                  href={`/episodes/${String(latest.number)}#mentions`}
                  className="label underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
                >
                  Show notes : {latest.mentions.length} liens cités →
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="lg:col-span-4" aria-labelledby="this-week">
          <SectionHead
            kicker={`S${shortWeek(week).slice(1)} · mouvements`}
            title="This week"
            id="this-week"
            href="/charts/history"
            linkLabel="Historique"
          />
          <ul className="m-0 list-none p-0">
            {highlights.map((h, i) => {
              const t = highlightTicker(h);
              return (
                <li
                  key={`${h.kind}-${h.chart.slug}-${h.entity.slug}`}
                  className={i === 0 ? 'bg-hl text-on-hl' : ''}
                >
                  <Link
                    href={movePath(h)}
                    className={`grid grid-cols-[4.75rem_1fr] items-center gap-3 border-t border-hair px-2 py-2.5 ${i === 0 ? 'border-ink' : 'hover:bg-paper-2'}`}
                  >
                    <span
                      className={`move ${i === 0 ? 'move-new' : MOVE_CLASS[t.tone]} justify-center`}
                    >
                      {t.badge}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-lg font-extrabold leading-tight">
                        {h.entity.name}
                      </span>
                      <span className="label block opacity-75">{highlightDetail(h)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="label mt-3 text-ink-3">Chaque mouvement a sa carte de partage.</p>
        </section>
      </div>

      <section className="mt-16" aria-labelledby="the-charts">
        <SectionHead
          kicker={`Mis à jour chaque semaine · S${shortWeek(week).slice(1)}`}
          title="The charts"
          id="the-charts"
          href="/charts"
          linkLabel="Tous les charts"
        />
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-4">
          {charts.map((c) => (
            <MiniChart key={c.slug} chart={c.slug} week={week} top={5} />
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="latest-stories">
        <SectionHead
          kicker="Analyses, news, benchmarks, guides"
          title="Latest stories"
          id="latest-stories"
          href="/latest"
          linkLabel="Tout le flux"
        />
        <div className="grid gap-x-8 gap-y-10 lg:grid-cols-12">
          {featured ? (
            <div className="lg:col-span-5">
              <StoryCard story={featured} size="lg" />
            </div>
          ) : null}
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-7">
            {rest.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </div>
        </div>
      </section>

      <div className="mt-16 grid gap-x-10 gap-y-12 lg:grid-cols-12">
        {leadTake?.take ? (
          <section className="lg:col-span-5" aria-labelledby="take-of-week">
            <SectionHead kicker="Notre regard, signé" title="Our take" id="take-of-week" />
            <TakeCard take={leadTake.take} />
            <p className="mt-4 flex items-center gap-3">
              <Mark entity={leadTake.entity} size={36} />
              <span className="label">
                À propos de{' '}
                <Link
                  href={entityPath(leadTake.entity)}
                  className="underline decoration-2 underline-offset-4"
                >
                  {leadTake.entity.name}
                </Link>
              </span>
            </p>
            <p className="label mt-3 text-ink-3">
              Les avis ne sont jamais mélangés aux données : ils ont leur propre bloc.
            </p>
          </section>
        ) : null}
        <section className="lg:col-span-4" aria-labelledby="previous-episodes">
          <SectionHead
            kicker="À écouter"
            title="Episodes"
            id="previous-episodes"
            href="/episodes"
            linkLabel="Tous"
          />
          <div className="grid gap-8">
            {episodes.slice(1, 3).map((e) => (
              <EpisodeCard key={e.number} episode={e} />
            ))}
          </div>
        </section>
        <section className="lg:col-span-3" aria-labelledby="topics-home">
          <SectionHead
            kicker="Explorer"
            title="Topics"
            id="topics-home"
            href="/topics"
            linkLabel="Tous"
          />
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {allTopics().map((t) => (
              <li key={t.slug}>
                <Link href={`/topics/${t.slug}`} className="btn">
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="label mt-8 mb-2 text-ink-3">Les trois voix</p>
          <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
            {allHosts().map((h) => (
              <li key={h.slug}>
                <b>{h.name}</b> <span className="text-ink-2">· {h.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            <Link href="/about" className="label underline decoration-2 underline-offset-4">
              À propos →
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
