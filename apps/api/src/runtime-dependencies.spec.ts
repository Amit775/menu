import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join, relative } from 'node:path';

// The production image installs only what apps/api/package.json lists (webpack
// keeps node_modules external and copies that manifest into dist/apps/api).
// A package imported by the API or one of its libs but missing there builds
// fine and then crashes the container on start.

const workspaceRoot = join(import.meta.dirname, '../../..');
const sourceRoots = ['apps/api/src', 'libs/api', 'libs/shared'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(path);
    const isSource = /\.[cm]?ts$/.test(entry.name) && !/\.(spec|test|d)\.[cm]?ts$/.test(entry.name);
    const isTooling = /\.config\.[cm]?ts$/.test(entry.name);
    return isSource && !isTooling ? [path] : [];
  });
}

function runtimeImports(source: string): string[] {
  const statements = source.match(/^\s*(?:import|export)\s[^;]*?from\s+['"][^'"]+['"]/gm) ?? [];
  const sideEffects = source.match(/^\s*import\s+['"][^'"]+['"]/gm) ?? [];
  const calls = source.match(/(?:require|import)\(\s*['"][^'"]+['"]\s*\)/g) ?? [];
  const runtime = statements.filter((s) => !/^\s*(?:import|export)\s+type\s/.test(s));
  return [...runtime, ...sideEffects, ...calls].map(
    (s) => /['"]([^'"]+)['"]\s*\)?$/.exec(s)?.[1] ?? '',
  );
}

function packageName(specifier: string): string | undefined {
  if (specifier.startsWith('.') || specifier.startsWith('node:')) return undefined;
  const [first = '', second = ''] = specifier.split('/');
  const name = first.startsWith('@') ? `${first}/${second}` : first;
  if (name.startsWith('@menu/') || builtinModules.includes(name)) return undefined;
  return name;
}

describe('API production manifest', () => {
  it('lists every package the API and its libs import at runtime', () => {
    const manifest = JSON.parse(
      readFileSync(join(workspaceRoot, 'apps/api/package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };
    const declared = new Set(Object.keys(manifest.dependencies ?? {}));

    const missing = new Map<string, string>();
    for (const file of sourceRoots.flatMap((root) => sourceFiles(join(workspaceRoot, root)))) {
      for (const name of runtimeImports(readFileSync(file, 'utf8')).map(packageName)) {
        if (name && !declared.has(name) && !missing.has(name)) {
          missing.set(name, relative(workspaceRoot, file));
        }
      }
    }

    expect(Object.fromEntries(missing)).toEqual({});
  });

  it('pins the versions the workspace uses', () => {
    const read = (path: string) =>
      JSON.parse(readFileSync(join(workspaceRoot, path), 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
    const { dependencies, devDependencies } = read('package.json');
    const root = { ...devDependencies, ...dependencies };
    const app = read('apps/api/package.json').dependencies ?? {};

    const mismatched = Object.entries(app).filter(([name, range]) => root[name] !== range);

    expect(Object.fromEntries(mismatched)).toEqual({});
  });
});
