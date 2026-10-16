import { describe, expect, it } from 'vitest';
import { readLimitedRequestText, RequestBodyTooLargeError } from '../src/lib/request-body.ts';

function streamedRequest(chunks: string[], headers?: Record<string, string>) {
  let index = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index++];
      if (chunk === undefined) controller.close();
      else controller.enqueue(new TextEncoder().encode(chunk));
    },
    cancel() {
      cancelled = true;
    },
  });
  const init: RequestInit & { duplex: string } = {
    method: 'POST',
    body,
    duplex: 'half',
    ...(headers ? { headers } : {}),
  };
  return {
    request: new Request('https://sandbox.test/api/admin/content', init),
    cancelled: () => cancelled,
  };
}

describe('lecture bornée des requêtes administratives', () => {
  it('compte les octets UTF-8 et conserve les caractères coupés entre deux paquets', async () => {
    const bytes = new TextEncoder().encode('éé');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 1));
        controller.enqueue(bytes.slice(1));
        controller.close();
      },
    });
    const init: RequestInit & { duplex: string } = { method: 'POST', body, duplex: 'half' };
    const request = new Request('https://sandbox.test', init);
    expect(await readLimitedRequestText(request, 4)).toBe('éé');
    await expect(
      readLimitedRequestText(
        new Request('https://sandbox.test', { method: 'POST', body: 'éé' }),
        3,
      ),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
  it.each([undefined, { 'content-length': '1' }])(
    'interrompt un flux trop grand malgré un en-tête absent ou sous-estimé',
    async (headers) => {
      const fixture = streamedRequest(['123', '456', '789', 'secret-never-parsed'], headers);
      await expect(readLimitedRequestText(fixture.request, 5)).rejects.toBeInstanceOf(
        RequestBodyTooLargeError,
      );
      expect(fixture.cancelled()).toBe(true);
    },
  );
  it('refuse immédiatement une taille déclarée trop grande et les limites invalides', async () => {
    const fixture = streamedRequest(['123'], { 'content-length': '100' });
    await expect(readLimitedRequestText(fixture.request, 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
    expect(fixture.request.bodyUsed).toBe(false);
    await expect(
      readLimitedRequestText(new Request('https://sandbox.test'), 0),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
