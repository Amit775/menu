import { type Tree } from '@nx/devkit';
import { createMenuTree } from '../../testing/workspace';
import { contractGenerator } from './generator';

describe('contract generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createMenuTree(['reviews']);
  });

  it('creates the schema, its spec and a barrel export', async () => {
    await contractGenerator(tree, { domain: 'reviews', name: 'review' });

    const contract = tree.read('libs/shared/contracts/src/lib/reviews/review.contract.ts', 'utf-8');
    expect(contract).toContain('export const ReviewSchema = z.object');
    expect(contract).toContain("export const reviewPath = 'review';");
    expect(tree.exists('libs/shared/contracts/src/lib/reviews/review.contract.spec.ts')).toBe(true);
    expect(tree.read('libs/shared/contracts/src/index.ts', 'utf-8')).toContain(
      "export * from './lib/reviews/review.contract';",
    );
  });

  it('refuses an unregistered domain', async () => {
    await expect(contractGenerator(tree, { domain: 'menus', name: 'item' })).rejects.toThrow(
      /Register it first/,
    );
  });

  it('refuses to overwrite an existing contract', async () => {
    await contractGenerator(tree, { domain: 'reviews', name: 'review' });
    await expect(contractGenerator(tree, { domain: 'reviews', name: 'review' })).rejects.toThrow(
      /already exists/,
    );
  });
});
