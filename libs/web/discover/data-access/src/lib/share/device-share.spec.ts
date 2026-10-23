import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { DeviceShare } from './device-share';

describe('DeviceShare', () => {
  function setup(navigator: object): DeviceShare {
    const document = { baseURI: 'https://menu.example/', defaultView: { navigator } };
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: document }] });
    return TestBed.inject(DeviceShare);
  }

  it('opens the share sheet with the full link', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    await expect(setup({ share }).share('/items/1', 'Burger')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Burger', url: 'https://menu.example/items/1' });
  });

  it('copies the link where there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(setup({ clipboard: { writeText } }).share('/items/1', 'x')).resolves.toBe(
      'copied',
    );
    expect(writeText).toHaveBeenCalledWith('https://menu.example/items/1');
  });

  it('tells a cancelled share from a failed one', async () => {
    const cancelled = vi.fn().mockRejectedValue(new DOMException('no', 'AbortError'));
    await expect(setup({ share: cancelled }).share('/', 'x')).resolves.toBe('cancelled');
  });

  it('fails without a share sheet or a clipboard', async () => {
    await expect(setup({}).share('/', 'x')).resolves.toBe('failed');
  });
});
