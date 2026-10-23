import { readJson, type Tree } from '@nx/devkit';
import { createMenuTree } from '../../testing/workspace';
import { BOUNDARIES_PATH } from '../../utils/workspace';
import { domainGenerator } from './generator';

describe('domain generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createMenuTree(['venues']);
  });

  it('registers the scope so module boundaries enforce it', async () => {
    await domainGenerator(tree, { name: 'Reviews' });
    expect(readJson<{ domains: string[] }>(tree, BOUNDARIES_PATH).domains).toEqual([
      'reviews',
      'venues',
    ]);
  });

  it('is idempotent', async () => {
    await domainGenerator(tree, { name: 'venues' });
    expect(readJson<{ domains: string[] }>(tree, BOUNDARIES_PATH).domains).toEqual(['venues']);
  });

  it('reserves "shared"', async () => {
    await expect(domainGenerator(tree, { name: 'shared' })).rejects.toThrow(/reserved/);
  });
});
