# eToro Wallet Search 0.6.0

An unofficial Chrome Manifest V3 extension and Tampermonkey script for the existing eToro Wallet page. Opening Wallet shows cached history immediately and starts a background refresh of new and unresolved records. The first visit without cached coverage loads history once; subsequent automatic visits leave older historical gaps alone.

The header contains the loaded count, **Refresh** with a loading icon, and **Disable extension**. Search results show only the matching count. Disable applies to this page until reload and keeps the cache. Background failure preserves cached data without opening an export dialog; manual search/refresh can use the native export fallback.

**Statistics** expands at the bottom of the search panel. Select a **year** to see its booked totals and monthly stacked bars; there is no month selector. Payments, Transfers and All have separate presets. Hovering or focusing a month/segment shows exact amounts and counts without changing annual totals. The accordion animates over 300 ms, supports quick reversal and respects reduced motion. There is no file-import UI.

## Install or update

- Documentation: [architecture](docs/ARCHITECTURE.md), [audit](docs/CODE-AUDIT.md),
  [security](../SECURITY.md), [privacy draft](docs/PRIVACY.md),
  [publishing guide in German](docs/PUBLISH.de.md), [changelog](docs/CHANGELOG.md).
- ZIP: `dist/etoro-wallet-search-extension-0.6.0.zip` (also `dist/etoro-wallet-search-extension.zip`).
- Ready directories: `dist/chrome-extension` and `dist/etoro-wallet-search-extension`. Every build updates both with identical packaged files.
- Userscript: `dist/etoro-wallet-search.user.js`.
- Instructions: [German](extension/INSTALL.de.md), [Russian](extension/INSTALL.ru.md).
- Integrity: `dist/SHA256SUMS.txt`.

Load the directory containing `manifest.json` using **Load unpacked** in `chrome://extensions`. For an existing installation, replace its files, reload the extension and reload Wallet. Use either the extension or Tampermonkey. Running both can replace one instance with the other.

## Data source and financial meaning

The native Wallet client was inspected on 2026-10-24. Its existing transaction-list request is a same-origin read-only POST with `{}` and cursor/item-count query parameters. The adapter discovers that exact account-specific URL and the native page size from the page's Resource Timing entries, not from guessed account IDs. It uses the already-loaded site's `$http` client when available, including its normal authentication interceptors; otherwise it uses same-origin fetch. It never reads cookies, extracts session tokens or configures API keys. No transfer, payment, account-setting or transaction-cancellation endpoint is used. Each page carries a fresh request ID. Only whitelisted failure codes and the transport name are exposed as DOM diagnostic attributes; no response body, URL or credential is logged.

Native `customerTransactionType` and `transactionAnnotation` codes distinguish:

- card/direct-debit payments;
- transfers into/out of Wallet (including bank payments);
- cash withdrawals, refunds, fees, balance adjustments and unknown other flows;
- booked, pending, cancelled/declined/reversed/returned/expired, and unknown status.

Only **booked** transactions enter incoming/outgoing/net financial totals, including the booked totals shown inside chart tooltips. Pending and failed attempts are searchable and can appear as separate chart layers, with reduced opacity or hatching. They never become booked spending merely because their checkboxes are enabled. Filtering a search does not change monthly statistics. Chart category choices change the monthly breakdown; status layers do not inflate its booked metrics. Card/direct-debit payments and transfers use separate native type codes, colors, checkboxes and presets. The default Payments preset excludes transfers, cash withdrawals, fees and refunds; these remain individually selectable. Unknown enum values remain explicitly unknown.

If the native listing is unavailable, the existing native export dialog remains a fallback. Its date fields and submit button are found by form structure in every language. The emitted HTTPS/data/Blob file is read automatically; no manual import button remains. During this automatic capture, the final export link is read into memory and its navigation/download is suppressed, so an inline TSV response cannot replace the Wallet tab. Unrelated links retain their behavior. The observed TSV's nine columns contain no type/status, so the fallback only enriches uniquely matched visible native rows. Everything else remains unknown; a debit alone is not classified as a card payment. Unknown rows and missing classifications are disclosed in the UI. If reliable type/status data is entirely absent for a year, category metrics show a dash and a clear explanation instead of implying zero spending. Explicitly selecting All and Unknown can still display those unclassified chart layers. Export capture includes detached anchor clicks, cached Blob creation, dispatched clicks, fetch and XHR, with temporary hooks restored exactly on completion/cancellation/failure.

