import { formatFiles, type Tree } from '@nx/devkit';
import { createAngularLib, projectExists } from '../../utils/angular-lib';
import { assertDomain, tagsFor, toKebab } from '../../utils/workspace';
import { type UiLibGeneratorSchema } from './schema';

/**
 * Presentational components only: signal inputs/outputs, no injected services.
 * Add components with: pnpm nx g @nx/angular:component libs/web/<domain>/ui/src/lib/<name>/<name>
 */
export async function uiLibGenerator(tree: Tree, options: UiLibGeneratorSchema): Promise<void> {
  const domain = toKebab(options.domain, 'domain');
  assertDomain(tree, domain);
  const projectName = `web-${domain}-ui`;
  if (projectExists(tree, projectName)) {
    throw new Error(`Project ${projectName} already exists.`);
  }
  await createAngularLib(tree, {
    directory: `libs/web/${domain}/ui`,
    projectName,
    importPath: `@menu/web/${domain}/ui`,
    tags: tagsFor('web', domain, 'ui'),
  });
  await formatFiles(tree);
}

export default uiLibGenerator;
