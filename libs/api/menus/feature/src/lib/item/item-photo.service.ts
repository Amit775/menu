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
  type ItemRecord,
  ItemRepository,
  VenueRepository,
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

// Keyed by photo id, so an id always serves the bytes it was made for, even from a CDN cache.
function itemPhotoKey(photoId: string): string {
  return `items/${photoId}`;
}

/** The photo the venue's Owner, a Contributor or an Admin puts on an item (ADR 0013, 0014). */
@Injectable()
export class ItemPhotoService {
  constructor(
    private readonly repository: ItemRepository,
    private readonly venues: VenueRepository,
    @Inject(PHOTO_STORAGE) private readonly storage: PhotoStorage,
  ) {}

  /** The bytes are stored before the item points at them, so a new id never serves nothing. */
  async set(principal: Principal, itemId: string, bytes: Buffer): Promise<Item> {
    const photo = cleanPhoto(bytes);
    const previous = await this.findEditable(principal, itemId);
    const photoId = newCapabilityId();
    await this.storage.put(itemPhotoKey(photoId), photo);
    let item: Item;
    try {
      item = await this.save(principal, itemId, { photoId, photoType: photo.type });
    } catch (error) {
      await this.forget(photoId);
      throw error;
    }
    await this.forget(previous.photoId);
    return item;
  }

  async remove(principal: Principal, itemId: string): Promise<Item> {
    const previous = await this.findEditable(principal, itemId);
    const item = await this.save(principal, itemId, null);
    await this.forget(previous.photoId);
    return item;
  }

  async read(photoId: string): Promise<StoredPhoto> {
    const record = await this.repository.findByPhotoId(photoId);
    const photo = record ? await this.storage.get(itemPhotoKey(photoId)) : null;
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
    return photo;
  }

  private async findEditable(principal: Principal, itemId: string): Promise<ItemRecord> {
    const record = await this.repository.findById(itemId);
    const item = record ? new MenuItem(record) : null;
    const venue = item?.isVisibleTo(principal)
      ? await this.venues.findById(item.record.venueId)
      : null;
    if (!item || !venue || (venue.status === 'hidden' && !canEditVenue(principal, venue.id))) {
      throw new NotFoundException('Item not found.');
    }
    if (!item.canBeEditedBy(principal)) {
      throw new ForbiddenException(
        'Only the venue’s Owner, a Contributor or an Admin can change its photos.',
      );
    }
    return item.record;
  }

  /** No id reaches these bytes any more, so a failure to delete them is only logged. */
  private async forget(photoId: string | null): Promise<void> {
    if (photoId === null) {
      return;
    }
    try {
      await this.storage.delete(itemPhotoKey(photoId));
    } catch (error) {
      Logger.warn(`Could not delete item photo ${photoId}: ${String(error)}`, 'Photos');
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
