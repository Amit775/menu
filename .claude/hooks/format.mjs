// PostToolUse(Edit|Write|MultiEdit): format the edited file with Prettier so
// formatting never comes up in conversation. Never blocks.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { projectDir, readPayload } from './lib.mjs';

const file = readPayload().tool_input?.file_path;
if (typeof file === 'string' && existsSync(file)) {
  spawnSync(
    'pnpm',
    ['exec', 'prettier', '--write', '--ignore-unknown', '--log-level', 'silent', file],
    {
      cwd: projectDir,
      stdio: 'ignore',
    },
  );
}
