// PreToolUse(Bash): block commands that skip or destroy the safety net.
import { block, readPayload } from './lib.mjs';

const command = String(readPayload().tool_input?.command ?? '');

const RULES = [
  [/--no-verify\b/, 'Do not skip git hooks (--no-verify). Fix what the hook reports.'],
  [/\bHUSKY=0\b/, 'Do not disable Husky. Fix what the hook reports.'],
  [/\bgit\s+commit\b[^|;&]*\s-n\b/, 'Do not skip git hooks (git commit -n).'],
  [/\bgit\s+push\b[^|;&]*(\s--force(?!-with-lease)\b|\s-f\b)/, 'Force push is not allowed.'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard discards work. Ask the user first.'],
  [/\bprisma\s+migrate\s+reset\b/, 'prisma migrate reset wipes the database. Ask the user first.'],
  [/\brm\s+-[a-z]*r[a-z]*f?\s+(\/|~|\$HOME)(\s|$)/, 'Refusing to delete a root or home directory.'],
];

for (const [pattern, reason] of RULES) {
  if (pattern.test(command)) {
    block(`Blocked: ${reason}`);
  }
}
