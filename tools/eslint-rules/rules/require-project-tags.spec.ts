import { checkTags, type TagRules } from './require-project-tags';

describe('require-project-tags', () => {
  const rules: TagRules = {
    platforms: ['platform:web', 'platform:api'],
    scopes: ['scope:app', 'scope:shared', 'scope:reviews'],
    types: ['type:feature', 'type:util'],
  };

  it('accepts one valid tag of each kind', () => {
    expect(checkTags(['platform:web', 'scope:reviews', 'type:feature'], rules)).toBeUndefined();
  });

  it('rejects a project without tags', () => {
    expect(checkTags(undefined, rules)).toMatch(/needs a "tags" array/);
  });

  it('rejects a missing kind', () => {
    expect(checkTags(['platform:web', 'type:feature'], rules)).toBe(
      'Expected exactly one scope:* tag, found 0.',
    );
  });

  it('rejects an unregistered domain with a hint', () => {
    expect(checkTags(['platform:web', 'scope:menus', 'type:feature'], rules)).toMatch(
      /Register new domains/,
    );
  });

  it('rejects two tags of one kind', () => {
    expect(checkTags(['platform:web', 'platform:api', 'scope:app', 'type:util'], rules)).toMatch(
      /exactly one platform/,
    );
  });
});
