import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type PhotoType, PhotoTypeSchema } from '@menu/shared/contracts';

/** The bytes of one stored photo. */
export interface StoredPhoto {
  bytes: Buffer;
  type: PhotoType;
}

/** Where entry photos live (ADR 0011). Keys look like `entries/<entryId>`. */
export interface PhotoStorage {
  put(key: string, photo: StoredPhoto): Promise<void>;
  /** Null when nothing is stored under the key. */
  get(key: string): Promise<StoredPhoto | null>;
  /** Removing a missing photo is not an error. */
  delete(key: string): Promise<void>;
}

export const PHOTO_STORAGE = Symbol('PHOTO_STORAGE');

/** Specs: keeps photos in memory. */
export class MemoryPhotoStorage implements PhotoStorage {
  readonly photos = new Map<string, StoredPhoto>();

  put(key: string, photo: StoredPhoto): Promise<void> {
    this.photos.set(key, photo);
    return Promise.resolve();
  }

  get(key: string): Promise<StoredPhoto | null> {
    return Promise.resolve(this.photos.get(key) ?? null);
  }

  delete(key: string): Promise<void> {
    this.photos.delete(key);
    return Promise.resolve();
  }
}

/** Local development and e2e (`PHOTO_DIR`): one file per photo, its type beside it. */
export class DiskPhotoStorage implements PhotoStorage {
  constructor(private readonly dir: string) {}

  async put(key: string, photo: StoredPhoto): Promise<void> {
    const path = this.path(key);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, photo.bytes);
    await writeFile(`${path}.type`, photo.type);
  }

  async get(key: string): Promise<StoredPhoto | null> {
    const path = this.path(key);
    try {
      const [bytes, type] = await Promise.all([readFile(path), readFile(`${path}.type`, 'utf8')]);
      return { bytes, type: PhotoTypeSchema.parse(type) };
    } catch (error) {
      if ((error as { code?: unknown }).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.path(key);
    await rm(path, { force: true });
    await rm(`${path}.type`, { force: true });
  }

  private path(key: string): string {
    // Keys are built by the API from uuids; refuse anything that could leave the folder.
    if (!/^[\w-]+(\/[\w-]+)*$/.test(key)) {
      throw new Error(`Bad photo key: ${key}`);
    }
    return join(this.dir, key);
  }
}

/** The part of a Cloud Storage bucket the API uses (`firebase-admin/storage`). */
export interface PhotoBucket {
  file(name: string): {
    save(data: Buffer, options: { contentType: string; resumable: boolean }): Promise<unknown>;
    download(): Promise<[Buffer]>;
    getMetadata(): Promise<[{ contentType?: string | undefined }, ...unknown[]]>;
    delete(options: { ignoreNotFound: boolean }): Promise<unknown>;
  };
}

/** Production: the Firebase Storage bucket, reached with the API's service account. */
export class CloudPhotoStorage implements PhotoStorage {
  private connected: Promise<PhotoBucket> | undefined;

  /** Connects on the first photo request, so the API starts without Storage. */
  constructor(private readonly connect: () => Promise<PhotoBucket>) {}

  private get bucket(): Promise<PhotoBucket> {
    // A failed connect is not kept, so the next request tries again.
    this.connected ??= this.connect().catch((error: unknown) => {
      this.connected = undefined;
      throw error;
    });
    return this.connected;
  }

  async put(key: string, photo: StoredPhoto): Promise<void> {
    await (await this.bucket).file(key).save(photo.bytes, {
      contentType: photo.type,
      resumable: false,
    });
  }

  async get(key: string): Promise<StoredPhoto | null> {
    const file = (await this.bucket).file(key);
    try {
      const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
      return { bytes, type: PhotoTypeSchema.parse(metadata.contentType) };
    } catch (error) {
      if ((error as { code?: unknown }).code === 404) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await (await this.bucket).file(key).delete({ ignoreNotFound: true });
  }
}

async function firebaseBucket(projectId: string, name: string): Promise<PhotoBucket> {
  const { getApps, initializeApp } = await import('firebase-admin/app');
  const { getStorage } = await import('firebase-admin/storage');
  return getStorage(getApps()[0] ?? initializeApp({ projectId })).bucket(name);
}

/**
 * `PHOTO_DIR` keeps photos on disk (local development, e2e). Otherwise they go
 * to `PHOTO_BUCKET`, by default the project's Firebase Storage bucket.
 */
export function photoStorageFromEnv(
  projectId: string,
  env: NodeJS.ProcessEnv = process.env,
): PhotoStorage {
  const dir = nonEmpty(env['PHOTO_DIR']);
  if (dir) {
    return new DiskPhotoStorage(dir);
  }
  const name = nonEmpty(env['PHOTO_BUCKET']) ?? `${projectId}.firebasestorage.app`;
  return new CloudPhotoStorage(() => firebaseBucket(projectId, name));
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === '' ? undefined : trimmed;
}
