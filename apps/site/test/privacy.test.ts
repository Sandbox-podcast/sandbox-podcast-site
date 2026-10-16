import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PrivacyPage, { metadata } from '../src/app/(fr)/confidentialite/page.tsx';
import { LocalizationProvider } from '../src/components/localization.tsx';
import { siteDictionary } from '../src/i18n/dictionaries.ts';

describe('information sur les données personnelles', () => {
  it("publie le responsable, le contact, les durées confirmées et l'accès au retrait", () => {
    const html = renderToStaticMarkup(createElement(PrivacyPage));
    expect(html).toContain('L&#x27;équipe du podcast Sandbox');
    expect(html).toContain('mailto:sandbox.podcast.pro@gmail.com');
    expect(html).toContain('14 mois');
    expect(html).toContain('180 jours');
    expect(html).toContain('Préférences de mesure');
    const breadcrumbs = /<nav[^>]*class="breadcrumbs"[^>]*>(.*?)<\/nav>/.exec(html)?.[1];
    expect(breadcrumbs?.match(/>Accueil<\/a>/g)).toHaveLength(1);
    expect(html).toContain('https://www.cnil.fr/fr/plaintes');
    expect(metadata.alternates?.canonical).toBe('/confidentialite');
  });
  it('conserve les durées et traduit les informations en anglais', async () => {
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: await siteDictionary('en'),
        children: createElement(PrivacyPage),
      }),
    );
    expect(html).toContain('Personal data and audience measurement');
    expect(html).toContain('14 months');
    expect(html).toContain('180 days');
    expect(html).toContain('Measurement preferences');
    expect(html).not.toContain('Qui est responsable');
  });
});
