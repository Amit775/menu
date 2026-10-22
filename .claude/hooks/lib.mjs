// Shared helpers for Claude Code hooks. Hooks receive a JSON payload on stdin.
import { readFileSync } from 'node:fs';

export function readPayload() {
  try {
    return JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    return {};
  }
}

/** Exit code 2 blocks the tool call (or the stop) and shows stderr to Claude. */
export function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

export const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
