import { Injectable, Logger } from '@nestjs/common';
import { firebaseProjectId } from '@menu/api/shared/util-auth';
import { type SharedEntryView, ShareTokenSchema } from '@menu/shared/contracts';
import { EntryService } from '../entry/entry.service';
import { previewMeta, renderPreview, webOrigin } from './share-preview';
import { WebShell } from './web-shell';

// Only when the app's page was never read: the link itself would come back here, so it goes home.
const FALLBACK_SHELL =
  '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8" /><title>Menu</title></head><body><a href="/">Menu</a></body></html>';

@Injectable()
export class SharePreviewService {
  private readonly logger = new Logger(SharePreviewService.name);

  constructor(
    private readonly entries: EntryService,
    private readonly shell: WebShell,
  ) {}

  async page(token: string, forwardedHost: string | undefined): Promise<string> {
    const origin = webOrigin(forwardedHost, firebaseProjectId());
    const [view, shell] = await Promise.all([this.view(token), this.shell.get(origin)]);
    return renderPreview(shell ?? FALLBACK_SHELL, previewMeta(view, origin, token));
  }

  private async view(token: string): Promise<SharedEntryView> {
    if (!ShareTokenSchema.safeParse(token).success) {
      return { status: 'removed' };
    }
    try {
      return await this.entries.shared(token);
    } catch (error) {
      this.logger.error(error);
      return { status: 'removed' };
    }
  }
}
