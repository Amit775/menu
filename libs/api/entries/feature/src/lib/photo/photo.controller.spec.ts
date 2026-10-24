import { PayloadTooLargeException, StreamableFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AUTH_REQUIREMENT, type Principal } from '@menu/api/shared/util-auth';
import { EntryPhotoController, PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';

function requirementOf(controller: { prototype: object }, method: string): unknown {
  const handler = Object.getOwnPropertyDescriptor(controller.prototype, method)?.value as object;
  return Reflect.getMetadata(AUTH_REQUIREMENT, handler);
}

async function* body(...chunks: Buffer[]): AsyncIterable<Buffer> {
  for (const chunk of chunks) {
    yield await Promise.resolve(chunk);
  }
}

describe('Photo controllers', () => {
  const principal: Principal = {
    accountId: 'a1',
    isAdmin: false,
    language: 'he',
    ownedVenueIds: [],
  };

  async function setup(service: Partial<Record<keyof PhotoService, unknown>>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [EntryPhotoController, PhotoController],
      providers: [{ provide: PhotoService, useValue: service }],
    }).compile();
    return {
      entryPhoto: moduleRef.get(EntryPhotoController),
      photo: moduleRef.get(PhotoController),
    };
  }

  it('sets the photo from the whole request body', async () => {
    const set = vi.fn().mockResolvedValue({});
    const { entryPhoto } = await setup({ set });

    await entryPhoto.set(principal, 'e1', body(Buffer.from([1, 2]), Buffer.from([3])));

    expect(set).toHaveBeenCalledWith(principal, 'e1', Buffer.from([1, 2, 3]));
  });

  it('refuses a body over the size limit before calling the service', async () => {
    const set = vi.fn();
    const { entryPhoto } = await setup({ set });

    await expect(
      entryPhoto.set(principal, 'e1', body(Buffer.alloc(8 * 1024 * 1024 + 1))),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(set).not.toHaveBeenCalled();
  });

  it('removes the photo for the caller', async () => {
    const remove = vi.fn().mockResolvedValue({});
    const { entryPhoto } = await setup({ remove });

    await entryPhoto.remove(principal, 'e1');

    expect(remove).toHaveBeenCalledWith(principal, 'e1');
  });

  it('serves the photo bytes with their type', async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff]);
    const { photo } = await setup({
      read: vi.fn().mockResolvedValue({ bytes, type: 'image/jpeg' }),
    });

    const file = await photo.read('p'.repeat(22));

    expect(file).toBeInstanceOf(StreamableFile);
    expect(file.getHeaders()).toMatchObject({ type: 'image/jpeg', length: 3 });
  });

  it('needs sign-in to change a photo but not to read one', () => {
    expect(requirementOf(EntryPhotoController, 'set')).toBeDefined();
    expect(requirementOf(EntryPhotoController, 'remove')).toBeDefined();
    expect(requirementOf(PhotoController, 'read')).toBeUndefined();
  });
});
