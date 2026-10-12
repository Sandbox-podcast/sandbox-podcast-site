import { describe, expect, it } from 'vitest';
import { pageMetadata, absoluteUrl, siteShareImage } from '../src/lib/seo.ts';
import { siteCard } from '../src/lib/og.tsx';
import { generateMetadata as localizedMetadata } from '../src/app/[locale]/[[...path]]/page.tsx';

describe('aperçus des liens partagés', () => {
  it('fournit un titre, une description et un visuel absolu aux pages sans carte dédiée', () => {
    const metadata = pageMetadata({
      title: 'Tous les épisodes',
      description: 'Les épisodes du podcast et leurs sources.',
      path: '/episodes',
    });

    expect(metadata.description).toBe('Les épisodes du podcast et leurs sources.');
    expect(metadata.openGraph).toMatchObject({
      title: 'Tous les épisodes',
      description: metadata.description,
      locale: 'fr_FR',
      images: [
        {
          url: absoluteUrl('/api/social-image'),
          width: 1200,
          height: 630,
          alt: siteShareImage().alt,
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Tous les épisodes',
      description: metadata.description,
      images: [{ url: absoluteUrl('/api/social-image'), alt: siteShareImage().alt }],
    });
  });

  it.each(['/', '/episodes/42', '/charts/rising'])(
    'laisse Next.js générer les URL de carte dédiées pour %s',
    (path) => {
      const metadata = pageMetadata({
        title: 'Carte dédiée',
        description: 'Résumé de la page.',
        path,
        ownImage: true,
      });
      expect(metadata.openGraph).not.toHaveProperty('images');
      expect(metadata.twitter).not.toHaveProperty('images');
    },
  );

  it('rend une carte de marque à la bonne taille pour le partage', async () => {
    const response = await siteCard();
    const png = Buffer.from(await response.arrayBuffer());

    expect(response.headers.get('content-type')).toContain('image/png');
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it('donne une image accessible et un titre traduit à une page localisée', async () => {
    const metadata = await localizedMetadata({
      params: Promise.resolve({ locale: 'en', path: ['episodes'] }),
    });

    expect(metadata.openGraph).toMatchObject({
      title: 'Podcasts: all episodes',
      locale: 'en',
      images: [
        {
          url: absoluteUrl('/api/social-image'),
          alt: siteShareImage().alt,
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      images: [
        {
          url: absoluteUrl('/api/social-image'),
          alt: siteShareImage().alt,
        },
      ],
    });
  });
});
