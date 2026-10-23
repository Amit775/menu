import { type Tree } from '@nx/devkit';
import { createMenuTree } from '../../testing/workspace';
import { adrGenerator } from './generator';

describe('adr generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createMenuTree();
  });

  it('numbers ADRs sequentially', async () => {
    tree.write('docs/decisions/0001-stack.md', '# 1. Stack\n');
    await adrGenerator(tree, { title: 'Use Capacitor for mobile' });
    const content = tree.read('docs/decisions/0002-use-capacitor-for-mobile.md', 'utf-8');
    expect(content).toContain('# 0002. Use Capacitor for mobile');
    expect(content).toContain('- Status: proposed');
  });

  it('starts at 0001 in an empty folder', async () => {
    await adrGenerator(tree, { title: 'First' });
    expect(tree.exists('docs/decisions/0001-first.md')).toBe(true);
  });
});
