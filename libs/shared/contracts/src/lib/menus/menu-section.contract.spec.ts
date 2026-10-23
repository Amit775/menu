import {
  CreateMenuSectionSchema,
  menuSectionPath,
  MenuSectionSchema,
  ReorderMenuSectionsSchema,
} from './menu-section.contract';

describe('MenuSection contract', () => {
  const valid = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    venueId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'עיקריות', en: 'Mains' },
    position: 0,
  };

  it('accepts a valid section', () => {
    expect(MenuSectionSchema.parse(valid)).toEqual(valid);
  });

  it('needs a name to create', () => {
    expect(CreateMenuSectionSchema.safeParse({}).success).toBe(false);
  });

  it('reorders with at least one id', () => {
    expect(ReorderMenuSectionsSchema.safeParse({ sectionIds: [] }).success).toBe(false);
  });

  it('builds the nested path', () => {
    expect(menuSectionPath('v1')).toBe('venues/v1/sections');
  });
});
