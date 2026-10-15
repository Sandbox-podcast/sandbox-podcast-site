import { describe, expect, it } from 'vitest';
import { AwardCommandError, parseAwardCommand } from '../src/domain/badges-cli.ts';

describe('commande opérateur des Awards', () => {
  it('sépare la simulation et les attributions réelles', () => {
    expect(parseAwardCommand([])).toEqual({ mode: 'assign', dryRun: false });
    expect(parseAwardCommand(['--', '--dry-run', '--week=2026-W41'])).toEqual({
      mode: 'assign',
      dryRun: true,
      week: '2026-W41',
    });
  });
  it('affiche une aide sans accéder à la base', () => {
    expect(parseAwardCommand(['--help'])).toEqual({ mode: 'help' });
    expect(parseAwardCommand(['-h'])).toEqual({ mode: 'help' });
  });
  it('filtre les extensions avec leur calendrier et retire par identifiant stable', () => {
    expect(
      parseAwardCommand(['--dry-run', '--type=annual', '--period=2025', '--scope=models']),
    ).toEqual({ mode: 'assign', dryRun: true, type: 'annual', period: '2025', scope: 'models' });
    expect(parseAwardCommand(['--type=rookie-month', '--period=2026-10'])).toEqual({
      mode: 'assign',
      dryRun: false,
      type: 'rookie-month',
      period: '2026-10',
    });
    expect(
      parseAwardCommand([
        '--withdraw',
        '--id=11111111-1111-4111-8111-111111111111',
        '--reason=Erreur de mesure documentée.',
        '--actor=Lou',
      ]),
    ).toEqual({
      mode: 'withdraw-id',
      id: '11111111-1111-4111-8111-111111111111',
      reason: 'Erreur de mesure documentée.',
      actor: 'Lou',
    });
  });
  it('valide et normalise les informations du retrait explicite', () => {
    expect(
      parseAwardCommand([
        '--withdraw',
        '--week=2026-W41',
        '--reason=  Erreur confirmée et documentée.  ',
        '--actor=  Opérateur  ',
      ]),
    ).toEqual({
      mode: 'withdraw',
      week: '2026-W41',
      reason: 'Erreur confirmée et documentée.',
      actor: 'Opérateur',
    });
  });
  it.each([
    ['--dryrun'],
    ['--week=2026-W54'],
    ['--week=2025-W53'],
    ['--week='],
    ['--dry-run', '--dry-run'],
    ['--week=2026-W41', '--week=2026-W42'],
    ['--help', '--withdraw'],
    ['--withdraw', '--dry-run', '--week=2026-W41'],
    ['--withdraw', '--week=2026-W41'],
    ['--withdraw', '--week=2026-W41', '--reason=trop bref', '--actor=Opérateur'],
    ['--withdraw', '--week=2026-W41', '--reason=Erreur documentée.', '--actor= '],
    ['--reason=Erreur documentée.'],
    ['--actor=Opérateur'],
    ['--type=unknown'],
    ['--type=annual', '--period=2026-W41'],
    ['--type=rookie-month', '--period=2026-13'],
    ['--type=skill-week', '--scope=models'],
    ['--type=github-category', '--scope=unknown'],
    ['--period=2025'],
    ['--scope=models'],
    ['--week=2026-W41', '--type=best-model'],
    ['--id=11111111-1111-4111-8111-111111111111'],
    ['--withdraw', '--id=wrong', '--reason=Erreur documentée.', '--actor=Lou'],
    [
      '--withdraw',
      '--id=11111111-1111-4111-8111-111111111111',
      '--week=2026-W41',
      '--reason=Erreur documentée.',
      '--actor=Lou',
    ],
    [
      '--withdraw',
      '--type=annual',
      '--week=2026-W41',
      '--reason=Erreur documentée.',
      '--actor=Lou',
    ],
  ])('refuse les options ambiguës avant toute opération : %j', (...args: string[]) => {
    expect(() => parseAwardCommand(args)).toThrow(AwardCommandError);
  });
});
