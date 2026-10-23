import { formatFiles, generateFiles, names, type Tree } from '@nx/devkit';
import { join } from 'node:path';
import { createAngularLib, projectExists } from '../../utils/angular-lib';
import { addExport, assertDomain, tagsFor, toKebab, WEB_APP_ROUTES } from '../../utils/workspace';
import { type FeatureLibGeneratorSchema } from './schema';

export async function featureLibGenerator(
  tree: Tree,
  options: FeatureLibGeneratorSchema,
): Promise<void> {
  const domain = toKebab(options.domain, 'domain');
  const name = toKebab(options.name, 'name');
  assertDomain(tree, domain);

  const directory = `libs/web/${domain}/feature-${name}`;
  const projectName = `web-${domain}-feature-${name}`;
  if (projectExists(tree, projectName)) {
    throw new Error(`Project ${projectName} already exists.`);
  }
  const routesName = `${names(projectName).propertyName}Routes`;

  await createAngularLib(tree, {
    directory,
    projectName,
    importPath: `@menu/web/${domain}/feature-${name}`,
    tags: tagsFor('web', domain, 'feature'),
    parentRoutes: WEB_APP_ROUTES,
  });

  const feature = names(`${domain}-${name}`);
  generateFiles(tree, join(__dirname, 'files'), `${directory}/src/lib`, {
    domain,
    name,
    fileName: feature.fileName,
    className: feature.className,
    title: `${names(domain).className} ${name.replace(/-/g, ' ')}`,
    routesName,
    template: '',
  });
  addExport(tree, `${directory}/src/index.ts`, './lib/lib.routes');

  // Nx names the lazy route after the project; use the URL path instead.
  const routes = tree.read(WEB_APP_ROUTES, 'utf-8') ?? '';
  tree.write(
    WEB_APP_ROUTES,
    routes.replace(`path: '${projectName}'`, `path: '${options.path ?? `${domain}/${name}`}'`),
  );

  await formatFiles(tree);
}

export default featureLibGenerator;
