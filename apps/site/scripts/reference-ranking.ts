import { readFileSync, writeFileSync } from 'node:fs';
import { createReferenceArtifact, verifyReferenceArtifact } from '../src/lib/reference-artifact.ts';
import { referenceInputSchema } from '../src/domain/reference-ranking.ts';

const args = process.argv.slice(2);
try {
  const path = args.find((arg) => arg.startsWith('--file='))?.slice(7);
  if (!path)
    throw new Error(
      'Usage : charts:reference audit|replay --file=chemin.json [--output=preuve.json]',
    );
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const artifact =
    args[0] === 'audit'
      ? createReferenceArtifact(referenceInputSchema.parse(raw))
      : args[0] === 'replay'
        ? verifyReferenceArtifact(raw)
        : null;
  if (!artifact) throw new Error('Commande attendue : audit ou replay.');
  const output = args.find((arg) => arg.startsWith('--output='))?.slice(9);
  if (output)
    writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
  console.log(JSON.stringify({ sha256: artifact.sha256, ...artifact.report }, null, 2));
  if (!artifact.report.publishable) process.exitCode = 2;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Rejeu impossible.');
  process.exitCode = 1;
}
