import { Test } from '@nestjs/testing';
import { SharedEntryLinkController } from './shared-entry-link.controller';
import { SharePreviewService } from './share-preview.service';

describe('SharedEntryLinkController', () => {
  it('serves the preview page for the link and the host it was opened on', async () => {
    const page = vi.fn().mockResolvedValue('<html></html>');
    const moduleRef = await Test.createTestingModule({
      controllers: [SharedEntryLinkController],
      providers: [{ provide: SharePreviewService, useValue: { page } }],
    }).compile();
    await expect(
      moduleRef.get(SharedEntryLinkController).page('abcdefghijklmnopqrstuv', 'menu-b29eb.web.app'),
    ).resolves.toBe('<html></html>');
    expect(page).toHaveBeenCalledWith('abcdefghijklmnopqrstuv', 'menu-b29eb.web.app');
  });
});
