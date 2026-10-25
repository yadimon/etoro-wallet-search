# Contributing

Use Node.js 22+ and npm. Install with `npm ci`, then
`npx playwright install chromium`. Run `npm run test:wallet:all` and
`npm run check:wallet:format` before proposing a change. Use
`npm run format:wallet` to apply the shared formatting.

Keep data parsing, financial classification, privilege checks and page UI in
their separate modules. Add regression tests for behavioral/security fixes;
avoid tests that merely repeat an implementation. Synthetic browser fixtures
must intercept every non-extension request, so tests never hit a real account.

All transaction arithmetic uses safe integer minor units. Unknown native types
or statuses stay unknown. Never infer booked payments from a negative amount,
count failed/pending attempts as booked, or merge different currencies. Preserve
the previous good dataset on failed loads. Follow the browser's local calendar
for date filters and the selected eToro language for all visible text. Include
all twenty dictionaries when adding a translation key.

Do not introduce remote executable code, credential extraction, telemetry or
broader host permissions without an explicit feature/privacy review. Financial
actions are outside this project's purpose. A changed eToro export form must be
verified and supported explicitly; do not substitute generic submit-button clicks.

Keep releases reproducible using `scripts/build-wallet-search.mjs`. Update the
manifest version, changelog, installation instructions and privacy disclosures
when behavior changes. Never patch only generated files in `dist/`.

Commit messages follow Conventional Commits, for example
`fix: reject malformed Wallet pagination`. On Windows, use PowerShell-compatible
commands and UTF-8. Never include real exports, environment files, signed links
or account screenshots in patches or issues. Use [SECURITY.md](SECURITY.md) for
vulnerability reports.

The project uses [PolyForm Noncommercial 1.0.0](LICENSE), a source-available
license. Contributions retain their authors' copyright and are reviewed
individually. A pull request does not grant the maintainer a copyright assignment
or special commercial relicensing rights. Any such permission requires a separate
explicit agreement before acceptance. See [COMMERCIAL.md](COMMERCIAL.md).
