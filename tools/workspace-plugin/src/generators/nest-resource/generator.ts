import { formatFiles, generateFiles, type Tree } from '@nx/devkit';
import { join } from 'node:path';
import { projectExists } from '../../utils/angular-lib';
import { createNestLib } from '../../utils/nest-lib';
import {
  addExport,
  API_APP_MODULE,
  assertContract,
  assertDomain,
  type LibType,
  PRISMA_SCHEMA,
  resourceNames,
  tagsFor,
  toKebab,
} from '../../utils/workspace';
import { type NestResourceGeneratorSchema } from './schema';

async function ensureNestLib(tree: Tree, domain: string, type: LibType): Promise<string> {
  const directory = `libs/api/${domain}/${type}`;
  const projectName = `api-${domain}-${type}`;
  if (!projectExists(tree, projectName)) {
    await createNestLib(tree, {
      directory,
      projectName,
      importPath: `@menu/api/${domain}/${type}`,
      tags: tagsFor('api', domain, type),
    });
  }
  return directory;
}

function addPrismaModel(tree: Tree, className: string, fileName: string): void {
  const schema = tree.read(PRISMA_SCHEMA, 'utf-8') ?? '';
  if (new RegExp(`^model ${className} \\{`, 'm').test(schema)) {
    return;
  }
  const model = [
    `model ${className} {`,
    '  id        String   @id @default(uuid()) @db.Uuid',
    '  createdAt DateTime @default(now()) @map("created_at")',
    '',
    `  @@map("${fileName.replace(/-/g, '_')}")`,
    '}',
  ].join('\n');
  tree.write(PRISMA_SCHEMA, `${schema.trimEnd()}\n\n${model}\n`);
}

function registerInAppModule(tree: Tree, className: string, domain: string): void {
  if (!tree.exists(API_APP_MODULE)) {
    return;
  }
  const source = tree.read(API_APP_MODULE, 'utf-8') ?? '';
  const moduleName = `${className}Module`;
  if (source.includes(moduleName)) {
    return;
  }
  const importLine = `import { ${moduleName} } from '@menu/api/${domain}/feature';\n`;
  const lastImport = source.lastIndexOf('\nimport ');
  const insertAt = source.indexOf('\n', lastImport + 1) + 1;
  const withImport = source.slice(0, insertAt) + importLine + source.slice(insertAt);
  tree.write(API_APP_MODULE, withImport.replace(/imports: \[/, `imports: [${moduleName}, `));
}

export async function nestResourceGenerator(
  tree: Tree,
  options: NestResourceGeneratorSchema,
): Promise<void> {
  const domain = toKebab(options.domain, 'domain');
  const name = toKebab(options.name, 'name');
  assertDomain(tree, domain);
  assertContract(tree, domain, name);
  const n = resourceNames(name);

  const featureDir = await ensureNestLib(tree, domain, 'feature');
  const dataAccessDir = await ensureNestLib(tree, domain, 'data-access');
  if (tree.exists(`${featureDir}/src/lib/${name}`)) {
    throw new Error(`api-${domain}-feature already has ${name}.`);
  }

  const substitutions = { ...n, domain, template: '' };
  generateFiles(tree, join(__dirname, 'files/feature'), `${featureDir}/src/lib`, substitutions);
  generateFiles(
    tree,
    join(__dirname, 'files/data-access'),
    `${dataAccessDir}/src/lib`,
    substitutions,
  );
  addExport(tree, `${featureDir}/src/index.ts`, `./lib/${name}/${name}.module`);
  addExport(tree, `${dataAccessDir}/src/index.ts`, `./lib/${name}/${name}.repository`);

  addPrismaModel(tree, n.className, n.fileName);
  registerInAppModule(tree, n.className, domain);
  await formatFiles(tree);
}

export default nestResourceGenerator;
