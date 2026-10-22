import { formatFiles, generateFiles, type Tree } from '@nx/devkit';
import { join } from 'node:path';
import { createAngularLib, projectExists } from '../../utils/angular-lib';
import {
  addExport,
  assertContract,
  assertDomain,
  resourceNames,
  tagsFor,
  toKebab,
} from '../../utils/workspace';
import { type DataAccessLibGeneratorSchema } from './schema';

export async function dataAccessLibGenerator(
  tree: Tree,
  options: DataAccessLibGeneratorSchema,
): Promise<void> {
  const domain = toKebab(options.domain, 'domain');
  const name = toKebab(options.name, 'name');
  assertDomain(tree, domain);
  assertContract(tree, domain, name);

  const directory = `libs/web/${domain}/data-access`;
  const projectName = `web-${domain}-data-access`;
  if (!projectExists(tree, projectName)) {
    await createAngularLib(tree, {
      directory,
      projectName,
      importPath: `@menu/web/${domain}/data-access`,
      tags: tagsFor('web', domain, 'data-access'),
    });
  }
  if (tree.exists(`${directory}/src/lib/${name}`)) {
    throw new Error(`${projectName} already has ${name}.`);
  }

  generateFiles(tree, join(__dirname, 'files'), `${directory}/src/lib`, {
    ...resourceNames(name),
    template: '',
  });
  addExport(tree, `${directory}/src/index.ts`, `./lib/${name}/${name}.api-client`);
  addExport(tree, `${directory}/src/index.ts`, `./lib/${name}/${name}.store`);
  await formatFiles(tree);
}

export default dataAccessLibGenerator;
