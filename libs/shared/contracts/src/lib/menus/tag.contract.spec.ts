import { CreateTagSchema, TagSchema, UpdateTagSchema } from './tag.contract';

describe('Tag contract', () => {
  const valid = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    slug: 'hamburger',
    name: { he: 'המבורגר', en: 'Hamburger' },
    kind: 'dish',
  };

  it('accepts a valid tag', () => {
    expect(TagSchema.parse(valid)).toEqual(valid);
  });

  it('rejects a slug that is not lowercase English', () => {
    expect(CreateTagSchema.safeParse({ ...valid, slug: 'המבורגר' }).success).toBe(false);
    expect(CreateTagSchema.safeParse({ ...valid, slug: 'Burger' }).success).toBe(false);
  });

  it('does not change the slug on update', () => {
    expect(UpdateTagSchema.parse({ slug: 'x', kind: 'diet' })).toEqual({ kind: 'diet' });
  });
});
