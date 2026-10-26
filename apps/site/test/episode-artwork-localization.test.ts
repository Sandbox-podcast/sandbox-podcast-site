import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EpisodeArtwork } from '../src/components/episode-artwork';
import { PodcastReplays } from '../src/components/podcast-replays';
import { YouTubeFacade } from '../src/components/client';
import { LocalizationProvider } from '../src/components/localization';
import { episodeSchema } from '../src/domain/schema';
import { siteDictionary } from '../src/i18n/dictionaries';
import { translateText } from '../src/i18n/translation';

const episode = episodeSchema.parse({
  number: 2,
  title: 'Restaurateurs, artisans, commerçants : que peut faire l’IA pour vous ? | SANDBOX #2',
  dek: 'Que peut faire l’IA dans votre métier ? Restaurateurs, artisans, commerçants : dans SANDBOX #2, Lou, Loïc et Nico explorent des cas d’usage concrets, décryptent l’actualité IA et débattent de son impact sur le travail.',
  description: '',
  publishedAt: '2026-10-18T19:14:00.000Z',
  hosts: ['lou', 'loic', 'nicolas'],
  platforms: {
    youtubeId: '7KVqydbGow0',
    thumbnailUrl: 'https://i.ytimg.com/vi/7KVqydbGow0/maxresdefault.jpg',
  },
  cover: { tone: 0, kicker: 'SANDBOX #2' },
  status: 'published',
});

describe('textes et miniatures des vidéos localisées', () => {
  it('garde le format et le titre cinéma pour les futurs épisodes sans visuel dédié', () => {
    const html = renderToStaticMarkup(
      createElement(EpisodeArtwork, {
        videoId: 'abcdefghijk',
        artwork: '/images/custom.webp',
        title: 'Notre prochain épisode',
        number: 30,
        cinema: true,
        portrait: true,
        sizes: '160px',
      }),
    );
    expect(html).toContain('data-cinema-episode-artwork="fr-FR"');
    expect(html).toContain('data-with-poster="false"');
    expect(html).toContain('Notre prochain épisode');
    expect(html).toContain('Épisode 30');
    expect(html).toContain(encodeURIComponent('/images/custom.webp'));
    expect(html).not.toContain('episode-001-cinema-v2.webp');
  });

  it('utilise l’affiche cinéma dédiée et le titre court de l’épisode 3', () => {
    const html = renderToStaticMarkup(
      createElement(EpisodeArtwork, {
        videoId: 'eEsaxtmDjR4',
        artwork: '/images/episode-003.jpg',
        title: 'Vibe coding en production : jusqu’où faire confiance à l’IA ? | SANDBOX #3',
        number: 3,
        cinema: true,
        portrait: true,
        sizes: '160px',
      }),
    );
    expect(html).toContain('data-with-poster="true"');
    expect(html).toContain('episode-003-cinema-v1.webp');
    expect(html).toContain('Vibe coding en production');
    expect(html).not.toContain('jusqu’où faire confiance');
  });

  it.each(['fr-FR', 'en', 'es-ES', 'de-DE'])(
    'titre les nouveaux visuels cinéma en HTML en %s',
    async (locale) => {
      const dictionary = await siteDictionary(locale);
      const html = renderToStaticMarkup(
        createElement(LocalizationProvider, {
          locale,
          dictionary,
          children: createElement(EpisodeArtwork, {
            videoId: episode.platforms.youtubeId,
            title: episode.title,
            number: episode.number,
            cinema: true,
            portrait: true,
            sizes: '160px',
          }),
        }),
      );
      expect(html).toContain(`data-cinema-episode-artwork="${locale}"`);
      expect(html).toContain('episode-002-cinema-v2.webp');
      expect(html).not.toContain('vintage-v1.webp');
      expect(html).toContain(translateText('L’IA dans votre métier', dictionary, locale));
      if (locale !== 'fr-FR') expect(html).not.toContain('L’IA dans votre métier');
    },
  );

  it.each(['en', 'es-ES', 'de-DE'])(
    'traduit le titre et le résumé publiés dans les replays en %s',
    async (locale) => {
      const dictionary = await siteDictionary(locale);
      const html = renderToStaticMarkup(
        createElement(LocalizationProvider, {
          locale,
          dictionary,
          children: createElement(PodcastReplays, { episodes: [episode] }),
        }),
      ).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
      const title = translateText(episode.title, dictionary, locale);
      const dek = translateText(episode.dek, dictionary, locale);
      expect(title).not.toBe(episode.title);
      expect(dek).not.toBe(episode.dek);
      expect(html).not.toContain('Restaurateurs, artisans, commerçants');
      expect(html).not.toContain('Que peut faire l’IA dans votre métier');
      expect(html).toContain(title);
      expect(html).toContain(dek);
      expect(html).toContain(`data-localized-episode-artwork="${locale}"`);
      expect(html).not.toContain(encodeURIComponent(episode.platforms.thumbnailUrl ?? ''));
      expect(html).toContain(
        'href="/' + (locale === 'en' ? 'en' : locale.toLowerCase()) + '/episodes/2"',
      );
    },
  );

  it('conserve la miniature française et utilise une composition HTML pour les autres langues', async () => {
    const artwork = episode.platforms.thumbnailUrl;
    const french = renderToStaticMarkup(
      createElement(EpisodeArtwork, {
        artwork,
        videoId: episode.platforms.youtubeId,
        title: episode.title,
        number: episode.number,
        sizes: '100vw',
      }),
    );
    expect(french).toContain(encodeURIComponent(artwork ?? ''));
    expect(french).not.toContain('data-localized-episode-artwork');

    const english = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: await siteDictionary('en'),
        children: createElement(EpisodeArtwork, {
          artwork,
          videoId: episode.platforms.youtubeId,
          title: episode.title,
          number: episode.number,
          portrait: true,
          sizes: '100vw',
        }),
      }),
    );
    expect(english).toContain('data-layout="portrait"');
    expect(english).toContain('AI in your line of work');
    expect(english).toContain('Episode 2');
  });

  it('préserve le lecteur privé et son titre traduit avec un repli typographique pour une nouvelle vidéo', async () => {
    const title = 'Mon épisode';
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: { ...(await siteDictionary('en')), [title]: 'My episode' },
        children: createElement(YouTubeFacade, {
          id: 'abcdefghijk',
          title,
          episodeNumber: 10,
          thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg',
        }),
      }),
    );
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('src="https://i.ytimg.com');
    expect(html).toContain('aria-label="Play video: My episode"');
    expect(html).toContain('data-with-portraits="false"');
    expect(html).toContain('My episode');
  });

  it('traduit les libellés extraits et préfixés par un nom de projet sans changer celui-ci', async () => {
    const dictionary = await siteDictionary('en');
    expect(translateText('Sillage : Le site et le film de présentation', dictionary, 'en')).toBe(
      'Sillage: The website and introduction video',
    );
    expect(translateText('Sillage : Le dépôt GitHub (open source, MIT)', dictionary, 'en')).toBe(
      'Sillage: The GitHub repository (open source, MIT)',
    );
    expect(translateText('🌐 Le site et nos ressources', dictionary, 'en')).toBe(
      'Website and resources',
    );
  });
});
