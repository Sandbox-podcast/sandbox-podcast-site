import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/db/schema.ts';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import { loadContent } from '../src/lib/load.ts';
import {
  currentTranslationSourcePack,
  importContentTranslations,
  publishedContentDictionary,
} from '../src/lib/content-translations-store.ts';

const pglite = new PGlite();
const db = drizzle(pglite, { schema });
vi.mock('../src/db/client.ts', () => ({ getDb: () => db }));
vi.mock('../src/lib/admin-persistence.ts', () => ({
  adminStorageMode: () => 'postgres',
  getPublishedAdminContent: async () => {
    return editableContentSchema.strip().parse(loadContent());
  },
}));
vi.mock('../src/lib/charts-editorial.ts', () => ({ readChartsEditorial: async () => [] }));
beforeAll(async () => {
  await pglite.exec(
    readFileSync(join(process.cwd(), 'drizzle/0006_manual_content_translations.sql'), 'utf8'),
  );
});
afterEach(async () => {
  await db.delete(schema.siteTranslationMessages);
});

describe('import durable depuis le harnais', () => {
  it('enregistre, recharge et corrige un texte sans créer de doublon ni modifier le français', async () => {
    const pack = await currentTranslationSourcePack();
    const source = pack.sources.find((item) => item.source === loadContent().site.heroTitle);
    if (!source) throw new Error('fixture');
    const bundle = {
      version: 1,
      locale: 'de-DE',
      translations: [{ ...source, text: 'Ein neuer Blick auf KI' }],
    };
    expect(await importContentTranslations(bundle)).toEqual({ locale: 'de-DE', imported: 1 });
    expect((await publishedContentDictionary('de-DE'))[source.source]).toBe(
      'Ein neuer Blick auf KI',
    );
    await importContentTranslations({
      ...bundle,
      translations: [{ ...source, text: 'Ein genauer Blick auf KI' }],
    });
    expect((await publishedContentDictionary('de-DE'))[source.source]).toBe(
      'Ein genauer Blick auf KI',
    );
    expect(await db.select().from(schema.siteTranslationMessages)).toHaveLength(1);
    expect(loadContent().site.heroTitle).toBe(source.source);
  });
  it('refuse atomiquement un fichier qui mélange texte valide et source périmée', async () => {
    const pack = await currentTranslationSourcePack();
    const source = pack.sources.find((item) => item.source === loadContent().site.heroTitle);
    if (!source) throw new Error('fixture');
    await expect(
      importContentTranslations({
        version: 1,
        locale: 'de-DE',
        translations: [
          { ...source, text: 'Ein neuer Blick auf KI' },
          { ...source, source: 'Un ancien titre retiré', text: 'Ein alter Titel' },
        ],
      }),
    ).rejects.toThrow(/source/);
    expect(await db.select().from(schema.siteTranslationMessages)).toHaveLength(0);
  });
});
