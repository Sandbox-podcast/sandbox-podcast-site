import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ImageConfigContext } from 'next/dist/shared/lib/image-config-context.shared-runtime';
import { imageConfigDefault } from 'next/dist/shared/lib/image-config';
import { HomeHostCard } from '../src/components/home-host-card';
import { Text } from '../src/components/localization';
import { homeProfiles } from '../src/domain/home-story';
import { publicHosts } from '../src/lib/repository';
import { HOME_HOST_ARTWORK } from '../src/domain/home-host-artwork';
import { statSync } from 'node:fs';

function renderCard(host: ReturnType<typeof homeProfiles>[number], index: number) {
  return renderToStaticMarkup(
    createElement(
      ImageConfigContext.Provider,
      { value: { ...imageConfigDefault, qualities: [75, 90] } },
      createElement(HomeHostCard, { host, index }),
    ),
  );
}

describe('cartes des voix de Sandbox', () => {
  const team = homeProfiles(publicHosts());

  it('utilise les illustrations dédiées sans remplacer les photos sources de l’équipe', () => {
    expect(team).toHaveLength(3);
    for (const [index, host] of team.entries()) {
      const html = renderCard(host, index);
      expect(html).toContain(`data-host-card="${host.slug}"`);
      expect(html).toContain(`<h3>${host.name}</h3>`);
      expect(html).toContain(renderToStaticMarkup(createElement(Text, null, host.focus)));
      expect(html).toContain(String(index + 1).padStart(3, '0') + ' / 003');
      expect(html).toContain('data-holo-active="false"');
      if (!host.photo) throw new Error('Photo source absente');
      const artwork = HOME_HOST_ARTWORK[host.slug];
      if (!artwork) throw new Error('Illustration absente');
      expect(artwork).not.toBe(host.photo);
      expect(html).toContain(encodeURIComponent(artwork));
      expect(html).toContain(`data-host-artwork="${host.slug}"`);
      expect(statSync(new URL(`../public${host.photo}`, import.meta.url)).size).toBeGreaterThan(
        1_000,
      );
      expect(statSync(new URL(`../public${artwork}`, import.meta.url)).size).toBeLessThan(450_000);
      expect(html).toContain('q=90');
      expect(html).not.toContain('body-no-mic');
      expect(html).not.toContain('<canvas');
      expect(html).not.toContain('<iframe');
    }
  });

  it('utilise la photographie pour un profil sans illustration dédiée', () => {
    const host = team[0];
    if (!host?.photo) throw new Error('Photo source absente');
    const html = renderCard({ ...host, slug: 'other-host' }, 0);
    expect(html).toContain(encodeURIComponent(host.photo));
    expect(html).not.toContain('data-host-artwork=');
  });

  it('conserve les deux paragraphes complets dans un volet HTML natif sans JavaScript', () => {
    for (const [index, host] of team.entries()) {
      const html = renderCard(host, index);
      expect(html.match(/<details\b/g)).toHaveLength(1);
      expect(html).toContain('<summary>');
      expect(html).toContain('Faire connaissance');
      expect(html).not.toMatch(/<details[^>]+\bopen=/);
      const paragraphs = host.bio.split(/\n\s*\n/);
      expect(paragraphs).toHaveLength(2);
      for (const paragraph of paragraphs) {
        expect(html).toContain(renderToStaticMarkup(createElement(Text, null, paragraph)));
      }
    }
  });

  it('garde les liens sociaux natifs publiés et ne crée pas les réseaux absents', () => {
    for (const [index, host] of team.entries()) {
      const html = renderCard(host, index);
      const links = Object.values(host.socials);
      expect(html.match(/<a\b/g) ?? []).toHaveLength(links.length);
      for (const href of links) {
        expect(html).toContain(`href="${href}" target="_blank" rel="noopener noreferrer"`);
      }
    }
  });
});
