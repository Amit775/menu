import { readProjectConfiguration, type Tree } from '@nx/devkit';
import { createMenuTree } from '../../testing/workspace';
import { uiLibGenerator } from './generator';

describe('ui-lib generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createMenuTree(['reviews']);
  });

  it('creates a tagged ui project with an empty public API', async () => {
    await uiLibGenerator(tree, { domain: 'reviews' });
    expect(readProjectConfiguration(tree, 'web-reviews-ui').tags).toEqual([
      'platform:web',
      'scope:reviews',
      'type:ui',
    ]);
    expect(tree.read('libs/web/reviews/ui/src/index.ts', 'utf-8')).toBe('export {};\n');
  });

  it('supports libs/web/shared/ui', async () => {
    await uiLibGenerator(tree, { domain: 'shared' });
    expect(readProjectConfiguration(tree, 'web-shared-ui').tags).toContain('scope:shared');
  });
});
