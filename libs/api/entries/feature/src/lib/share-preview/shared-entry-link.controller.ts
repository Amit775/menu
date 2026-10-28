import { Controller, Get, Header, Headers, Param } from '@nestjs/common';
import { sharedEntryLinkRoute } from '@menu/shared/contracts';
import { SharePreviewService } from './share-preview.service';

/**
 * Hosting sends `/e/<token>` here (outside `/api`), so WhatsApp and other link
 * previews see the entry; a person gets the same app page as anywhere else.
 */
@Controller(sharedEntryLinkRoute)
export class SharedEntryLinkController {
  constructor(private readonly previews: SharePreviewService) {}

  // No ZodValidationPipe on the token: a malformed link still gets the generic page, not a 400.
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  // Not cached: an entry made private must stop showing at once.
  @Header('Cache-Control', 'no-cache')
  page(
    @Param('token') token: string,
    @Headers('x-forwarded-host') forwardedHost: string | undefined,
  ): Promise<string> {
    return this.previews.page(token, forwardedHost);
  }
}
