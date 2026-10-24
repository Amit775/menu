import { Controller, Delete, Get, Header, Param, Put, Req, StreamableFile } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import { Authenticated, CurrentPrincipal, type Principal } from '@menu/api/shared/util-auth';
import { type Entry, entryPath, IdSchema, PhotoIdSchema, photoPath } from '@menu/shared/contracts';
import { readBody } from './photo-bytes';
import { PhotoService } from './photo.service';

/** `/api/entries/:id/photo`: the author sets (the image is the request body) or removes it. */
@Controller(entryPath)
export class EntryPhotoController {
  constructor(private readonly photos: PhotoService) {}

  @Put(':id/photo')
  @Authenticated()
  async set(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Req() request: AsyncIterable<Buffer>,
  ): Promise<Entry> {
    return this.photos.set(principal, id, await readBody(request));
  }

  @Delete(':id/photo')
  @Authenticated()
  remove(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<Entry> {
    return this.photos.remove(principal, id);
  }
}

/** `/api/photos/:photoId`: a photo for anyone holding its id (ADR 0011). */
@Controller(photoPath)
export class PhotoController {
  constructor(private readonly photos: PhotoService) {}

  @Get(':photoId')
  // The id changes with the photo and its audience, so a copy never goes stale; only browsers keep it.
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  async read(
    @Param('photoId', new ZodValidationPipe(PhotoIdSchema)) photoId: string,
  ): Promise<StreamableFile> {
    const photo = await this.photos.read(photoId);
    return new StreamableFile(photo.bytes, { type: photo.type, length: photo.bytes.length });
  }
}
