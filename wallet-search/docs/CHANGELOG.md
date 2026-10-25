# Changelog

## 0.6.0 — 2026-10-25

- Show cached records immediately on Wallet visits, then refresh new dates and
  eligible pending/unknown records in the background. Do not fill older historical
  gaps automatically. The first visit without coverage loads history once.
- Keep background failures from opening export dialogs or clearing cached data.
- Share overlapping loads to avoid duplicate requests; preserve local filters
  and scroll position during background completion.
- Move Refresh and the loaded count to the header. Add a cancellable busy state,
  spinning refresh icon and reduced-motion handling. Search results show only
  their matching count, without duplicating global metadata.
- Replace the month/year selector with a year selector and annual totals; keep
  monthly chart details on hover/focus.
- Rename Remove to Disable extension in all twenty languages, including its
  page-only lifetime tooltip, popup and offline help.
- Add browser regression coverage for automatic refresh, history boundaries,
  cache-first rendering, failure recovery, loading UX and year-only statistics.

## 0.5.0 — 2026-10-24

- Restrict optional export permissions and URL validation to Azure Blob origins.
- Require the known native export component; do not populate/submit unrelated forms.
- Share and document bridge/policy code; validate worker requests independently
  and limit privileged concurrent work per document and globally.
- Bound acknowledgement lifetimes, consume late client failures and let Cancel
  settle even if a native HTTP client ignores cancellation.
- Validate native pagination, enum keys, cache dates/currencies and all-status
  integer totals before replacing good data. Bound blocked IndexedDB work.
- Format source and document architecture, trust boundaries, privacy, contribution
  workflow, code-review findings and Chrome Web Store publication.
- Add a separate allowlisted source archive with a minimal development lockfile.
- Update vulnerable transitive dependencies in the separate workspace MCP tools.

Version 0.5.0 restores cache on startup and fetches on search or
statistics interaction. No automatic background refresh was added. Source
licensing, public privacy/contact URLs, review access and listing artwork remain
owner decisions. No public release was performed.
