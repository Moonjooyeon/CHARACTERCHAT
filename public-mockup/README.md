# 온서 공개 목업

A separate presentation-only Site built from public catalog content and approved public artwork. It is not connected to the private working application.

## Demo boundary

- 32 catalog profiles, including 3 multi-character simulations; 28 approved original character portraits, their 106 proportional transport derivatives, and the existing neutral slime placeholder. Original fallbacks remain unchanged.
- Source catalog extraction uses an explicit public-field allowlist. No source module is executed.
- No backend, account, database, object-storage binding, private endpoint, remote provider, cookie, browser storage, analytics, or user-content publishing.
- Persona, sample chat, tracker, and virtual-credit state exist only in the current page's memory and reset on reload.
- Dialogue replies are labeled scripted samples. Test checkout displays only virtual credits and a real charge of ₩0. No payment processor, real card fields, receipts, subscription, or charges.
- Snapshot opens only a confirmation and disabled Generate button.
- CSP disallows all connection requests. All application resources are local to this Site. Search indexing is discouraged via noindex/nofollow and robots.txt.

## Validation

Run `node scripts/verify.mjs`. This checks output inventory, public DTO keys, all local references, JavaScript syntax, no external URLs or application network clients, no bindings, and required demo labels. Actual browser and anonymous-access checks are separate from source validation.

## Publication

The Site starts owner-private. Change this specific mockup to anyone-with-link only after sanitized-source review. Do not change any other Site's audience.

## Responsive diagnostic

The non-navigation `__viewport.html` fixture embeds only this Site at an explicit CSS width. It reports inner/client/scroll widths, horizontal overflow, chosen public image URLs, and Resource Timing image-body/transfer bytes. It is noindex, has the same CSP, uses no network client or persistence, and is a desktop CSS-width test, not real-phone testing.

## In-tab creator preview

A bounded five-step creator lets a visitor enter blank fictional-work fields, choose only an approved public cover, and preview a detail/start flow in the current tab. It does not modify the shared 32-work catalog, publish content, upload files, create an account, call a provider, or persist fields. Required fields and adult-character ages are checked. Preview text is escaped; cancel keeps the previous preview unchanged. Generic local-preview page titles and a fixed fragment keep entered text out of navigation URLs. Optional style controls are labelled visual-only.