The native API adapter assumes descending chronological pagination, as used by the native history list. A date-bounded request can stop after a descending page crosses its oldest requested date. Duplicate cursor/page errors, unexpected currencies, malformed rows, aggregate overflow and data limits fail without erasing the current good dataset.

## Persistent local cache

All fetched records persist in the extension's own IndexedDB, or in Tampermonkey's GM storage, including recent, pending and failed entries. Incremental loading overlaps the last successfully fetched local date to capture new entries on that same date. It also extends back to the oldest pending or unknown-status date within the preceding **42 local calendar days**, when that date belongs to the requested period. An unknown status is rechecked rather than assumed final. This replaces the fixed seven-day refresh window. Requested historical gaps are filled too. A longer absence does not truncate new history to six weeks.

The 42-day cap is this extension's automatic revalidation policy, not an eToro settlement deadline. Older pending records retain their pending status and remain visible; they are never automatically counted as booked or cancelled. **Refresh** explicitly rechecks the selected period, including those older entries. A successful response authoritatively replaces its local period, updating amounts/statuses and removing rows that disappeared, while preserving other periods and legitimate distinct transactions. A failed refresh preserves the last good in-memory and persistent datasets.

Cache keys hash the account identity, currency and browser time zone. Raw account identifiers are not cache keys or exposed in the public status object. Different accounts/currencies/time zones cannot accidentally reuse a snapshot. The extension's IndexedDB transactions merge range updates atomically across tabs instead of overwriting another tab's cached period. Compact record tuples limit message size. Empty historical ranges are cached as coverage too.

Opening Wallet restores the complete cached dataset and automatically checks forward from the latest verified day, extending to the oldest eligible pending/unknown day within 42 days. Older uncached periods are not filled by this background operation. Search or opening Statistics fills requested missing periods. Historical searches with complete coverage and no eligible pending records avoid a new data request. Native pagination stops after the requested oldest date is crossed; its boundary page can contain older rows that are discarded from this refresh. Background completion keeps the current filters and scroll position. A user search can share an already active refresh. The TSV fallback depends on the range returned by eToro and requires a user-triggered load. **Clear local cache** deletes the current account/currency/time-zone snapshot and its memory view; a later Wallet opening can retrieve history again. Disabling this page preserves cache and cancels current work. Native eToro history is unchanged.

Schema 4 reuses the existing account keys, IndexedDB database and GM storage. On migration from schema 3, visible cached rows are retained, but requested coverage is rebuilt once because the old snapshot omitted recent and pending rows. No private export files or account data are included in releases.

## Permissions and privacy

Required hosts are only `https://www.etoro.com/*` and the export server actually observed on this account, `https://prodfileexportwe.blob.core.windows.net/*`. New installations grant these during installation, avoiding the separate first-import host prompt for this server. The named extension permission remains only `scripting`; IndexedDB needs no `storage` permission. There is no `cookies`, `downloads`, `webRequest`, analytics, remote code, telemetry or upload service.

Other **Azure Blob** export origins stay optional under `https://*.blob.core.windows.net/*`. If another region uses a different Azure host and page fetch is blocked, the popup can ask for that **exact** HTTPS origin. Arbitrary websites, private-IP destinations and host lookalikes are rejected even if an older installation retains broader permissions. A new export provider requires an explicit policy update. The worker independently validates Wallet sender/frame/route, operation and request ID, checks granted access, fixes GET with cookies omitted, rejects redirects and bounds streamed bytes and concurrent work. Signed URLs are transient and do not appear in cache or UI errors.

The UI is in Shadow DOM. Existing balance, account details and action buttons remain intact. Native transaction/header nodes are only hidden after data is available; removing the panel restores their literal markup and preserves concurrent native style changes. Merchant strings are rendered with `textContent`; CSV/HTML/formulas are not executed. SPA navigation clears the previous in-memory view and selects the new cache scope.

