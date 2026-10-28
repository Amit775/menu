import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

export const WEB_FETCH = Symbol('WEB_FETCH');
export const WEB_CLOCK = Symbol('WEB_CLOCK');

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const FRESH_FOR_MS = 60_000;
const TIMEOUT_MS = 3_000;

/** The web app's `index.html`, read from Hosting, because its script names change with every web deploy. */
@Injectable()
export class WebShell {
  private readonly logger = new Logger(WebShell.name);
  private readonly pages = new Map<string, { html: string; readAt: number }>();

  constructor(
    @Inject(WEB_FETCH) private readonly fetch: Fetch,
    @Optional() @Inject(WEB_CLOCK) private readonly now: () => number = Date.now,
  ) {}

  async get(origin: string): Promise<string | null> {
    const known = this.pages.get(origin);
    if (known && this.now() - known.readAt < FRESH_FOR_MS) {
      return known.html;
    }
    try {
      const response = await this.fetch(`${origin}/`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const html = response.ok ? await response.text() : '';
      if (!html.includes('</head>')) {
        throw new Error(`No page at ${origin}/.`);
      }
      this.pages.set(origin, { html, readAt: this.now() });
      return html;
    } catch (error) {
      this.logger.warn(`Could not read the app's page: ${String(error)}`);
      if (!known) {
        return null;
      }
      // Try again in a minute, not on every request, while Hosting is down.
      this.pages.set(origin, { html: known.html, readAt: this.now() });
      return known.html;
    }
  }
}
