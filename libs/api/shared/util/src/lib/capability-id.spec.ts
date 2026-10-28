import { PhotoIdSchema, ShareTokenSchema } from '@menu/shared/contracts';
import { newCapabilityId } from './capability-id';

describe('newCapabilityId', () => {
  it('makes a fresh 22-character id that is a valid share token and photo id', () => {
    const id = newCapabilityId();
    expect(ShareTokenSchema.parse(id)).toBe(id);
    expect(PhotoIdSchema.parse(id)).toBe(id);
    expect(newCapabilityId()).not.toBe(id);
  });
});
