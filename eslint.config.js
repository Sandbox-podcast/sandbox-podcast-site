import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.next/**',
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
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['videos/jingle-runtime.js', 'videos/*-jingle/config.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        URLSearchParams: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
      },
    },
  },
  {
    files: ['videos/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    files: ['videos/render-jingles.mjs', 'videos/sandbox-intro/scripts/playback-check.mjs'],
    languageOptions: {
      // Ces scripts Node exécutent aussi des fonctions dans Chromium avec page.evaluate.
      globals: { window: 'readonly', document: 'readonly' },
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
