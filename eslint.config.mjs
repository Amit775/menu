import nx from '@nx/eslint-plugin';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import tseslint from 'typescript-eslint';
import boundaries from './tools/eslint/module-boundaries.json' with { type: 'json' };
// Module boundaries are generated from tools/eslint/module-boundaries.json so
// that generators (e.g. the `domain` generator) can add constraints safely.
const depConstraints = [
  ...Object.entries(boundaries.platforms).map(([sourceTag, rule]) => ({
    sourceTag,
    onlyDependOnLibsWithTags: rule.allow,
    bannedExternalImports: rule.bannedExternalImports,
  })),
  ...Object.entries(boundaries.types).map(([sourceTag, allow]) => ({
    sourceTag,
    onlyDependOnLibsWithTags: allow,
  })),
  // Apps compose domains; libraries never import across domains.
  { sourceTag: 'scope:app', onlyDependOnLibsWithTags: ['*'] },
  { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
  ...boundaries.domains.map((domain) => ({
    sourceTag: `scope:${domain}`,
    onlyDependOnLibsWithTags: [`scope:${domain}`, 'scope:shared'],
  })),
];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  eslintComments.recommended,
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/coverage',
      '**/generated',
      '**/vitest.config.*.timestamp*',
      '**/files/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          banTransitiveDependencies: true,
          checkNestedExternalImports: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints,
        },
      ],
    },
  },
  {
    rules: {
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/disable-enable-pair': 'error',
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  // Type-aware rules for all TypeScript sources.
  ...[...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked].map(
    (config) => ({ ...config, files: ['**/*.ts', '**/*.mts', '**/*.cts'] }),
  ),
  {
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Conflicts with noPropertyAccessFromIndexSignature in tsconfig.base.json.
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  // Libraries expose named exports only, through src/index.ts.
  {
    files: ['**/src/lib/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports in libraries.',
        },
      ],
    },
  },
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  // Every project must carry valid platform/scope/type tags (tools/eslint-rules).
  {
    files: ['**/project.json'],
    rules: {
      '@nx/workspace-require-project-tags': 'error',
    },
  },
];
