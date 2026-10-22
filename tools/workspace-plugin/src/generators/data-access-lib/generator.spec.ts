import { readProjectConfiguration, type Tree } from '@nx/devkit';
import { createMenuTree } from '../../testing/workspace';
import { contractGenerator } from '../contract/generator';
import { dataAccessLibGenerator } from './generator';

describe('data-access-lib generator', () => {
  let tree: Tree;

  beforeAll(async () => {
    tree = createMenuTree(['reviews']);
    await contractGenerator(tree, { domain: 'reviews', name: 'review' });
    await dataAccessLibGenerator(tree, { domain: 'reviews', name: 'review' });
  });

  it('creates the domain data-access project once', () => {
    expect(readProjectConfiguration(tree, 'web-reviews-data-access').tags).toEqual([
      'platform:web',
      'scope:reviews',
      'type:data-access',
    ]);
  });

  it('adds a signal store and a contract-validated client', () => {
    const lib = 'libs/web/reviews/data-access/src';
    expect(tree.read(`${lib}/lib/review/review.store.ts`, 'utf-8')).toContain(
      'export const ReviewStore = signalStore(',
    );
    expect(tree.read(`${lib}/lib/review/review.api-client.ts`, 'utf-8')).toContain(
      'z.array(ReviewSchema).parse(body)',
    );
    expect(tree.read(`${lib}/index.ts`, 'utf-8')).toBe(
      "export * from './lib/review/review.api-client';\nexport * from './lib/review/review.store';\n",
    );
  });

  it('requires the contract to exist first', async () => {
    await expect(
      dataAccessLibGenerator(tree, { domain: 'reviews', name: 'venue' }),
    ).rejects.toThrow(/Missing contract/);
  });
});
