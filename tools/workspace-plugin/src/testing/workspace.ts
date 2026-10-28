import { type Tree, updateJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  API_APP_MODULE,
  BOUNDARIES_PATH,
  CONTRACTS_ROOT,
  PRISMA_SCHEMA,
  WEB_APP_ROUTES,
} from '../utils/workspace';

export function createMenuTree(domains: string[] = []): Tree {
  const tree = createTreeWithEmptyWorkspace();
  // Nx seeds an oxfmt config, and formatFiles then downloads oxfmt on every run, which times specs out in CI.
  tree.delete('.oxfmtrc.json');
  tree.write('.prettierrc', JSON.stringify({ singleQuote: true }));
  updateJson(tree, 'package.json', (json: Record<string, Record<string, string>>) => {
    json['dependencies'] = { '@angular/core': '~22.2.0', '@nestjs/core': '^11.0.0' };
    return json;
  });
  writeJson(tree, BOUNDARIES_PATH, { domains, platforms: {}, types: {} });
  tree.write(`${CONTRACTS_ROOT}/src/index.ts`, "export * from './lib/health/health.contract';\n");
  tree.write(PRISMA_SCHEMA, 'datasource db {\n  provider = "postgresql"\n}\n');
  tree.write(
    API_APP_MODULE,
    [
      "import { Module } from '@nestjs/common';",
      "import { DbModule } from '@menu/api/shared/db';",
      '',
      '@Module({',
      '  imports: [DbModule],',
      '})',
      'export class AppModule {}',
      '',
    ].join('\n'),
  );
  tree.write(
    WEB_APP_ROUTES,
    "import { type Route } from '@angular/router';\n\nexport const appRoutes: Route[] = [];\n",
  );
  return tree;
}
