# 0017. Share links render their preview in the API

- Status: accepted
- Date: 2026-10-28

## Context

People share entries as `/e/<token>` links, mostly on WhatsApp. Link previews come from crawlers that read Open Graph tags from the first HTML response and run no script, but the web app is a client-side SPA (ADR 0001) whose `index.html` is the same for every route. The next-phase plan (Q5) picked an API-rendered page behind a Hosting rewrite over server-side rendering the app.

## Decision

- Hosting rewrites `/e/*` to the Cloud Run API, above the SPA fallback. Nest serves `GET /e/:token` outside the `/api` prefix (`sharedEntryLinkRoute`, excluded in `main.ts`).
- The API answers with the web app's own `index.html`, read from Hosting (`/`) and kept for a minute, with the entry's Open Graph and Twitter tags and `robots: noindex` added. A person who opens the link gets the app as on any other route; a crawler gets the tags.
- What the preview shows follows the rules of `GET /api/shared/:token`: a visible entry shows the item, venue, rating, a short excerpt, the author's display name and the photo; a private, hidden, deleted or malformed link gets the same generic preview, so a preview reveals nothing the link itself would not.
- The page is read from the host the link was opened on when it is the site or one of its preview channels (`<project>--<channel>.web.app`), else from the live site; any other `X-Forwarded-Host` is ignored. If the page was never read, a minimal page with the tags and a link home is served.
- Responses are `Cache-Control: no-cache`, so an entry made private stops showing at once (crawlers keep their own copy, which we cannot recall).

## Consequences

- No SSR and no new dependency; the API makes one extra request to Hosting a minute per host.
- Previews are in Hebrew, the app's default, since crawlers send no language.
- Only the Firebase hosts are trusted. A custom domain would fall back to the `web.app` site for the page, `og:url` and `og:image` until it is added to `webOrigin`.
- Other shareable routes (items, venues) can follow the same pattern with their own rewrite.
