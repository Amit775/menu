import { sharedEntryLinkPath, type SharedEntryView, type Text } from '@menu/shared/contracts';

export interface PreviewMeta {
  title: string;
  description: string;
  image: string | null;
  url: string;
}

const SITE_NAME = 'Menu';
const GENERIC_DESCRIPTION = 'מה שווה להזמין במסעדות ובברים, מרשומות של סועדים.';
const EXCERPT_CHARS = 120;

// Crawlers send no language, and Hebrew is the app's default (and every name's required one).
function hebrew(text: Text): string {
  return text.he;
}

function excerpt(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > EXCERPT_CHARS ? `${trimmed.slice(0, EXCERPT_CHARS).trimEnd()}…` : trimmed;
}

export function previewMeta(view: SharedEntryView, origin: string, token: string): PreviewMeta {
  const url = `${origin}/${sharedEntryLinkPath(token)}`;
  if (view.status !== 'visible') {
    return { title: SITE_NAME, description: GENERIC_DESCRIPTION, image: null, url };
  }
  const { entry, item } = view;
  const description = [
    entry.rating === null ? '' : `★ ${String(entry.rating)}`,
    excerpt(entry.text),
    entry.authorName,
  ].filter((part) => part !== '');
  return {
    title: `${hebrew(item.name)} · ${hebrew(item.venue.name)}`,
    description: description.length > 0 ? description.join(' · ') : GENERIC_DESCRIPTION,
    image: entry.photoUrl ? `${origin}${entry.photoUrl}` : null,
    url,
  };
}

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** The app's own `index.html` with the entry's tags, so a person who opens the link gets the app. */
export function renderPreview(shell: string, meta: PreviewMeta): string {
  const tags = [
    ['property', 'og:site_name', SITE_NAME],
    ['property', 'og:type', 'article'],
    ['property', 'og:locale', 'he_IL'],
    ['property', 'og:title', meta.title],
    ['property', 'og:description', meta.description],
    ['property', 'og:url', meta.url],
    ...(meta.image ? [['property', 'og:image', meta.image]] : []),
    ['name', 'description', meta.description],
    ['name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary'],
    // Share links are unlisted: a link must not lead a search engine to the entry.
    ['name', 'robots', 'noindex'],
  ]
    .map(([key, name, content]) => `<meta ${key}="${name}" content="${escape(content ?? '')}" />`)
    .join('\n    ');
  // Replacer functions, so a `$'` or `$&` in a diner's words is not read as a replacement pattern.
  const titled = shell.replace(
    /<title>[^<]*<\/title>/,
    () => `<title>${escape(meta.title)}</title>`,
  );
  return titled.replace('</head>', () => `    ${tags}\n  </head>`);
}

/**
 * Where the link was opened: Hosting passes the host it was asked for. Only the
 * site and its preview channels are trusted, since the API fetches the app's page from there.
 */
export function webOrigin(forwardedHost: string | undefined, projectId: string): string {
  const site = new RegExp(
    `^${projectId.replace(/[^\w-]/g, '')}(--[a-z0-9-]+)?\\.(web\\.app|firebaseapp\\.com)$`,
  );
  const host = forwardedHost?.split(',')[0]?.trim() ?? '';
  return site.test(host) ? `https://${host}` : `https://${projectId}.web.app`;
}
