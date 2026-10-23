import { readProjectConfiguration, type Tree } from '@nx/devkit';
import { createMenuTree } from '../../testing/workspace';
import { featureLibGenerator } from './generator';

describe('feature-lib generator', () => {
  let tree: Tree;

  beforeAll(async () => {
    tree = createMenuTree(['reviews']);
    await featureLibGenerator(tree, { domain: 'reviews', name: 'browse' });
  });

  it('creates a tagged project', () => {
    const project = readProjectConfiguration(tree, 'web-reviews-feature-browse');
    expect(project.root).toBe('libs/web/reviews/feature-browse');
    expect(project.tags).toEqual(['platform:web', 'scope:reviews', 'type:feature']);
  });

  it('generates an OnPush page and its routes', () => {
    const page = tree.read(
      'libs/web/reviews/feature-browse/src/lib/reviews-browse-page/reviews-browse-page.ts',
      'utf-8',
    );
    expect(page).toContain('ChangeDetectionStrategy.OnPush');
    expect(page).toContain('export class ReviewsBrowsePage');
    expect(tree.read('libs/web/reviews/feature-browse/src/index.ts', 'utf-8')).toBe(
      "export * from './lib/lib.routes';\n",
    );
  });

  it('registers a lazy route at <domain>/<name>', () => {
    const routes = tree.read('apps/web/src/app/app.routes.ts', 'utf-8');
    expect(routes).toContain("path: 'reviews/browse'");
    expect(routes).toContain("import('@menu/web/reviews/feature-browse')");
  });

  it('uses the shared Angular ESLint config', () => {
    expect(tree.read('libs/web/reviews/feature-browse/eslint.config.mjs', 'utf-8')).toContain(
      "from '../../../../tools/eslint/angular.mjs'",
    );
  });

  it('refuses an unregistered domain', async () => {
    await expect(featureLibGenerator(tree, { domain: 'nope', name: 'x' })).rejects.toThrow(
      /Register it first/,
    );
  });
});
