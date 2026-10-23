// SessionStart: make fresh clones, worktrees and cloud sessions ready to run checks.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectDir } from './lib.mjs';

if (!existsSync(join(projectDir, 'node_modules'))) {
  spawnSync('pnpm', ['install', '--frozen-lockfile'], { cwd: projectDir, stdio: 'ignore' });
}
spawnSync('pnpm', ['nx', 'run', 'api-shared-db:prisma-generate'], {
  cwd: projectDir,
  stdio: 'ignore',
});
