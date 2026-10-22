import { formatFiles, generateFiles, type Tree } from '@nx/devkit';
import { join } from 'node:path';
import {
  addExport,
  assertDomain,
  CONTRACTS_ROOT,
  contractExists,
  resourceNames,
  toKebab,
} from '../../utils/workspace';
import { type ContractGeneratorSchema } from './schema';

export async function contractGenerator(
  tree: Tree,
  options: ContractGeneratorSchema,
): Promise<void> {
  const domain = toKebab(options.domain, 'domain');
  const name = toKebab(options.name, 'name');
  assertDomain(tree, domain);
  if (contractExists(tree, domain, name)) {
    throw new Error(`Contract ${domain}/${name} already exists.`);
  }
  generateFiles(tree, join(__dirname, 'files'), `${CONTRACTS_ROOT}/src/lib/${domain}`, {
    ...resourceNames(name),
    template: '',
  });
  addExport(tree, `${CONTRACTS_ROOT}/src/index.ts`, `./lib/${domain}/${name}.contract`);
  await formatFiles(tree);
}

export default contractGenerator;
