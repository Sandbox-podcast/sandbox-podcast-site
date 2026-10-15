import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';
import { log, error } from 'node:console';
import { auditSitemap } from '../src/lib/sitemap-audit.ts';

const [origin, output, ...extra] = process.argv.slice(2);
if (!origin || extra.length) {
  error('Usage : pnpm --filter @podcast/site sitemap:check <origine> [rapport.json]');
  process.exitCode = 1;
} else {
  try {
    const report = await auditSitemap(origin);
    if (output) {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    }
    log(
      `${String(report.passed)}/${String(report.total)} URL valides (HTTP 200, robots, canonical).`,
    );
    for (const page of report.pages.filter((page) => page.issues.length > 0))
      error(`${page.url} : ${page.issues.join('; ')}`);
    if (report.failed) process.exitCode = 1;
  } catch (failure) {
    error(failure instanceof Error ? failure.message : 'Contrôle du sitemap impossible.');
    process.exitCode = 1;
  }
}
