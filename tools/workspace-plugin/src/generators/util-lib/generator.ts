import { formatFiles, joinPathFragments, type Tree } from '@nx/devkit';
import { libraryGenerator } from '@nx/js';
import { createAngularLib, projectExists } from '../../utils/angular-lib';
import { createNestLib } from '../../utils/nest-lib';
import { assertDomain, type Platform, tagsFor, toKebab } from '../../utils/workspace';
import { type UtilLibGeneratorSchema } from './schema';

const PLATFORMS: readonly Platform[] = ['web', 'api', 'shared'];

/**
 * Helpers with no UI and no I/O of their own: pure functions, value types,
 * injectable wrappers. Several per domain are allowed, each named by purpose.
 */
export async function utilLibGenerator(tree: Tree, options: UtilLibGeneratorSchema): Promise<void> {
  const { platform } = options;
  if (!PLATFORMS.includes(platform)) {
    throw new Error(`Unknown platform "${platform}": use web, api or shared.`);
  }
  const domain = toKebab(options.domain, 'domain');
  assertDomain(tree, domain);
  const folder = options.name ? `util-${toKebab(options.name, 'name')}` : 'util';
  const directory = `libs/${platform}/${domain}/${folder}`;
  const projectName = `${platform}-${domain}-${folder}`;
  if (projectExists(tree, projectName)) {
    throw new Error(`Project ${projectName} already exists.`);
  }
  const lib = {
    directory,
    projectName,
    importPath: `@menu/${platform}/${domain}/${folder}`,
    tags: tagsFor(platform, domain, 'util'),
  };

  if (platform === 'web') {
    await createAngularLib(tree, lib);
  } else if (platform === 'api') {
    await createNestLib(tree, lib);
  } else {
    await libraryGenerator(tree, {
      directory,
      name: projectName,
      importPath: lib.importPath,
      tags: lib.tags,
      bundler: 'none',
      unitTestRunner: 'vitest',
      linter: 'eslint',
      strict: true,
      useProjectJson: true,
      skipFormat: true,
      passWithNoTests: true,
    });
    tree.delete(joinPathFragments(directory, 'src/lib'));
    tree.write(joinPathFragments(directory, 'src/index.ts'), 'export {};\n');
  }
  await formatFiles(tree);
}

export default utilLibGenerator;
