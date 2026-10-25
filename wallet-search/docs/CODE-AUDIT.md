# Code review: 0.5.0

This report records version 0.5.0. Version 0.6.0 adds automatic startup refresh
and revised controls; see [the changelog](CHANGELOG.md) and
[current architecture](ARCHITECTURE.md) for its behavior and regression scope.

Reviewed locally on 2026-10-24. Scope: Wallet extension/userscript, data and cache
modules, messaging, permissions, release packaging, tests and project dependency
advisories. Real exports and environment secrets were not opened for this review.
This is not an independent security certification.

## Findings and changes

| Finding                                                            | Impact                                                                                         | Resolution                                                                                                                                                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Optional `https://*/*` scope and generic HTTPS export acceptance   | A page could request unnecessarily broad privileged network access after consent               | Azure-only optional scope, shared host allowlist, exact-origin popup request and worker revalidation; arbitrary/private-IP destinations rejected even if an older install retains permissions |
| Generic date-form submit discovery                                 | A changed export layout could select an unrelated form's submit button                         | Require the known native export component before changing fields or submitting; unrelated-form regression test                                                                                |
| Duplicate bridge clients and no global worker request bound        | Inconsistent cleanup and avoidable memory/network amplification                                | Shared client and independently validated worker handler; four requests per document, sixteen globally                                                                                        |
| Repeated acknowledgements renewed deadlines                        | A page could hold a bridge request open indefinitely                                           | Accept the first acknowledgement only; remove listeners/timers on completion, abort or clone error                                                                                            |
| Site client could ignore timeout cancellation                      | Cancel/outer timeout could leave the UI busy                                                   | Abort race settles independently of the site client's promise; late failure is consumed                                                                                                       |
| Prototype-inherited enum lookup and permissive pagination envelope | Malformed values could become unexpected classifications or prematurely end history            | Own numeric enum checks and strict boolean/cursor validation; unknown values stay unknown                                                                                                     |
| Cache range/tuple validation gaps                                  | Non-calendar ranges, mismatched currencies and malformed original currencies could be accepted | Strict local dates/context, tuple and per-record byte validation; invalid snapshots discarded                                                                                                 |
| Pending/failed aggregate overflow checked too late                 | A chart error could occur after replacing the previous good dataset                            | Validate all-status safe-integer totals before memory/cache commits                                                                                                                           |
| Cache open/transaction could block indefinitely                    | Requests could occupy bridge slots after client timeout                                        | Blocked-open rejection and bounded IndexedDB operations                                                                                                                                       |
| Compressed source and no public contribution/security guide        | Harder review and unsafe repository publication                                                | Shared formatter, readable source modules, architecture, security/privacy/contribution/publication docs and allowlisted source archive                                                        |

`npm audit` initially reported five vulnerable packages (one critical, two high,
two moderate) in the separate `mcp-remote` dependency tree. A compatible
`npm audit fix --ignore-scripts` updated the lock without changing its direct
version or using `--force`; the subsequent audit reported zero advisories.
Those packages were never included in the extension ZIP. This registry check
does not prove every transitive feature was exploitable in this workspace.

## Verification

Final local verification for this change:

- Node.js 22.22.3: **44/44 Node tests passed**.
- Playwright 1.64.1: **140/140 browser tests passed**, including both Berlin and
  New York and the new security regressions.
- Formatting and allowlisted-source UTF-8 checks passed.
- Full workspace `npm audit`: **0 known vulnerabilities** after the lock update.
- Source archive extracted into a fresh directory: `npm ci --ignore-scripts`,
  build, 44 Node tests and formatting all passed without MCP dependencies.
- That standalone source build produced a byte-identical extension ZIP.

Run the commands in [CONTRIBUTING.md](../../CONTRIBUTING.md). Regression coverage
includes forged origins/senders/frames, invalid UUIDs/scopes, host lookalikes,
fixed GET/cookie/redirect behavior, cross-document cancellation, worker limits,
malformed pagination, inherited enum keys, invalid cache tuples and preservation
of good data on all-status overflow. Browser tests use synthetic endpoints only.
The final execution counts are reported with this change; do not mistake older
live acceptance receipts for a live acceptance of version 0.5.0.

## Remaining limits

- MAIN-world code, open Shadow DOM and postMessage share the eToro page's trust
  context. Random IDs prevent mix-ups; they do not authenticate against a
  malicious script on that origin. Moving all data handling into an isolated
  world would be a separate architectural change with compatibility tradeoffs.
- Cached financial records have no additional encryption or automatic expiry.
  Clearing removes the current account/currency/zone snapshot, not every scope.
  An attacker controlling the local browser profile is outside the protection
  provided by the account hash.
- The native endpoint/client, enum mapping and export/layout selectors are
  unofficial and can change. Unknown pagination/form/host structures fail;
  adding another export provider requires an explicit policy update.
- Historical corrections outside automatic overlap/pending windows need a full
  refresh. Startup restores cache without automatically fetching fresh history.
- The installed Tampermonkey manager and every real eToro region are not covered
  by synthetic adapter tests. Version 0.5.0 still needs user-side extension reload
  and live smoke testing; the browser tool cannot manage chrome://extensions.
- Store privacy URL, maintainer contact, listing artwork, review access and a
  selected open-source license remain publisher tasks. No public release was made.
