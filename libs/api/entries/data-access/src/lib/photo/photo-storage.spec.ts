import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CloudPhotoStorage,
  DiskPhotoStorage,
  MemoryPhotoStorage,
  type PhotoBucket,
  photoStorageFromEnv,
} from './photo-storage';

const photo = { bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), type: 'image/jpeg' as const };

describe('photo storage', () => {
  it('keeps, reads and removes a photo in memory', async () => {
    const storage = new MemoryPhotoStorage();
    await storage.put('entries/a', photo);
    await expect(storage.get('entries/a')).resolves.toEqual(photo);
    await storage.delete('entries/a');
    await expect(storage.get('entries/a')).resolves.toBeNull();
  });

  describe('on disk', () => {
    let dir = '';
    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'menu-photos-'));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('keeps the bytes and their type, and forgets them on delete', async () => {
      const storage = new DiskPhotoStorage(dir);
      await storage.put('entries/a', photo);
      await expect(storage.get('entries/a')).resolves.toEqual(photo);
      await storage.delete('entries/a');
      await storage.delete('entries/a');
      await expect(storage.get('entries/a')).resolves.toBeNull();
    });

    it('refuses a key that could leave its folder', async () => {
      await expect(new DiskPhotoStorage(dir).put('../a', photo)).rejects.toThrow('Bad photo key');
    });
  });

  it('reads a missing Cloud Storage object as nothing, and connects once', async () => {
    const missing = Object.assign(new Error('No such object'), { code: 404 });
    const file = {
      save: vi.fn().mockResolvedValue(undefined),
      download: vi.fn().mockRejectedValue(missing),
      getMetadata: vi.fn().mockRejectedValue(missing),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const connect = vi.fn().mockResolvedValue({ file: () => file } satisfies PhotoBucket);
    const storage = new CloudPhotoStorage(connect);
    await storage.put('entries/a', photo);
    expect(file.save).toHaveBeenCalledWith(photo.bytes, {
      contentType: 'image/jpeg',
      resumable: false,
    });
    await expect(storage.get('entries/a')).resolves.toBeNull();
    await storage.delete('entries/a');
    expect(file.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('picks the disk when PHOTO_DIR is set, Cloud Storage otherwise', () => {
    expect(photoStorageFromEnv('p', { PHOTO_DIR: '/tmp/x' })).toBeInstanceOf(DiskPhotoStorage);
    expect(photoStorageFromEnv('p', {})).toBeInstanceOf(CloudPhotoStorage);
  });
});
