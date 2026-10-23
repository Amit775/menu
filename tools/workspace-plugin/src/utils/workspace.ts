import { names, readJson, type Tree, updateJson } from '@nx/devkit';

export const BOUNDARIES_PATH = 'tools/eslint/module-boundaries.json';
export const CONTRACTS_ROOT = 'libs/shared/contracts';
export const API_APP_MODULE = 'apps/api/src/app/app.module.ts';
export const WEB_APP_ROUTES = 'apps/web/src/app/app.routes.ts';
export const PRISMA_SCHEMA = 'libs/api/shared/db/prisma/schema.prisma';

export type Platform = 'web' | 'api' | 'shared';
export type LibType = 'feature' | 'data-access' | 'ui' | 'util' | 'contracts';

interface Boundaries {
  domains: string[];
}

/** kebab-case, validated: lowercase letters, digits and dashes, starting with a letter. */
export function toKebab(value: string, label: string): string {
  const kebab = names(value).fileName;
  if (!/^[a-z][a-z0-9-]*$/.test(kebab)) {
    throw new Error(`Invalid ${label} "${value}": use letters, digits and dashes.`);
  }
  return kebab;
}

export function readDomains(tree: Tree): string[] {
  return readJson<Boundaries>(tree, BOUNDARIES_PATH).domains;
}

/** Domains must be registered with the `domain` generator so their scope tag is enforced. */
export function assertDomain(tree: Tree, domain: string): void {
  if (domain !== 'shared' && !readDomains(tree).includes(domain)) {
    throw new Error(
      `Unknown domain "${domain}". Register it first: pnpm nx g @menu/workspace-plugin:domain ${domain}`,
    );
  }
}

export function registerDomain(tree: Tree, domain: string): void {
  updateJson<Boundaries>(tree, BOUNDARIES_PATH, (json) => {
    if (!json.domains.includes(domain)) {
      json.domains = [...json.domains, domain].sort();
    }
    return json;
  });
}

export function tagsFor(platform: Platform, domain: string, type: LibType): string {
  return [`platform:${platform}`, `scope:${domain}`, `type:${type}`].join(',');
}

/** Appends `export * from '<from>';` to a barrel once. */
export function addExport(tree: Tree, indexPath: string, from: string): void {
  const line = `export * from '${from}';`;
  const current = tree.exists(indexPath) ? (tree.read(indexPath, 'utf-8') ?? '') : '';
  if (current.includes(line)) {
    return;
  }
  const base = current.replace(/^export \{\};?\s*$/m, '').trimEnd();
  tree.write(indexPath, `${base ? `${base}\n` : ''}${line}\n`);
}

export function contractExists(tree: Tree, domain: string, name: string): boolean {
  return tree.exists(`${CONTRACTS_ROOT}/src/lib/${domain}/${name}.contract.ts`);
}

export function assertContract(tree: Tree, domain: string, name: string): void {
  if (!contractExists(tree, domain, name)) {
    throw new Error(
      `Missing contract ${domain}/${name}. Create it first: pnpm nx g @menu/workspace-plugin:contract --domain=${domain} --name=${name}`,
    );
  }
}

export function resourceNames(name: string): {
  className: string;
  propertyName: string;
  fileName: string;
  constantName: string;
} {
  const n = names(name);
  return {
    className: n.className,
    propertyName: n.propertyName,
    fileName: n.fileName,
    constantName: n.constantName,
  };
}
