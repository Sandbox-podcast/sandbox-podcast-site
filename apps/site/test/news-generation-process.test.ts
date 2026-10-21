import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewsItem } from '../src/domain/news-preview.ts';

const processMock = vi.hoisted(() => ({ spawn: vi.fn(), existsSync: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: processMock.spawn }));
vi.mock('node:fs', () => ({ existsSync: processMock.existsSync }));

import { generateAndTranslateNews } from '../src/pipeline/news-generation.ts';

function fakeProcess() {
  return Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: { end: vi.fn() },
    kill: vi.fn(() => true),
  });
}

const article: NewsItem = {
  id: 'fixture:process-exit',
  project: 'Fixture',
  repository: 'fixture.test',
  version: 'article',
  url: 'https://fixture.test/process-exit',
  publishedAt: '2026-10-20T10:00:00.000Z',
  category: 'models',
  prerelease: false,
  kind: 'article',
  headline: 'Fixture article',
  sourceExcerpt: 'Public source excerpt with sufficient context for a summary. '.repeat(10),
};

let child: ReturnType<typeof fakeProcess>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  child = fakeProcess();
  processMock.spawn.mockReturnValue(child);
  processMock.existsSync.mockReturnValue(true);
});
afterEach(() => {
  child.stdout.destroy();
  child.stderr.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('diagnostic du processus local de résumé News', () => {
  it('isole un arrêt natif et poursuit le second article sans fermer sa réservation comme un rejet', async () => {
    const second = fakeProcess();
    processMock.spawn.mockReturnValueOnce(child).mockReturnValueOnce(second);
    const result = generateAndTranslateNews([
      article,
      { ...article, id: 'fixture:second', url: 'https://fixture.test/second' },
    ]);
    child.emit('close', null, 'SIGSEGV');
    await vi.advanceTimersByTimeAsync(0);
    expect(processMock.spawn).toHaveBeenCalledTimes(2);
    second.stdout.write(Buffer.from(JSON.stringify({ results: [] })));
    second.emit('close', 0, null);
    await expect(result).resolves.toMatchObject({
      items: [],
      generated: 0,
      skipped: 1,
      failedUrls: [article.url],
    });
    second.stdout.destroy();
    second.stderr.destroy();
  });
  it('identifie un code de sortie non nul en conservant le détail stderr', async () => {
    const result = generateAndTranslateNews([article]);
    child.stderr.write(Buffer.from('Erreur locale de test.'));
    child.emit('close', 7, null);
    await expect(result).rejects.toHaveProperty(
      'message',
      'Le modèle local News a échoué (code=7, signal=null). Erreur locale de test.',
    );
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('identifie une interruption SIGKILL même sans code de sortie ni stderr', async () => {
    const result = generateAndTranslateNews([article]);
    child.emit('close', null, 'SIGKILL');
    await expect(result).rejects.toHaveProperty(
      'message',
      'Le modèle local News a échoué (code=null, signal=SIGKILL).',
    );
  });

  it('garde le détail stderr dans sa limite existante', async () => {
    const result = generateAndTranslateNews([article]);
    const detail = 'x'.repeat(8_000);
    child.stderr.write(Buffer.from(detail));
    child.stderr.write(Buffer.from('tail-outside-existing-limit'));
    child.emit('close', 2, null);
    await expect(result).rejects.toHaveProperty(
      'message',
      `Le modèle local News a échoué (code=2, signal=null). ${detail}`,
    );
  });

  it('conserve le message du timeout sans le remplacer par la fermeture du processus', async () => {
    const result = generateAndTranslateNews([article]);
    const rejected = expect(result).rejects.toHaveProperty(
      'message',
      'La génération locale News a dépassé huit minutes.',
    );
    await vi.advanceTimersByTimeAsync(8 * 60_000);
    child.emit('close', null, 'SIGTERM');
    await rejected;
    expect(child.kill).toHaveBeenCalledExactlyOnceWith();
  });

  it('conserve le message du budget annulé sans le remplacer par la fermeture du processus', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const result = generateAndTranslateNews([article]);
    const rejected = expect(result).rejects.toHaveProperty(
      'message',
      'Le budget du lot News est épuisé.',
    );
    controller.abort();
    child.emit('close', null, 'SIGTERM');
    await rejected;
    expect(child.kill).toHaveBeenCalledExactlyOnceWith();
  });

  it('ne transforme pas une sortie réussie en erreur de processus', async () => {
    const result = generateAndTranslateNews([article]);
    child.stdout.write(Buffer.from(JSON.stringify({ results: [] })));
    child.emit('close', 0, null);
    await expect(result).resolves.toMatchObject({ items: [], generated: 0, skipped: 1 });
    expect(child.kill).not.toHaveBeenCalled();
  });
});
