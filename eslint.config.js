import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  requestAnimationFrame: 'readonly',
  performance: 'readonly',
  URLSearchParams: 'readonly',
};
const scriptGlobals = { process: 'readonly', console: 'readonly', Buffer: 'readonly' };

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.next/**',
      // Captures et compilations Next générées par les tests navigateur locaux.
      '**/.local/**',
      // Dépendances Python locales ; les sources de l'agent restent contrôlées.
      'tools/youtube-growth/.venv/**',
      '**/next-env.d.ts',
      '.site-publish/**',
      // Archive du travail sur la plateforme vidéo : plus dans l'espace de travail pnpm, hors des contrôles.
      'old/**',
      // Brouillons locaux hors du dépôt.
      'scripts/_tmp-*/**',
      'scripts/_tmp-*',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['videos/**/*.js'],
    languageOptions: { globals: browserGlobals },
  },
  {
    // Les scripts Node sérialisent aussi des callbacks exécutés par Playwright.
    files: ['videos/**/*.mjs'],
    languageOptions: { globals: { ...scriptGlobals, ...browserGlobals } },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...scriptGlobals,
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    files: ['apps/site/**/*.{ts,tsx}'],
    rules: {
      // Les rangs et les métriques numériques sont des chaînes légitimes dans les vues et exports.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['apps/site/test/**/*.ts'],
    rules: {
      // Les doublures de test conservent les signatures Promise des interfaces simulées.
      '@typescript-eslint/require-await': 'off',
    },
  },
);
