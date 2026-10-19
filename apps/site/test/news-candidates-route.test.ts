import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NEWS_MEDIA } from '../src/domain/news-media';
import { newsPendingSchema } from '../src/domain/news-queue';
const state = vi.hoisted(() => ({
  enabled: true,
  read: vi.fn(),
  claim: vi.fn(),
  enqueue: vi.fn(),
  complete: vi.fn(),
}));
vi.mock('../src/lib/news-store', () => ({
  newsPublicEnabled: () => state.enabled,
  readPublishedNews: async () => ({ checkedAt: null, sources: [], items: [] }),
}));
vi.mock('../src/lib/news-candidates-store', () => ({
  readPendingNewsCandidates: state.read,
  claimNewsCandidates: state.claim,
  readNewsBacklog: async () => ({ pending: 0, oldestPendingAt: null }),
  enqueueNewsCandidates: state.enqueue,
  completeNewsCandidates: state.complete,
}));
import { GET, POST } from '../src/app/api/cron/news-candidates/route';
const secret = 'fixture-news-queue-secret';
const request = (value?: unknown, authorized = true) =>
  new Request('https://sandbox.test/api/cron/news-candidates', {
    method: value ? 'POST' : 'GET',
    headers: {
      ...(authorized ? { authorization: `Bearer ${secret}` } : {}),
      'content-type': 'application/json',
    },
    ...(value ? { body: JSON.stringify(value) } : {}),
  });
beforeEach(() => {
  vi.stubEnv('CRON_SECRET', secret);
  state.enabled = true;
  state.read.mockReset().mockResolvedValue([]);
  state.claim
    .mockReset()
    .mockResolvedValue({ leaseId: 'c5b807f5-e465-4281-a8b5-19508f4c1438', items: [] });
  state.enqueue.mockReset().mockResolvedValue(0);
  state.complete.mockReset().mockResolvedValue(undefined);
});
describe('API privée de file News', () => {
  it('exige le drapeau et le secret avant tout accès', async () => {
    state.enabled = false;
    expect((await GET(request())).status).toBe(404);
    state.enabled = true;
    expect((await GET(request(undefined, false))).status).toBe(401);
    expect((await POST(request({ action: 'collect', items: [] }, false))).status).toBe(401);
    expect(state.read).not.toHaveBeenCalled();
    expect(state.enqueue).not.toHaveBeenCalled();
  });
  it('retourne le lot et le registre complet sans cache', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(newsPendingSchema.parse(await response.json()).sources).toHaveLength(NEWS_MEDIA.length);
  });
  it('refuse un candidat issu d’un domaine extérieur', async () => {
    const response = await POST(
      request({ action: 'collect', items: [{ url: 'https://evil.test' }] }),
    );
    expect(response.status).toBe(422);
    expect(state.enqueue).not.toHaveBeenCalled();
  });
  it('refuse un corps trop volumineux', async () => {
    expect((await POST(request({ value: 'x'.repeat(256_001) }))).status).toBe(413);
  });
  it('accuse la fin du traitement et masque les erreurs du stockage', async () => {
    const leaseId = 'c5b807f5-e465-4281-a8b5-19508f4c1438';
    expect(
      (await POST(request({ action: 'complete', leaseId, published: [], skipped: [] }))).status,
    ).toBe(200);
    expect(state.complete).toHaveBeenCalledWith([], [], leaseId);
    state.read.mockRejectedValue(new Error('SQL secret'));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('SQL secret');
  });
  it('réserve seulement sur POST authentifié et renvoie le jeton de réservation', async () => {
    expect((await POST(request({ action: 'claim' }, false))).status).toBe(401);
    expect(state.claim).not.toHaveBeenCalled();
    const response = await POST(request({ action: 'claim' }));
    expect(response.status).toBe(200);
    expect(newsPendingSchema.parse(await response.json()).leaseId).toBe(
      'c5b807f5-e465-4281-a8b5-19508f4c1438',
    );
    expect((await POST(request({ action: 'complete', published: [], skipped: [] }))).status).toBe(
      422,
    );
  });
});
