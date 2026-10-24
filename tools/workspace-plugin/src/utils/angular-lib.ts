import { joinPathFragments, readProjectConfiguration, type Tree, updateJson } from '@nx/devkit';
import { libraryGenerator } from '@nx/angular/generators';

type LibrarySchema = Parameters<typeof libraryGenerator>[1];

export interface AngularLibOptions {
  directory: string;
  projectName: string;
  importPath: string;
  tags: string;
  /** Add a lazy route for this lib to the given routes file. */
  parentRoutes?: string;
}

/** True when the Nx project already exists in the tree. */
export function projectExists(tree: Tree, projectName: string): boolean {
  try {
    readProjectConfiguration(tree, projectName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates an Angular library with Nx, then normalizes it to workspace conventions:
 * shared ESLint config, strict Angular compiler options, and an empty src/lib.
 */
export async function createAngularLib(tree: Tree, options: AngularLibOptions): Promise<void> {
  await libraryGenerator(tree, {
    directory: options.directory,
    name: options.projectName,
    importPath: options.importPath,
    tags: options.tags,
    prefix: 'menu',
    style: 'scss',
    standalone: true,
    // Without it @nx/angular records `strict: false` as a workspace default in nx.json.
    strict: true,
    skipModule: true,
    // Non-buildable libs use the AnalogJS Vitest setup.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- @nx/angular does not export its UnitTestRunner enum
    unitTestRunner: 'vitest-analog' as NonNullable<LibrarySchema['unitTestRunner']>,
    linter: 'eslint',
    skipFormat: true,
    ...(options.parentRoutes
      ? { routing: true, lazy: true, parent: options.parentRoutes }
      : { routing: false }),
  });

  const root = options.directory;
  const depth = root.split('/').length;
  const up = '../'.repeat(depth);

  tree.write(
    joinPathFragments(root, 'eslint.config.mjs'),
    [
      `import baseConfig from '${up}eslint.config.mjs';`,
      `import { angularConfig } from '${up}tools/eslint/angular.mjs';`,
      '',
      'export default [...baseConfig, ...angularConfig()];',
      '',
    ].join('\n'),
  );

  updateJson(tree, joinPathFragments(root, 'tsconfig.json'), (json: Record<string, unknown>) => {
    json['angularCompilerOptions'] = {
      enableI18nLegacyMessageIdFormat: false,
      strictInjectionParameters: true,
      strictInputAccessModifiers: true,
      strictTemplates: true,
      strictStandalone: true,
      extendedDiagnostics: { defaultCategory: 'error' },
    };
    return json;
  });

  const viteConfig = joinPathFragments(root, 'vite.config.mts');
  if (tree.exists(viteConfig)) {
    const content = tree.read(viteConfig, 'utf-8') ?? '';
    tree.write(
      viteConfig,
      content
        .replace(/\s*\/\/ Uncomment this if you are using workers\.\n(\s*\/\/.*\n)+/, '\n')
        .replace("reporters: ['default'],", "reporters: ['default'],\n    passWithNoTests: true,"),
    );
  }

  tree.write(
    joinPathFragments(root, 'src/test-setup.ts'),
    [
      "import '@angular/compiler';",
      "import '@analogjs/vitest-angular/setup-snapshots';",
      "import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';",
      "import { provideI18n } from '@menu/web/shared/util-i18n';",
      '',
      'setupTestBed({ providers: [provideI18n()] });',
      '',
    ].join('\n'),
  );

  tree.delete(joinPathFragments(root, 'src/lib'));
  tree.write(joinPathFragments(root, 'src/index.ts'), 'export {};\n');
}
