import { closeDb, hasDatabaseConfiguration } from '../src/db/client.ts';
import { AwardCommandError, parseAwardCommand } from '../src/domain/badges-cli.ts';
import { assignClosedRisingStars, withdrawBadgeAward } from '../src/lib/badges-store.ts';
import { runAllBadgeAwards } from '../src/pipeline/badges-jobs.ts';
import { assignClosedAwards, withdrawPublicAward } from '../src/lib/awards-store.ts';

try {
  const command = parseAwardCommand(process.argv.slice(2));
  if (command.mode === 'help') {
    console.log(`Sandbox Badges & Awards - exploitation
  --dry-run : simuler toutes les attributions sans écriture
  sans option : attribuer toutes les périodes closes éligibles
  --type=TYPE [--period=PERIODE] [--scope=CATEGORIE] [--dry-run] : filtrer
  Types : rising-star, github-category, biggest-mover, rookie-month, skill-week, best-model, annual
  Période : AAAA-Wnn (semaine), AAAA-MM (rookie-month), AAAA (annual)
  Scope : catégorie GitHub pour github-category, github/rising/skills/models pour annual
  --week=AAAA-Wnn : compatibilité Rising Star historique
  --withdraw --id=UUID --reason="Motif public détaillé" --actor="Opérateur" : retirer une attribution
  --withdraw --week=AAAA-Wnn --reason="Motif public détaillé" --actor="Opérateur" : retirer
Une base autorisée avec les migrations 0012 et 0013 est nécessaire. Le retrait ne prend pas --dry-run.`);
  } else if (!hasDatabaseConfiguration()) {
    throw new AwardCommandError('DATABASE_URL ou POSTGRES_URL requis. Aucune action exécutée.');
  } else if (command.mode === 'withdraw') {
    console.log(
      JSON.stringify({
        withdrawn: await withdrawBadgeAward(command.week, command.reason, command.actor),
      }),
    );
  } else if (command.mode === 'withdraw-id') {
    console.log(
      JSON.stringify({
        withdrawn: await withdrawPublicAward(command.id, command.reason, command.actor),
      }),
    );
  } else {
    const options = command.week
      ? { type: 'rising-star' as const, period: command.week }
      : {
          ...(command.type ? { type: command.type } : {}),
          ...(command.period ? { period: command.period } : {}),
          ...(command.scope !== undefined ? { scope: command.scope } : {}),
        };
    const result = command.dryRun
      ? {
          rising:
            !options.type || options.type === 'rising-star'
              ? await assignClosedRisingStars({
                  dryRun: true,
                  ...(options.period ? { week: options.period } : {}),
                })
              : null,
          awards:
            options.type !== 'rising-star'
              ? await assignClosedAwards({ ...options, dryRun: true })
              : null,
        }
      : await runAllBadgeAwards(options);
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(
    error instanceof AwardCommandError
      ? error.message
      : error instanceof Error
        ? error.name
        : 'Attribution indisponible.',
  );
  process.exitCode = 1;
} finally {
  await closeDb();
}
