# 0009. Web domains announce data changes through a shared util

- Status: accepted
- Date: 2026-10-23

## Context

Logging, editing or deleting an entry (the `entries` domain) changes what the discover feed shows: the item's score, its entry count and the "you wrote about this" flag. The feed store lives in `discover`, which may not import `entries` (ADR 0004), and `entries` must not import `discover` either: the direction is `entries <- discover`, and a call the other way would be a cycle. The API side solved the same problem with listener ports (ADR 0006); the web side needs its own small answer.

## Decision

Add `web-shared-util-events` (`platform:web`, `scope:shared`, `type:util`) with one service, `DataChanges`. A domain that writes data calls `notify(topic)`; a domain that shows it watches `version(topic)`, a signal, and reloads when it moves. Topics are a closed union (`'entries'` for now), so each new one is a reviewed change.

The events carry no payload. A reader always refetches from the API, which stays the only source of truth, so no domain learns another's types.

## Consequences

- `entries` pages notify after every successful write; `FeedStore` invalidates and refetches on its next load, keeping the reel the user was on when the refreshed feed still reaches it.
- A notify that no one reads costs nothing; a topic that grows a payload should become a port in a shared lib instead.
- The util must stay small. Anything that starts to look like an app-wide event bus with handlers and payloads gets its own ADR.
- The same slice moves `DeviceLocation` and `DeviceShare` from discover's data-access into `web-shared-util-device` (`platform:web`, `scope:shared`, `type:util`), because entries shares links and discover locates the user. It wraps device APIs only and holds no domain types, under the same rule: it stays small, and anything larger gets its own ADR.
