# web-shared-util-events

`DataChanges`: lets one web domain tell another that data it shows has changed (ADR 0009). The entries pages notify `entries` after a save or delete; discover reloads its feed when that version moves.

Run `pnpm nx test web-shared-util-events` for the unit tests.
