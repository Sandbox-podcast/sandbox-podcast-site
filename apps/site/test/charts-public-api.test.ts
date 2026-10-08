import { afterEach, describe, expect, it, vi } from 'vitest';
import { chartsApiResponse } from '../src/lib/charts-public.ts';

describe('réponses publiques des classements', () => {
  afterEach(() => vi.restoreAllMocks());

  it('conserve les données et le cache court en cas de succès', async () => {
    const result = await chartsApiResponse(async () => ({ chart: 'github' }));
    if (!result.ok) throw new Error('La lecture de test devrait réussir');

    expect(result.data).toEqual({ chart: 'github' });
    expect(result.response.status).toBe(200);
    expect(result.response.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=300');
    expect(await result.response.json()).toEqual({ chart: 'github' });
  });

  it('distingue une indisponibilité de données d’une valeur absente', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await chartsApiResponse(async () => {
      throw new Error('database failure');
    });
    if (result.ok) throw new Error('La lecture échouée ne doit pas être marquée comme réussie');

    expect(result.response.status).toBe(503);
    expect(result.response.headers.get('Cache-Control')).toBe('no-store');
    expect(await result.response.json()).toEqual({
      status: 'unavailable',
      error: 'Les données sont temporairement indisponibles.',
    });
    expect(log).toHaveBeenCalledOnce();
  });
});
