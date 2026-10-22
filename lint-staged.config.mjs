// Fast, file-level checks on commit. The full gate (lint, typecheck, test via
// `nx affected`) runs in the Claude Code Stop hook and in CI.
export default {
  '*.{ts,mts,cts,js,mjs,cjs,html,scss,css,json,md,yml,yaml}': 'prettier --write',
};
