import { type AccountRepository } from '@menu/api/users/data-access';
import { AccountDirectory } from './account-directory';

describe('AccountDirectory', () => {
  it('asks once per distinct author', async () => {
    const displayNames = vi.fn().mockResolvedValue(new Map([['a1', 'נועה']]));
    const directory = new AccountDirectory({ displayNames } as unknown as AccountRepository);
    await expect(directory.displayNames(['a1', 'a1'])).resolves.toEqual(new Map([['a1', 'נועה']]));
    expect(displayNames).toHaveBeenCalledWith(['a1']);
  });

  it('skips the lookup when there are no authors', async () => {
    const displayNames = vi.fn();
    const directory = new AccountDirectory({ displayNames } as unknown as AccountRepository);
    await expect(directory.displayNames([])).resolves.toEqual(new Map());
    expect(displayNames).not.toHaveBeenCalled();
  });
});
