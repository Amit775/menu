import { createMenuTree } from './workspace';

describe('createMenuTree', () => {
  it('formats with the repo Prettier config instead of fetching oxfmt', () => {
    const tree = createMenuTree();
    expect(tree.exists('.oxfmtrc.json')).toBe(false);
    expect(tree.exists('.prettierrc')).toBe(true);
  });
});
