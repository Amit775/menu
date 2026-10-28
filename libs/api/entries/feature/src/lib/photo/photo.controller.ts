import { Controller, Delete, Get, Param, Put, Req, Res, StreamableFile } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import { Authenticated, CurrentPrincipal, type Principal } from '@menu/api/shared/util-auth';
import { readBody } from '@menu/api/shared/util-photos';
import { type Entry, entryPath, IdSchema, PhotoIdSchema, photoPath } from '@menu/shared/contracts';
import { PhotoService } from './photo.service';

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

interface HeaderSink {
  setHeader(name: string, value: string): unknown;
}

@Controller(photoPath)
export class PhotoController {
  constructor(private readonly photos: PhotoService) {}

  @Get(':photoId')
  async read(
    @Param('photoId', new ZodValidationPipe(PhotoIdSchema)) photoId: string,
    @Res({ passthrough: true }) response: HeaderSink,
  ): Promise<StreamableFile> {
    const photo = await this.photos.read(photoId);
    // Set only on success, so a missing photo is not cached. The id changes with
    // the photo and its audience, so a copy never goes stale; only browsers keep it.
    response.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(photo.bytes, { type: photo.type, length: photo.bytes.length });
  }
}
