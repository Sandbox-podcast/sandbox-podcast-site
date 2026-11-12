import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readWorkflow = (name: string) =>
  readFileSync(
    new URL(`../../../.github/workflows/${name}.yml`, import.meta.url),
    'utf8',
  ).replaceAll('\r\n', '\n');

describe('regroupement des tâches de classements', () => {
  const charts = readWorkflow('charts-refresh');
  it('sérialise les collectes manuelles et programmées avec le même verrou', () => {
    const refresh = charts.split('\n  refresh:\n')[1]?.split('\n  freshness:\n')[0];
    expect(refresh).toContain('group: charts-collect-publish');
    expect(refresh).toContain('cancel-in-progress: false');
  });
});
