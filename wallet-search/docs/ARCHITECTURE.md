# Architecture and development

## Runtime

| Module                        | Responsibility                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `core.mjs`                    | CSV/TSV decoding, integer amounts, timestamps, filters, coverage and merging          |
| `data.mjs`                    | Native enum classification, booked totals, chart layers and validated cache snapshots |
| `policy.mjs`                  | Shared Wallet route, host, ID and concurrency rules                                   |
| `transport.mjs`               | Bounded byte reads, Base64 and abortable client promises                              |
| `bridge-client.mjs`           | Page request/ack/result protocol with bounded lifetimes and cleanup                   |
| `bridge.mjs`                  | Worker authorization, request limits, export reads and cache dispatch                 |
| `cache-store.mjs`             | Atomic IndexedDB transactions, blocked-open and transaction timeouts                  |
| `cache-client.mjs`            | Extension bridge / Tampermonkey GM storage adapters                                   |
| `native.mjs`                  | Observed read-only Wallet endpoint, native client and constrained export capture      |
| `layout.mjs`                  | Maintained layout selectors and conservative visual inference                         |
| `browser.mjs`                 | Panel lifecycle, filters, virtual list, account changes and data commits              |
| `charts.mjs`, `accordion.mjs` | SVG chart interactions and cancellable 300 ms disclosure animation                    |
| `i18n.mjs`                    | Twenty complete dictionaries and eToro language detection                             |
| `extension/`                  | MV3 manifest, isolated relay, worker entry point, popup and offline help              |

The build bundles local ES modules into classic content/worker scripts without
eval or remote imports. The popup/help use packaged ES modules. The bundle
stripper intentionally supports only this project's named relative imports and
declaration exports; introducing another module syntax requires updating it.
Generated classic scripts are syntax-checked by artifact tests and exercised in
the real extension browser tests.

## Data flow

1. Mount only on `/wallet/account/CCC`, preserve native balance/details/actions,
   derive an account/currency/time-zone scope and restore its local cache.
2. Startup restores cache immediately, then refreshes forward from the latest
   verified local day and the oldest eligible pending/unknown day within 42 days.
   It leaves older uncovered periods alone. A first visit without coverage loads
   history once. Search/Enter or opening Statistics can fill requested gaps;
   typing/selecting filters applies local data. Statistics selects only a year
   and shows annual totals with monthly hover/focus details. Refresh in the header
   forces the selected search date range; the loaded count appears there only.
3. Discover the already-observed transaction-list path from Resource Timing.
   Use the site's own HTTP client and interceptors, or same-origin fetch. Its
   listing POST sends an empty object; no mutation endpoint is implemented.
4. Read descending pages with cursor, byte, row and cancellation bounds. Native
   pagination is expected to be descending; a page crossing the requested lower
   date can terminate the load. Malformed envelopes are rejected.
5. On a user-triggered load, when native data is unavailable, open the known native export component and
   read its emitted TSV/Blob/data link. Temporary hooks are restored on every
   completion path. Unknown form layouts are not submitted. Background startup
   loads never open export dialogs/downloads; a failure preserves cache and offers
   manual retry. Overlapping requests share the active load when its range covers
   the new request. A search joining a background load explicitly allows fallback.
6. Validate classifications and all-status integer totals before replacing the
   current dataset. Persist only validated compact records and range metadata.
   Failure retains the last good data. Persistence failure leaves usable memory
   data and reports that the cache is unavailable.

The public page controller exposes status and UI actions, not record arrays.
Status includes initialization/busy flags for accessibility and diagnostics.
The header refresh button spins while any data request is active, respects reduced
motion, disables repeated refresh and resets on success, failure or cancellation.
Background completion preserves the local search and scroll position. Disabling
the extension removes this page instance, cancels its work and retains its cache;
reloading enables a new instance. The tooltip explains this in every UI language.
Bridge responses do carry records on the eToro origin. See [SECURITY.md](../../SECURITY.md)
before treating the page/extension split as a confidentiality boundary.

## Cache

Database `wallet-search-local-v3`, object store `accounts`, snapshot schema 4.
Scope = SHA-256 of a versioned tuple of account identity, currency and IANA zone.
Identity uses the visible profile link and validated account IBAN, or the observed
native account path when available. Raw identity is not persisted as a cache key.
Hashes do not make the financial record contents anonymous or encrypted.

Compact record order is ID, label, UTC milliseconds, signed minor units,
currency, original minor units, original currency, category, status, date-only.
Local day/month and normalized search text are reconstructed on read.
Coverage ranges include empty periods. Incremental reads overlap the last
verified local day and the oldest pending/unknown day within 42 local days.
Old pending entries keep their status until explicit refresh. This policy is
not an eToro settlement guarantee. Schema 3 migration retains visible records
and rebuilds coverage once. Cache updates merge in one IndexedDB transaction.

## Tests and maintenance

Node tests exercise parser, time-zone, classification, overflow, bridge guards,
host policy and package invariants. Playwright loads the real unpacked MV3
extension in disposable Chromium profiles in Berlin and New York, intercepting
all external requests with synthetic data. Tests include all site languages,
Arabic RTL, hostile labels, 50,000 rows, persistence, multi-tab merges, fallback
capture, cancellation and accordion accessibility/motion.

`test-results/` can contain private manual acceptance receipts and is never part
of a release/source archive. Automated tests do not read those receipts. The
root workspace's MCP dependency is unrelated to the extension; the source
archive has a separate minimal package/lock containing only development tools.