The public window controller exposes only metadata and UI actions, not transaction arrays. The cache relay carries local data between page and extension contexts. Other scripts on the eToro origin can observe those messages and the open Shadow DOM. This integration does not provide isolation from a compromised eToro page. The local cache has no additional application-level encryption or automatic expiry. No developer upload service receives the dataset.

## Languages and time

All **20 languages in the current eToro language picker** are included: English, Spanish, Italian, German, Russian, Simplified Chinese, French, Arabic, Traditional Chinese, Polish, Dutch, Norwegian Bokmål, Portuguese, Swedish, Czech, Danish, Romanian, Vietnamese, Finnish and Greek. Language follows the site's HTML language or its loaded native locale script. Popup and offline help use the same complete dictionary. Arabic uses RTL layout; chart order remains chronological. Dates, month names, currencies and numbers use Intl for the selected language.

Native ISO offsets are respected, including .NET-style fractional seconds. The observed unzoned CSV timestamps are interpreted as UTC, as they matched native Berlin times after a two-hour conversion. Dates are converted into the browser's IANA time zone before filtering/month grouping. Date-only values stay calendar dates. The CSV export range is padded for UTC boundaries.

## Limits and validation

At most 200,000 transactions and 32 MiB of data per load. The virtual list renders a small bounded row window, including for 50,000 records. Load/capture operations can be cancelled and have bounded timeouts. Historical state is retained if a new load fails.

```text
npm ci
npx playwright install chromium
npm run test:wallet:all
```

Node tests cover parsing, precise cents, UTC/DST, native categories/statuses, chart layers, incremental checkpoints, 42-day boundaries, cache migration/identity/merging, all translation keys, safe file transport and portable release artifacts. Browser tests run the real unpacked extension in disposable Chromium profiles with synthetic intercepted endpoints. They cover all twenty languages, RTL, narrow layouts, the real popup/worker/IndexedDB pipeline, complete cache reloads, incremental pagination, account separation, pending settlement/expiry policy, failed-refresh retention, v3 migration, concurrent tabs, all filters, payment/transfer presets, immediate hover and keyboard tooltips, stacked layers, pagination, 50,000-row scrolling, text-only malicious labels, SPA, native restoration, legacy export paths and standalone userscript/GM adapters. Playwright's full clock intentionally empties Resource Timing, so the fixture anchors Date only and keeps real performance entries for native endpoint discovery. No automated fixture request reaches the live eToro service.

HTML report: `test-results/wallet-report/index.html`. JSON report: `test-results/wallet-report.json`. Real-account screenshots and acceptance results stay local under `test-results/` and are not packaged.

Live acceptance of v0.4.0 on 2026-10-24 confirmed the authenticated native listing, real type/status classification, separate payment/transfer presets, unchanged booked totals when status layers are toggled, combined local search filters, full cache restoration after reload and a single additional API page for the subsequent incremental search. The older Tampermonkey script had been replacing the extension; disabling that script resolved the conflict. Live receipts and screenshots remain in the ignored `test-results/` directory.

Live acceptance of v0.4.1 confirmed that the native accordion opens and closes inside the search card, starts collapsed and replaces the heading's separate Statistics button.

Live acceptance of v0.4.2 confirmed the 0.3-second chevron transition, intermediate content height/opacity during closing and reversal, and restoration of natural height after expansion. Browser tests additionally cover reduced motion, asynchronous content growth and cleanup during animation.

Tampermonkey grants are `GM_xmlhttpRequest`, `GM_getValue`, `GM_setValue`, `GM_deleteValue`, with raw page access and eToro/Azure Blob servers in `@connect`; there is no wildcard allowing arbitrary websites. Another Azure host may still require manager consent. Console-only execution has no privileged persistent cache/transport. Testing the installed Tampermonkey manager itself remains separate from the GM adapter browser tests.

Official references: [Chrome MAIN world](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts#world), [optional host permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [Tampermonkey connections](https://www.tampermonkey.net/documentation.php?locale=en&q=connect), [GM requests](https://www.tampermonkey.net/documentation.php?locale=en&q=GM_xmlhttpRequest), [Playwright extensions](https://playwright.dev/docs/chrome-extensions).
