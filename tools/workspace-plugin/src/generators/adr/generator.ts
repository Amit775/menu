import { formatFiles, generateFiles, names, type Tree } from '@nx/devkit';
import { join } from 'node:path';
import { type AdrGeneratorSchema } from './schema';

export const DECISIONS_DIR = 'docs/decisions';

export function nextAdrNumber(tree: Tree): string {
  const numbers = tree.exists(DECISIONS_DIR)
    ? tree
        .children(DECISIONS_DIR)
        .map((file) => /^(\d{4})-/.exec(file)?.[1])
        .filter((n): n is string => n !== undefined)
        .map(Number)
    : [];
  return String(Math.max(0, ...numbers) + 1).padStart(4, '0');
}

export async function adrGenerator(tree: Tree, options: AdrGeneratorSchema): Promise<void> {
  const title = options.title.trim();
  if (!title) {
    throw new Error('An ADR needs a title.');
  }
  const number = nextAdrNumber(tree);
  generateFiles(tree, join(__dirname, 'files'), DECISIONS_DIR, {
    number,
    title,
    fileName: `${number}-${names(title).fileName.replace(/[^a-z0-9-]/g, '')}`,
    date: new Date().toISOString().slice(0, 10),
    template: '',
  });
  await formatFiles(tree);
}

export default adrGenerator;
