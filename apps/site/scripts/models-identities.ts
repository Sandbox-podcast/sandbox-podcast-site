import { readFileSync, writeFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { closeDb, getDb } from '../src/db/client.ts';
import { modelIdentityAudit } from '../src/domain/model-identity-audit.ts';
import { modelIdentityAuditQuery } from '../src/lib/model-identity-audit.ts';

const args = process.argv.slice(2);
try {
  const input = args.find((arg) => arg.startsWith('--file='))?.slice(7);
  const output = args.find((arg) => arg.startsWith('--output='))?.slice(9);
  const rows: unknown = input
    ? JSON.parse(readFileSync(input, 'utf8'))
    : (await getDb().execute(sql.raw(modelIdentityAuditQuery))).rows;
  const report = { generatedAt: new Date().toISOString(), conflicts: modelIdentityAudit(rows) };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (output) writeFileSync(output, serialized, { encoding: 'utf8', flag: 'wx' });
  else console.log(serialized);
  if (report.conflicts.length) process.exitCode = 2;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Diagnostic Models indisponible.');
  process.exitCode = 1;
} finally {
  await closeDb();
}
