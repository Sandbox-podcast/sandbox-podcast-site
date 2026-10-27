import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readWorkflow = (name: string) =>
  readFileSync(
    new URL(`../../../.github/workflows/${name}.yml`, import.meta.url),
    'utf8',
  ).replaceAll('\r\n', '\n');

describe('regroupement des tâches de classements', () => {
  const charts = readWorkflow('charts-refresh');
  it('mesure les poussées dans le contrôle quotidien sans masquer un échec', () => {
    const news = readWorkflow('news-refresh');
    const daily = news.split('\n  freshness:\n')[1];
    expect(charts).not.toContain('\n  bursts:\n');
    expect(daily).toContain("if: github.event_name == 'schedule'");
    expect(news).toContain("- cron: '37 3 * * *'");
    expect(charts).not.toContain('\n  freshness:\n');
    expect(charts).not.toContain('23 * * * *');
    expect(daily).toContain('Contrôler les éditions servies aux lecteurs');
    expect(daily).toContain('Mesurer les poussées GitHub');
    expect(daily).toContain("!cancelled() && vars.SANDBOX_CHARTS_BURSTS_ENABLED == 'true'");
    expect(daily).not.toContain('continue-on-error');
    expect(daily?.split('\n  recovery:\n')[0]).not.toContain('needs:');
    expect(daily).toContain('group: charts-collect-publish');
  });
  it('sérialise les collectes manuelles et programmées avec le même verrou', () => {
    const refresh = charts.split('\n  refresh:\n')[1]?.split('\n  freshness:\n')[0];
    expect(refresh).toContain('group: charts-collect-publish');
    expect(refresh).toContain('cancel-in-progress: false');
  });
});
