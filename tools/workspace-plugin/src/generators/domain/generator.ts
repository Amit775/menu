import { formatFiles, type Tree } from '@nx/devkit';
import { registerDomain, toKebab } from '../../utils/workspace';
import { contractGenerator } from '../contract/generator';
import { dataAccessLibGenerator } from '../data-access-lib/generator';
import { featureLibGenerator } from '../feature-lib/generator';
import { nestResourceGenerator } from '../nest-resource/generator';
import { uiLibGenerator } from '../ui-lib/generator';
import { type DomainGeneratorSchema } from './schema';

export async function domainGenerator(tree: Tree, options: DomainGeneratorSchema): Promise<void> {
  const domain = toKebab(options.name, 'domain');
  if (domain === 'shared') {
    throw new Error('"shared" is reserved for cross-domain libraries.');
  }
  registerDomain(tree, domain);

  if (options.resource) {
    const name = toKebab(options.resource, 'resource');
    await contractGenerator(tree, { domain, name });
    await nestResourceGenerator(tree, { domain, name });
    await dataAccessLibGenerator(tree, { domain, name });
    await uiLibGenerator(tree, { domain });
    await featureLibGenerator(tree, { domain, name, path: domain });
  }
  await formatFiles(tree);
}

export default domainGenerator;
