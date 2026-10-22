import nxScopes from '@commitlint/config-nx-scopes';

// Conventional commits. The scope is optional; when present it must be an Nx
// project name or one of the repo-wide scopes below.
const repoScopes = ['repo', 'deps', 'ci', 'claude', 'docs', 'release'];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': (ctx) => [2, 'always', [...nxScopes.utils.getProjects(ctx), ...repoScopes]],
  },
};
