import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { ESLintUtils } from '@typescript-eslint/utils';

// Available in ESLint configs as "@nx/workspace-require-project-tags".
export const RULE_NAME = 'require-project-tags';

interface Boundaries {
  domains: string[];
  platforms: Record<string, unknown>;
  types: Record<string, unknown>;
}

export interface TagRules {
  platforms: string[];
  scopes: string[];
  types: string[];
}

export function loadTagRules(root = workspaceRoot): TagRules {
  const boundaries = JSON.parse(
    readFileSync(join(root, 'tools/eslint/module-boundaries.json'), 'utf-8'),
  ) as Boundaries;
  return {
    platforms: Object.keys(boundaries.platforms),
    scopes: ['scope:app', 'scope:shared', ...boundaries.domains.map((d) => `scope:${d}`)],
    types: Object.keys(boundaries.types),
  };
}

/** Returns a problem description, or undefined when the tags are valid. */
export function checkTags(tags: unknown, rules: TagRules): string | undefined {
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    return 'Every project needs a "tags" array with one platform:*, one scope:* and one type:* tag.';
  }
  const groups: [string, string[]][] = [
    ['platform', rules.platforms],
    ['scope', rules.scopes],
    ['type', rules.types],
  ];
  for (const [prefix, allowed] of groups) {
    const matching = (tags as string[]).filter((tag) => tag.startsWith(`${prefix}:`));
    if (matching.length !== 1) {
      return `Expected exactly one ${prefix}:* tag, found ${String(matching.length)}.`;
    }
    const [tag] = matching;
    if (tag !== undefined && !allowed.includes(tag)) {
      const hint =
        prefix === 'scope'
          ? ' Register new domains with: pnpm nx g @menu/workspace-plugin:domain <name>'
          : '';
      return `Unknown tag "${tag}". Allowed: ${allowed.join(', ')}.${hint}`;
    }
  }
  return undefined;
}

export const rule = ESLintUtils.RuleCreator(
  () => 'https://github.com/Amit775/menu/blob/main/.claude/rules/architecture.md',
)({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every project.json to carry valid platform, scope and type tags so module boundaries apply.',
    },
    schema: [],
    messages: { invalidTags: '{{problem}}' },
    defaultOptions: [],
  },
  create(context) {
    if (!context.filename.endsWith('project.json')) {
      return {};
    }
    return {
      Program(node): void {
        let tags: unknown;
        try {
          tags = (JSON.parse(context.sourceCode.text) as { tags?: unknown }).tags;
        } catch {
          return;
        }
        const problem = checkTags(tags, loadTagRules());
        if (problem) {
          context.report({ node, messageId: 'invalidTags', data: { problem } });
        }
      },
    };
  },
});
