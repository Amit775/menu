// PreToolUse(Edit|Write|MultiEdit): the guardrail files below define what
// "correct" means. The agent must not loosen them to get a green build.
// To allow edits for a session, set MENU_ALLOW_GUARDRAIL_EDITS=1 in
// .claude/settings.local.json under "env" (a human decision).
import { relative } from 'node:path';
import { block, projectDir, readPayload } from './lib.mjs';

const PROTECTED = [
  /^eslint\.config\.mjs$/,
  /^tools\/eslint\//,
  /^tools\/eslint-rules\//,
  /^tsconfig\.base\.json$/,
  /^commitlint\.config\.mjs$/,
  /^lint-staged\.config\.mjs$/,
  /^\.husky\//,
  /^\.github\/workflows\//,
  /^\.claude\/settings\.json$/,
  /^\.claude\/hooks\//,
];

if (process.env.MENU_ALLOW_GUARDRAIL_EDITS !== '1') {
  const file = readPayload().tool_input?.file_path;
  if (typeof file === 'string') {
    const path = relative(projectDir, file).replaceAll('\\', '/');
    if (PROTECTED.some((pattern) => pattern.test(path))) {
      block(
        `${path} is a guardrail file (lint, types, hooks, CI). Do not change it to make checks pass. ` +
          'Fix the code instead, or stop and ask the user to approve this change.',
      );
    }
  }
}
