import { readProjectConfiguration, type Tree } from '@nx/devkit';
import { createMenuTree } from '../../testing/workspace';
import { contractGenerator } from '../contract/generator';
import { nestResourceGenerator } from './generator';

describe('nest-resource generator', () => {
  let tree: Tree;

  beforeAll(async () => {
    tree = createMenuTree(['reviews']);
    await contractGenerator(tree, { domain: 'reviews', name: 'review' });
    await nestResourceGenerator(tree, { domain: 'reviews', name: 'review' });
  });

  it('creates tagged feature and data-access libs', () => {
    expect(readProjectConfiguration(tree, 'api-reviews-feature').tags).toEqual([
      'platform:api',
      'scope:reviews',
      'type:feature',
    ]);
    expect(readProjectConfiguration(tree, 'api-reviews-data-access').tags).toEqual([
      'platform:api',
      'scope:reviews',
      'type:data-access',
    ]);
  });

  it('validates input with the shared contract', () => {
    const controller = tree.read(
      'libs/api/reviews/feature/src/lib/review/review.controller.ts',
      'utf-8',
    );
    expect(controller).toContain('@Controller(reviewPath)');
    expect(controller).toContain('new ZodValidationPipe(CreateReviewSchema)');
  });

  it('adds a Prisma model', () => {
    expect(tree.read('libs/api/shared/db/prisma/schema.prisma', 'utf-8')).toContain(
      'model Review {',
    );
  });

  it('registers the module in the API app', () => {
    const appModule = tree.read('apps/api/src/app/app.module.ts', 'utf-8');
    expect(appModule).toContain("import { ReviewModule } from '@menu/api/reviews/feature';");
    expect(appModule).toContain('imports: [ReviewModule, DbModule]');
  });

  it('requires the contract to exist first', async () => {
    await expect(nestResourceGenerator(tree, { domain: 'reviews', name: 'venue' })).rejects.toThrow(
      /Missing contract/,
    );
  });
});
