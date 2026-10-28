import { Logger } from '@nestjs/common';
import { WebShell } from './web-shell';

describe('WebShell', () => {
  const page = '<!doctype html><html><head><title>Menu</title></head><body></body></html>';
  const origin = 'https://menu-b29eb.web.app';

  function respond(body: string, ok = true): Response {
    return { ok, text: () => Promise.resolve(body) } as Response;
  }

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it('reads the app’s page from the site and keeps it for a minute', async () => {
    let now = 0;
    const fetch = vi.fn().mockResolvedValue(respond(page));
    const shell = new WebShell(fetch, () => now);
    await expect(shell.get(origin)).resolves.toBe(page);
    now = 59_000;
    await shell.get(origin);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(`${origin}/`, expect.anything());
    now = 61_000;
    await shell.get(origin);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps each site’s page apart', async () => {
    const fetch = vi.fn().mockResolvedValue(respond(page));
    const shell = new WebShell(fetch, () => 0);
    await shell.get(origin);
    await shell.get('https://menu-b29eb--pr1-x.web.app');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('serves the last good page when the site does not answer', async () => {
    let now = 0;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(respond(page))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(respond('', false));
    const shell = new WebShell(fetch, () => now);
    await shell.get(origin);
    now = 120_000;
    await expect(shell.get(origin)).resolves.toBe(page);
    now = 240_000;
    await expect(shell.get(origin)).resolves.toBe(page);
  });

  it('waits a minute before asking a site that failed again', async () => {
    let now = 0;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(respond(page))
      .mockRejectedValue(new Error('offline'));
    const shell = new WebShell(fetch, () => now);
    await shell.get(origin);
    now = 120_000;
    await shell.get(origin);
    now = 130_000;
    await shell.get(origin);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives null when it never read a page', async () => {
    const shell = new WebShell(vi.fn().mockResolvedValue(respond('not a page')), () => 0);
    await expect(shell.get(origin)).resolves.toBeNull();
  });
});
