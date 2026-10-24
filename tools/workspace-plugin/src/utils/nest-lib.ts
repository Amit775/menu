import { joinPathFragments, type Tree, updateJson } from '@nx/devkit';
import { libraryGenerator } from '@nx/nest';

export interface NestLibOptions {
  directory: string;
  projectName: string;
  importPath: string;
  tags: string;
}

export async function createNestLib(tree: Tree, options: NestLibOptions): Promise<void> {
  const { directory } = options;
  await libraryGenerator(tree, {
    directory,
    name: options.projectName,
    importPath: options.importPath,
    tags: options.tags,
    unitTestRunner: 'vitest',
    strict: true,
    skipFormat: true,
  });
  updateJson(
    tree,
    joinPathFragments(directory, 'tsconfig.json'),
    (json: Record<string, unknown>) => {
      json['compilerOptions'] = { module: 'commonjs' };
      return json;
    },
  );
  const specConfig = joinPathFragments(directory, 'tsconfig.spec.json');
  if (tree.exists(specConfig)) {
    updateJson(tree, specConfig, (json: { compilerOptions?: Record<string, unknown> }) => {
      json.compilerOptions = { ...json.compilerOptions, module: 'esnext' };
      return json;
    });
  }
  tree.delete(joinPathFragments(directory, 'src/lib'));
  tree.write(joinPathFragments(directory, 'src/index.ts'), 'export {};\n');
}
