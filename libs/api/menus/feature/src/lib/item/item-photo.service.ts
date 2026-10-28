import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type ItemPhotoRef,
  ItemNotEditableError,
  ItemRepository,
} from '@menu/api/menus/data-access';
import { newCapabilityId } from '@menu/api/shared/util';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import {
  cleanPhoto,
  PHOTO_STORAGE,
  type PhotoStorage,
  type StoredPhoto,
} from '@menu/api/shared/util-photos';
import { type Item } from '@menu/shared/contracts';
import { MenuItem } from './menu-item';

function itemPhotoKey(itemId: string): string {
  return `items/${itemId}`;
}

/** The photo the venue's Owner or an Admin puts on an item (ADR 0013). */
@Injectable()
export class ItemPhotoService {
  constructor(
    private readonly repository: ItemRepository,
    @Inject(PHOTO_STORAGE) private readonly storage: PhotoStorage,
  ) {}

  /**
   * The new id is saved before the bytes, so an id handed out for the old
   * photo never serves the new one; if the upload then fails, trying again
   * replaces it.
   */
  async set(principal: Principal, itemId: string, bytes: Buffer): Promise<Item> {
    const photo = cleanPhoto(bytes);
    await this.assertEditor(principal, itemId);
    const item = await this.save(principal, itemId, {
      photoId: newCapabilityId(),
      photoType: photo.type,
    });
    await this.storage.put(itemPhotoKey(itemId), photo);
    return item;
  }

  async remove(principal: Principal, itemId: string): Promise<Item> {
    await this.assertEditor(principal, itemId);
    const item = await this.save(principal, itemId, null);
    try {
      await this.storage.delete(itemPhotoKey(itemId));
    } catch (error) {
      // Its id is gone, so nothing reaches the bytes; they are left for a later cleanup.
      Logger.warn(`Could not delete the photo of item ${itemId}: ${String(error)}`, 'Photos');
    }
    return item;
  }

  async read(photoId: string): Promise<StoredPhoto> {
    const record = await this.repository.findByPhotoId(photoId);
    const photo = record ? await this.storage.get(itemPhotoKey(record.id)) : null;
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
    return photo;
  }

  private async assertEditor(principal: Principal, itemId: string): Promise<void> {
    const record = await this.repository.findById(itemId);
    if (!record) {
      throw new NotFoundException('Item not found.');
    }
    if (!canEditVenue(principal, record.venueId)) {
      throw new ForbiddenException('Only the venue’s Owner or an Admin can change its photos.');
    }
  }

  private async save(
    principal: Principal,
    itemId: string,
    photo: ItemPhotoRef | null,
  ): Promise<Item> {
    try {
      return new MenuItem(await this.repository.setPhoto(itemId, photo)).toContract(principal);
    } catch (error) {
      if (error instanceof ItemNotEditableError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
