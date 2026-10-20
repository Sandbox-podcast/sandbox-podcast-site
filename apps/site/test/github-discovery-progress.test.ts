import { describe, expect, it } from 'vitest';
import {
  initialGithubDiscoveryCursor,
  githubDiscoveryCursorDetails,
  readGithubDiscoveryCursor,
  GITHUB_DISCOVERY_CURSOR_PREFIX,
} from '../src/domain/github-discovery-progress.ts';
describe('validation du checkpoint découverte', () => {
  const date = '2026-10-20';
  const queries = ['first', 'second'];
  const initial = initialGithubDiscoveryCursor(date, queries);
  it.each([
    null,
    ['unrelated warning'],
    [GITHUB_DISCOVERY_CURSOR_PREFIX + '{broken'],
    githubDiscoveryCursorDetails([], { ...initial, date: '2026-10-19', page: 2 }),
    githubDiscoveryCursorDetails([], { ...initial, planHash: '0'.repeat(64), page: 2 }),
    githubDiscoveryCursorDetails([], { ...initial, queryIndex: 3 }),
    githubDiscoveryCursorDetails([], { ...initial, queryIndex: 2, page: 2 }),
  ])('repart du premier point borné si les données sont incompatibles : %j', (details) => {
    expect(readGithubDiscoveryCursor(details, date, queries)).toEqual(initial);
  });
  it('garde un unique marker avec les avertissements puis accepte la fin réelle', () => {
    const details = githubDiscoveryCursorDetails(['warning'], { ...initial, page: 2 });
    const completed = { ...initial, queryIndex: 2 };
    const final = githubDiscoveryCursorDetails(details, completed);
    expect(final.filter((line) => line.startsWith(GITHUB_DISCOVERY_CURSOR_PREFIX))).toHaveLength(1);
    expect(final).toContain('warning');
    expect(readGithubDiscoveryCursor(final, date, queries)).toEqual(completed);
  });
});
