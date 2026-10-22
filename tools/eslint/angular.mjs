import nx from '@nx/eslint-plugin';

/**
 * Shared ESLint config for every Angular project (apps/web, libs/web/**).
 * Encodes .claude/rules/angular.md as lint rules wherever a rule exists.
 */
export function angularConfig({ prefix = 'menu' } = {}) {
  return [
    ...nx.configs['flat/angular'],
    ...nx.configs['flat/angular-template'],
    {
      files: ['**/*.ts'],
      rules: {
        '@angular-eslint/component-selector': [
          'error',
          { type: 'element', prefix, style: 'kebab-case' },
        ],
        '@angular-eslint/directive-selector': [
          'error',
          { type: 'attribute', prefix, style: 'camelCase' },
        ],
        '@angular-eslint/prefer-on-push-component-change-detection': 'error',
        '@angular-eslint/prefer-inject': 'error',
        '@angular-eslint/prefer-signals': 'error',
        '@angular-eslint/prefer-signal-model': 'error',
        '@angular-eslint/prefer-standalone': 'error',
        '@angular-eslint/prefer-output-emitter-ref': 'error',
        '@angular-eslint/no-uncalled-signals': 'error',
        '@angular-eslint/use-injectable-provided-in': 'error',
        '@angular-eslint/no-implicit-take-until-destroyed': 'error',
        // Keep code SSR-safe: use DOCUMENT / isPlatformBrowser instead of globals.
        'no-restricted-globals': [
          'error',
          ...['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location'].map(
            (name) => ({
              name,
              message: `Do not use the "${name}" global. Inject DOCUMENT (or a token) and guard with isPlatformBrowser so the code stays SSR- and Capacitor-safe.`,
            }),
          ),
        ],
      },
    },
    {
      files: ['**/*.html'],
      rules: {
        '@angular-eslint/template/prefer-control-flow': 'error',
        '@angular-eslint/template/prefer-self-closing-tags': 'error',
        '@angular-eslint/template/prefer-ngsrc': 'error',
        '@angular-eslint/template/button-has-type': 'error',
        '@angular-eslint/template/eqeqeq': 'error',
        '@angular-eslint/template/no-any': 'error',
        '@angular-eslint/template/prefer-at-empty': 'error',
      },
    },
  ];
}
