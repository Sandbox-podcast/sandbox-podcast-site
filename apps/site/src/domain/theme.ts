export const SITE_THEME_STORAGE_KEY = 'sandbox-theme';

export const SITE_THEMES = ['blue', 'red'] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];

export function parseSiteTheme(value: string | null): SiteTheme {
  return value === 'red' ? 'red' : 'blue';
}
