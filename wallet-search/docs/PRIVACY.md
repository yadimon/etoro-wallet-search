# Privacy policy

Product: eToro Wallet Search. Publisher: Dmitry Gorelenkov (yadimon).
Privacy/support contact:
[chrome.ext.dev.contact@gorelenkov.dev](mailto:chrome.ext.dev.contact@gorelenkov.dev).
Effective: 2026-10-25. Version: 0.6.0.
Publisher and postal information are available in the
[Impressum](https://yadimon.github.io/etoro-wallet-search/legal.html).
This unofficial extension searches and displays your eToro Wallet history and
monthly statistics. It is not affiliated with eToro.

### Information processed

The extension reads transaction IDs, merchant/counterparty descriptions,
dates/times, amounts, currencies, original amounts, types and statuses from your
existing Wallet listing or export. Descriptions may contain personal names.
The visible eToro profile link and validated account IBAN, or observed account
path, derive a hashed local cache identity. Raw identity is not stored as a cache
key. Currency, time zone and date coverage are retained. Hashing does not
anonymize or encrypt the financial records.

### Use and network access

Data is used only for Wallet search, display, monthly statistics and incremental
local caching. Existing authenticated eToro requests retrieve history; native
export is a fallback. Export files may be read over HTTPS from eToro's Azure Blob
service. Another Azure origin may require exact-origin browser permission.
No developer analytics, telemetry, advertising, upload or backup service receives
the transaction dataset. Financial records are not sold or used for credit decisions.
Normal eToro/export-host request handling remains subject to those services'
privacy practices.

To locate the existing Wallet listing, the extension examines resource URLs on
the eToro page. During a user-triggered export fallback, it temporarily observes
fetch/XHR responses, generated file links and download clicks on that page to
read the requested transaction export. This limited network/click observation
supports the import; it is not an analytics or general browsing-activity service.
The temporary export hooks are removed when that import finishes or is cancelled.

The site's existing HTTP client/browser session authenticates eToro requests.
The extension does not extract or persist passwords, session tokens, cookies or
API keys. Signed export links are transient and are not cached. Arbitrary websites
are not accessed.

Opening Wallet shows cached history immediately and automatically checks new
dates and unresolved entries in the background. The first opening without cached
coverage retrieves history once. Older uncovered periods are loaded when requested
by search/statistics. Background failure retains saved data and does not open an
export dialog; interactive export fallback requires a user-triggered load. Manual
Refresh rechecks the selected date range. Disabling affects the current page until
reload, retains its cache and cancels current work. After clearing a cache, a later
page opening can retrieve history again through the normal automatic read.

### Storage, retention and deletion

The extension uses local IndexedDB; Tampermonkey uses local userscript storage.
There is no extension sync or additional application-level encryption. Loaded
records remain until the applicable cache or corresponding browser/manager
storage is removed. The 42-day pending recheck window is not a retention expiry.
Clear local cache removes the current account/currency/time-zone snapshot and
in-memory records. Other scopes must be cleared separately. Removing the panel
preserves its cache. These controls do not delete eToro history.

### Integration and security

The UI/native client run in the eToro page context. Other scripts on that origin
can observe rendered results and bridge messages. There is no confidentiality
guarantee against a compromised eToro page or local browser profile. Hosts,
requests, payloads and sizes are validated; imported text is not executed, and
extension code is packaged locally.

### Support and changes

Contact chrome.ext.dev.contact@gorelenkov.dev for privacy questions. Do not post real exports, account details
or screenshots in public issues. Before requesting private support material, the
publisher must explain its actual support-data handling and retention separately.
Material data-practice changes require updated notices and applicable consent.

### Purpose limitation

Financial/payment information, identifying account/profile information, website
content and the limited network/download-click observation described above are
handled only for the extension's Wallet search, display, statistics and cache
features. They are not used for advertising, creditworthiness, lending or unrelated
purposes. The publisher does not receive the transaction dataset or allow people
to read it through a developer service. This usage is limited to the disclosed
user-facing purpose, consistent with the Chrome Web Store User Data Policy.

### Project website and hosting

The project website is hosted on GitHub Pages. It contains no developer analytics,
advertising, contact form, external fonts or executable scripts and sets no
application cookies. GitHub processes technical request information when serving
the website under its own
[privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
Visiting the website does not give the publisher access to Wallet records.
Following links to eToro, GitHub or the Chrome Web Store involves those services
under their own privacy practices.

### Contact correspondence

If you email the publisher, the address and content you send are used to answer
and handle your request. Use synthetic examples; no real transaction exports are
needed for an initial support request. Correspondence is kept only as necessary
to handle the request and any applicable obligations; it is not used for marketing.
Public GitHub issues are visible to others, so they must not contain private
account data. Privacy and deletion requests can be sent to the contact above.
The publisher cannot remotely view or erase an extension cache on your device;
use the local deletion controls described above.

### Privacy requests and legal bases

Where the GDPR applies, contact correspondence is processed to respond to requests
and maintain support under Article 6(1)(f), or to take requested steps concerning
a contract under Article 6(1)(b), where applicable. Any mandatory legal retention
is based on Article 6(1)(c). The publisher has no developer-side transaction
database to search or disclose about you.

Depending on the circumstances and applicable law, you may request access,
correction, erasure, restriction or portability of personal information held by
the publisher, object to processing based on legitimate interests, and withdraw
any consent on which processing relies. You may also complain to the competent
data protection supervisory authority. Send requests to the privacy contact above.
