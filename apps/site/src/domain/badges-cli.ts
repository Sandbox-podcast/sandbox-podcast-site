import { awardWeekSchema } from './badges.ts';
import {
  awardAssignmentIdSchema,
  awardPeriod,
  awardScope,
  awardTypeSchema,
  type AwardType,
} from './awards.ts';

export type AwardCommand =
  | { mode: 'help' }
  | {
      mode: 'assign';
      dryRun: boolean;
      week?: string;
      type?: AwardType;
      period?: string;
      scope?: string;
    }
  | { mode: 'withdraw'; week: string; reason: string; actor: string }
  | { mode: 'withdraw-id'; id: string; reason: string; actor: string };

export class AwardCommandError extends Error {
  override name = 'AwardCommandError';
}

/** Refuse toute option ambiguë avant le premier accès à la base. */
export function parseAwardCommand(args: readonly string[]): AwardCommand {
  const options = new Map<string, string | true>();
  for (const argument of args) {
    if (argument === '--') continue;
    const match = /^(--week|--reason|--actor|--type|--period|--scope|--id)=(.*)$/.exec(argument);
    const flag = argument === '-h' ? '--help' : argument;
    const key = match?.[1] ?? flag;
    if (!match && !['--help', '--dry-run', '--withdraw'].includes(flag))
      throw new AwardCommandError('Option inconnue. Consulter --help.');
    if (options.has(key)) throw new AwardCommandError('Option répétée. Consulter --help.');
    options.set(key, match?.[2] ?? true);
  }
  if (options.has('--help')) {
    if (options.size !== 1)
      throw new AwardCommandError('--help doit être utilisé seul. Aucune action exécutée.');
    return { mode: 'help' };
  }
  const week = options.get('--week');
  if (week !== undefined && (typeof week !== 'string' || !awardWeekSchema.safeParse(week).success))
    throw new AwardCommandError('Semaine ISO invalide. Format attendu : AAAA-Wnn.');
  if (options.has('--withdraw')) {
    if (options.has('--dry-run'))
      throw new AwardCommandError('Le retrait ne prend pas --dry-run. Aucune action exécutée.');
    const reason = options.get('--reason');
    const actor = options.get('--actor');
    const id = options.get('--id');
    if (options.has('--type') || options.has('--period') || options.has('--scope'))
      throw new AwardCommandError('Le retrait exige --id ou --week, sans filtre.');
    if (
      id !== undefined &&
      (week !== undefined ||
        typeof id !== 'string' ||
        !awardAssignmentIdSchema.safeParse(id).success)
    )
      throw new AwardCommandError('Retrait : --id doit être un UUID valide, utilisé sans --week.');
    if (
      (typeof week !== 'string' && typeof id !== 'string') ||
      typeof reason !== 'string' ||
      reason.trim().length < 10 ||
      reason.trim().length > 1000 ||
      typeof actor !== 'string' ||
      actor.trim().length < 1 ||
      actor.trim().length > 100
    )
      throw new AwardCommandError(
        'Retrait : --id ou --week valide, --reason de 10 à 1000 caractères et --actor de 1 à 100 caractères requis.',
      );
    return typeof id === 'string'
      ? { mode: 'withdraw-id', id, reason: reason.trim(), actor: actor.trim() }
      : { mode: 'withdraw', week: String(week), reason: reason.trim(), actor: actor.trim() };
  }
  if (options.has('--reason') || options.has('--actor') || options.has('--id'))
    throw new AwardCommandError(
      '--reason, --actor et --id exigent --withdraw. Aucune action exécutée.',
    );
  const typeOption = options.get('--type');
  const type = typeOption === undefined ? undefined : awardTypeSchema.safeParse(typeOption);
  if (type && !type.success)
    throw new AwardCommandError('Type de récompense inconnu. Consulter --help.');
  const period = options.get('--period');
  const scope = options.get('--scope');
  if (
    week !== undefined &&
    (typeOption !== undefined || period !== undefined || scope !== undefined)
  )
    throw new AwardCommandError(
      '--week est réservé au Rising Star historique. Utiliser --type et --period pour les autres récompenses.',
    );
  if ((period !== undefined || scope !== undefined) && !type?.success)
    throw new AwardCommandError('--period et --scope exigent --type.');
  try {
    if (type?.success && typeof period === 'string') awardPeriod(type.data, period);
    if (type?.success && typeof scope === 'string') awardScope(type.data, scope);
  } catch {
    throw new AwardCommandError('Période ou catégorie incompatible avec le type de récompense.');
  }
  return {
    mode: 'assign',
    dryRun: options.has('--dry-run'),
    ...(typeof week === 'string' ? { week } : {}),
    ...(type?.success ? { type: type.data } : {}),
    ...(typeof period === 'string' ? { period } : {}),
    ...(typeof scope === 'string' ? { scope } : {}),
  };
}
