import { describe, expect, it } from 'vitest';
import hosts from '../content/hosts.json';
import { hostSchema } from '../src/domain/schema.ts';

describe('fiches des animateurs', () => {
  it('affiche le pseudo, la photo et les liens de Nicolas', () => {
    const nicolas = hostSchema
      .array()
      .parse(hosts)
      .find((host) => host.slug === 'nicolas');
    expect(nicolas?.aka).toBe('MarlburroW');
    expect(nicolas?.photo).toBe('/team/nicolas-prod-2026-10-15.webp');
    expect(nicolas?.socials).toEqual({
      github: 'https://github.com/MarlBurroW',
      linkedin: 'https://www.linkedin.com/in/nicolas-varrot-b6b05857/',
      x: 'https://x.com/MarlburroW38',
    });
  });

  it('affiche le pseudo et la photo de Lou', () => {
    const lou = hostSchema
      .array()
      .parse(hosts)
      .find((host) => host.slug === 'lou');
    expect(lou?.aka).toBe('loukan42');
    expect(lou?.photo).toBe('/team/lou.png');
  });

  it('n’accepte que des photos servies par le site', () => {
    const withPhoto = (photo: string) => hostSchema.safeParse({ ...hosts[0], photo }).success;
    expect(withPhoto('/team/lou.webp')).toBe(true);
    expect(withPhoto(`/api/host-photos/${'a'.repeat(64)}.webp`)).toBe(true);
    expect(withPhoto('https://evil.example/lou.jpg')).toBe(false);
    expect(withPhoto('/team/../secret.jpg')).toBe(false);
  });
});
