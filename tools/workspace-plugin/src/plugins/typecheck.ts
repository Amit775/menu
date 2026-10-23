import {
  type CreateNodes,
  type CreateNodesFunction,
  createNodesFromFiles,
  readJsonFile,
} from '@nx/devkit';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Infers a cached `typecheck` target for every project that has a tsconfig.json.
 * Angular projects use `ngc` so strict template checking is part of typecheck.
 */
const TSCONFIGS = ['tsconfig.app.json', 'tsconfig.lib.json', 'tsconfig.spec.json'];

const inferTypecheck: CreateNodesFunction = (configFiles, options, context) =>
  createNodesFromFiles(
    (configFile) => {
      const projectRoot = dirname(configFile);
      const absoluteRoot = join(context.workspaceRoot, projectRoot);
      if (projectRoot === '.' || !existsSync(join(absoluteRoot, 'project.json'))) {
        return {};
      }
      const tsconfig = readJsonFile<{ angularCompilerOptions?: unknown }>(
        join(context.workspaceRoot, configFile),
      );
      const isAngular = tsconfig.angularCompilerOptions !== undefined;
      const present = TSCONFIGS.filter((name) => existsSync(join(absoluteRoot, name)));
      // Projects such as e2e suites only have a tsconfig.json.
      const configs = present.length > 0 ? present : ['tsconfig.json'];
      const commands = configs.map((name) =>
        isAngular && name !== 'tsconfig.spec.json'
          ? `ngc -p ${name} --noEmit`
          : `tsc -p ${name} --noEmit`,
      );
      return {
        projects: {
          [projectRoot]: {
            targets: {
              typecheck: {
                executor: 'nx:run-commands',
                cache: true,
                inputs: ['default', '^default', { externalDependencies: ['typescript'] }],
                outputs: [],
                options: { cwd: projectRoot, commands, parallel: false },
                metadata: { description: 'Type-check all sources (ngc for Angular projects).' },
              },
            },
          },
        },
      };
    },
    configFiles,
    options,
    context,
  );

export const createNodes: CreateNodes = ['**/tsconfig.json', inferTypecheck];
