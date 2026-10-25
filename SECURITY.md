# Security

## Scope and supported version

Security fixes target the latest release. Version 0.5.0 was reviewed locally on
2026-10-24; the findings and verification are in
[the audit report](wallet-search/docs/CODE-AUDIT.md). This is a code review with
regression tests, not an independent penetration test or a guarantee of no defects.

Version 0.6.0 adds cache-first automatic reads on Wallet visits, with overlapping
request reuse and the same host/data bounds. Automatic failures never open the
native export UI. Interactive fallback still requires a user-triggered load.
Disabling the page instance aborts its active work and startup timer.

The extension reads eToro Wallet history and displays search/statistics. It does
not implement payment, transfer, trade, cancellation or account-setting actions.
It cannot authorize financial actions on the user's behalf.

## Trust boundaries

- The content UI runs in the eToro page's MAIN world to use its existing Wallet
  HTTP client and export UI. Other scripts on that origin can observe the UI and
  `window.postMessage` traffic. Shadow DOM and random request IDs are not security
  boundaries against those scripts. A compromised eToro page remains a risk.
- The isolated relay and worker validate the exact Wallet origin/route, top frame,
  extension identity, message ID, operation and cache scope. The worker repeats
  validation. Per-document and global limits bound privileged concurrent work.
- Export requests accept HTTPS only for eToro or a syntactically valid Azure Blob
  account host. The optional permission is limited to Azure Blob storage, and the
  popup requests only the exact discovered origin. Existing broad Chrome grants
  do not bypass this code-level allowlist. No localhost/private-IP host is allowed.
- The worker fixes GET, omits cookies, rejects redirects, omits referrers, limits
  streamed bytes and masks failures. No caller-provided headers/body are accepted.
- A signed export link is a temporary bearer URL. It is used in memory and is not
  stored in the cache, exposed in diagnostics or sent to a developer service.
- Cache storage is local IndexedDB for the extension or GM storage for the
  userscript. There is no application-level cache encryption, retention expiry,
  remote backup or account-wide purge button. Account/currency/time-zone scopes
  are separated, but hashes are identifiers, not encryption or authorization.

Merchant descriptions, amounts and imported values are untrusted data. They are
rendered with textContent. Malformed pagination, invalid date ranges/currencies,
oversized input and unsafe integer totals are rejected. The native export
fallback submits only the known export component, never a generic date form.
Unexpected redesigns fail instead of broadening form-submission heuristics.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/yadimon/etoro-wallet-search/security/advisories/new)
or email [chrome.ext.dev.contact@gorelenkov.dev](mailto:chrome.ext.dev.contact@gorelenkov.dev).
Do not use public issues for security-sensitive material.

Include the affected version, minimal reproduction and impact. Use synthetic
transactions. Do not attach real TSV/CSV exports, credentials, account details,
cookies, signed URLs, HAR files or screenshots of a real Wallet to public issues.

## Maintainer checks

```text
npm ci
npx playwright install chromium
npm run test:wallet:all
npm run check:wallet:format
npm audit
npm run package:wallet:source
```

Run tests in disposable profiles with intercepted synthetic endpoints. Do not
automate tests against a funded account. Do not commit private local files. A
release upload uses the extension ZIP; the source ZIP is for repository setup.
