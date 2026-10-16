import { describe, expect, it, vi } from 'vitest';
import config from '../next.config';

describe('configuration du serveur local', () => {
  it('ne fournit aucune règle avec des en-têtes vides, refusée au démarrage par Next', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    try {
      const routes = await config.headers?.();
      expect(routes?.length).toBeGreaterThan(0);
      expect(routes?.every((route) => route.headers.length > 0)).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
