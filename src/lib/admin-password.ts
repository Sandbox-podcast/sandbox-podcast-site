import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const PREFIX = 'scrypt:v1';

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${PREFIX}:${salt.toString('base64url')}:${derived.toString('base64url')}`;
}

export async function verifyAdminPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== 'v1') return false;
  const salt = Buffer.from(parts[2] ?? '', 'base64url');
  const expected = Buffer.from(parts[3] ?? '', 'base64url');
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
