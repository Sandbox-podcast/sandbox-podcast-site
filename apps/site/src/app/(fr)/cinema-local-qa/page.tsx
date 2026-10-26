import { notFound } from 'next/navigation';
import { SandboxWorld } from '@/components/sandbox-world';
import { episodeSchema } from '@/domain/schema';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Aperçu local du cinéma',
  robots: { index: false, follow: false },
};

/** Aperçu de développement : les données publiées restent intactes. */
export default function CinemaLocalPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const episodes = [
    {
      number: 1,
      videoId: 'GgSiPkADCz4',
      title: 'Codex, Claude Code, OpenCode : le modèle ne suffit pas',
      date: '2026-10-12',
    },
    {
      number: 2,
      videoId: '7KVqydbGow0',
      title: 'Restaurateurs, artisans, commerçants : que peut faire l’IA pour vous ?',
      date: '2026-10-18',
    },
    {
      number: 3,
      videoId: 'eEsaxtmDjR4',
      title: 'Vibe coding en production : jusqu’où faire confiance à l’IA ? | SANDBOX #3',
      date: '2026-10-25',
    },
  ].map(({ number, videoId, title, date }) =>
    episodeSchema.parse({
      number,
      title,
      dek: title,
      description: '',
      publishedAt: `${date}T19:00:00.000Z`,
      hosts: ['lou', 'loic', 'nicolas'],
      status: 'published',
      platforms: {
        youtubeId: videoId,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      },
      cover: { tone: 0, kicker: 'Aperçu local' },
    }),
  );
  return (
    <SandboxWorld
      episodes={episodes}
      projects={[]}
      newsAvailable={false}
      heroCopy={{
        eyebrow: 'Aperçu local',
        title: 'Le cinéma',
        description: 'Aperçu des trois épisodes.',
      }}
    />
  );
}
