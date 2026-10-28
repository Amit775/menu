import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EntryRepository } from '@menu/api/entries/data-access';
import {
  cleanPhoto,
  PHOTO_STORAGE,
  type PhotoStorage,
  type StoredPhoto,
} from '@menu/api/shared/util-photos';
import { type Principal } from '@menu/api/shared/util-auth';
import { type Entry } from '@menu/shared/contracts';
import { newCapabilityId } from '../entry/capability-id';
import { DiaryEntry } from '../entry/diary-entry';
import { deletePhoto, entryPhotoKey } from './entry-photo';

@Injectable()
export class PhotoService {
  constructor(
    private readonly repository: EntryRepository,
    @Inject(PHOTO_STORAGE) private readonly storage: PhotoStorage,
  ) {}

  /**
   * The new id is saved before the bytes, so an id handed out for the old
   * photo never serves the new one; if the upload then fails, trying again
   * replaces it.
   */
  async set(principal: Principal, entryId: string, bytes: Buffer): Promise<Entry> {
    const photo = cleanPhoto(bytes);
    await this.findOwn(principal, entryId);
    const entry = await this.save(principal, entryId, {
      photoId: newCapabilityId(),
      photoType: photo.type,
    });
    await this.storage.put(entryPhotoKey(entryId), photo);
    return entry;
  }

  async remove(principal: Principal, entryId: string): Promise<Entry> {
    await this.findOwn(principal, entryId);
    const entry = await this.save(principal, entryId, null);
    await deletePhoto(this.storage, entryId);
    return entry;
  }

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
