import {
  Inject,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  EntryRepository,
  PHOTO_STORAGE,
  type PhotoStorage,
  type StoredPhoto,
} from '@menu/api/entries/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { type Entry } from '@menu/shared/contracts';
import { newCapabilityId } from '../entry/capability-id';
import { DiaryEntry } from '../entry/diary-entry';
import { entryPhotoKey, photoTypeOf } from './photo-bytes';

/**
 * An entry's one photo (ADR 0011): the author sets or removes it; anyone
 * holding its id reads it. Every new photo gets a new id.
 */
@Injectable()
export class PhotoService {
  constructor(
    private readonly repository: EntryRepository,
    @Inject(PHOTO_STORAGE) private readonly storage: PhotoStorage,
  ) {}

  async set(principal: Principal, entryId: string, bytes: Buffer): Promise<Entry> {
    const photoType = photoTypeOf(bytes);
    if (!photoType) {
      throw new UnsupportedMediaTypeException('Send a JPEG, PNG or WebP photo.');
    }
    await this.findOwn(principal, entryId);
    await this.storage.put(entryPhotoKey(entryId), { bytes, type: photoType });
    return this.save(principal, entryId, { photoId: newCapabilityId(), photoType });
  }

  async remove(principal: Principal, entryId: string): Promise<Entry> {
    await this.findOwn(principal, entryId);
    const entry = await this.save(principal, entryId, null);
    await this.storage.delete(entryPhotoKey(entryId));
    return entry;
  }

  /** The photo behind an id, for anyone holding it. An old or unknown id reads as missing. */
  async read(photoId: string): Promise<StoredPhoto> {
    const record = await this.repository.findByPhotoId(photoId);
    const photo = record ? await this.storage.get(entryPhotoKey(record.id)) : null;
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
    return photo;
  }

  private async findOwn(principal: Principal, entryId: string): Promise<void> {
    const record = await this.repository.findById(entryId);
    if (!record) {
      throw new NotFoundException('Entry not found.');
    }
    new DiaryEntry(record).assertAuthor(principal);
  }

  private async save(
    principal: Principal,
    entryId: string,
    photo: Parameters<EntryRepository['setPhoto']>[2],
  ): Promise<Entry> {
    const record = await this.repository.setPhoto(entryId, principal.accountId, photo);
    if (!record) {
      throw new NotFoundException('Entry not found.');
    }
    return new DiaryEntry(record).toContract();
  }
}
