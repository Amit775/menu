// Stop: Claude cannot finish while format, lint, typecheck or tests are red
// for the projects its changes affect. Exit code 2 sends the failure back.
import { execFileSync, spawnSync } from 'node:child_process';
import { block, projectDir, readPayload } from './lib.mjs';

const payload = readPayload();
if (payload.stop_hook_active) {
  // Already continuing because of this hook; let Claude decide (prevents loops).
  process.exit(0);
}

const git = (...args) =>
  execFileSync('git', args, {
    cwd: projectDir,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();

let base = 'HEAD';
try {
  base = git('merge-base', 'HEAD', 'origin/main');
} catch {
  // No origin/main yet (fresh repo): compare against the last commit.
}

let dirty = '';
let ahead = '';
try {
  dirty = git('status', '--porcelain');
  ahead = base === 'HEAD' ? '' : git('rev-list', `${base}..HEAD`);
} catch {
  process.exit(0);
}
if (!dirty && !ahead) {
  process.exit(0);
}

const steps = [
  ['nx', 'format:check', `--base=${base}`],
  ['nx', 'affected', '-t', 'lint', 'typecheck', 'test', `--base=${base}`, '--outputStyle=static'],
];
for (const args of steps) {
  const result = spawnSync('pnpm', args, { cwd: projectDir, encoding: 'utf-8' });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().split('\n');
    block(
      `Checks failed: pnpm ${args.join(' ')}\n` +
        `${output.slice(-80).join('\n')}\n\n` +
        'Fix these before finishing. Do not weaken lint, tsconfig or tests to get green.',
    );
  }
}
