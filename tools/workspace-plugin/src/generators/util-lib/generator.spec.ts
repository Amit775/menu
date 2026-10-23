import { readProjectConfiguration, type Tree } from '@nx/devkit';
import { createMenuTree } from '../../testing/workspace';
import { utilLibGenerator } from './generator';

describe('util-lib generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createMenuTree(['reviews']);
  });

  it('creates a tagged web util lib named after its purpose', async () => {
    await utilLibGenerator(tree, { platform: 'web', domain: 'shared', name: 'i18n' });
    const project = readProjectConfiguration(tree, 'web-shared-util-i18n');
    expect(project.root).toBe('libs/web/shared/util-i18n');
    expect(project.tags).toEqual(['platform:web', 'scope:shared', 'type:util']);
    expect(tree.read('libs/web/shared/util-i18n/src/index.ts', 'utf-8')).toBe('export {};\n');
    expect(tree.read('libs/web/shared/util-i18n/eslint.config.mjs', 'utf-8')).toContain(
      'angularConfig()',
    );
  });

  it('creates an api util lib with CommonJS output for the Nest build', async () => {
    await utilLibGenerator(tree, { platform: 'api', domain: 'shared', name: 'auth' });
    expect(readProjectConfiguration(tree, 'api-shared-util-auth').tags).toEqual([
      'platform:api',
      'scope:shared',
      'type:util',
    ]);
    expect(tree.read('libs/api/shared/util-auth/tsconfig.json', 'utf-8')).toContain('commonjs');
  });

  it('creates a framework-free shared util lib', async () => {
    await utilLibGenerator(tree, { platform: 'shared', domain: 'reviews' });
    const project = readProjectConfiguration(tree, 'shared-reviews-util');
    expect(project.root).toBe('libs/shared/reviews/util');
    expect(project.tags).toEqual(['platform:shared', 'scope:reviews', 'type:util']);
  });

  it('registers the import path', async () => {
    await utilLibGenerator(tree, { platform: 'web', domain: 'reviews', name: 'format' });
    const paths = (
      JSON.parse(tree.read('tsconfig.base.json', 'utf-8') ?? '{}') as {
        compilerOptions: { paths: Record<string, string[]> };
      }
    ).compilerOptions.paths;
    expect(paths['@menu/web/reviews/util-format']).toEqual([
      './libs/web/reviews/util-format/src/index.ts',
    ]);
  });

  it('rejects an unregistered domain', async () => {
    await expect(
      utilLibGenerator(tree, { platform: 'web', domain: 'nope', name: 'x' }),
    ).rejects.toThrow(/Unknown domain/);
  });

  it('rejects an unknown platform', async () => {
    await expect(
      utilLibGenerator(tree, { platform: 'ios' as 'web', domain: 'shared' }),
    ).rejects.toThrow(/platform/);
  });
});
