import { readLimitedBody } from './limited-body.ts';

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Requête trop volumineuse.');
    this.name = 'RequestBodyTooLargeError';
  }
}

/** La limite s'applique pendant la lecture, même sans Content-Length ou avec une valeur fausse. */
export async function readLimitedRequestText(request: Request, maxBytes: number): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new RangeError('Limite invalide.');
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new RequestBodyTooLargeError();
  if (!request.body) return '';
  const input = await readLimitedBody(request.body, maxBytes);
  if (!input) throw new RequestBodyTooLargeError();
  return new TextDecoder('utf-8', { fatal: true }).decode(input);
}
