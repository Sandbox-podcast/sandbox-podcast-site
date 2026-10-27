import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

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
      '**/next-env.d.ts',
      '.site-publish/**',
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
