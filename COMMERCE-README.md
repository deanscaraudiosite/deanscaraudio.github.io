# Dean's Car Audio website

This folder contains the responsive static website, product catalog, system planner, vehicle context, planning cart, and contact-review flow.

## Live now

- 191 product families with manufacturer reference prices and source notes.
- Local inventory, Dean's selling price, fitment, installation parts, tax, and labor are explicitly left for confirmation with the team.
- Search plus category, brand, reference-price, fitment-status, and sorting controls.
- Source-backed vehicle audio dimensions for supported records; unsupported vehicles show an explicit unavailable state instead of generic measurements.
- Variant-level product pages, specifications, and verification notes.
- Verified speaker-size product rules are included for the source-backed vehicle records; every other no-match remains unknown, never fits.
- Strict partial-coverage rule: missing data is always unknown.
- Versioned planning cart with quantity controls, removal tombstones, cross-tab reconciliation on hosted origins, same-tab file-mode continuity, and current-price rehydration.
- Non-transactional review page that prepares an email to Dean's; it never claims to place an order or accept a payment.
- Account-cart adapter/merge contract and Supabase RLS migration, intentionally inactive until authentication is configured. Browser roles can read their own carts but table mutations remain behind the future validated server API.
- Draft 2020-12 schema-enforced imports, source cross-reference checks, source manifest, dry-run import tools, and automated contract tests.

## Not falsely activated

- Dean's inventory or private selling prices.
- Licensed full SEMA Data feed (reseller and brand approval required).
- Customer authentication/account cart API.
- Payment, checkout, tax, shipping, orders, or order history.

Those boundaries are visible in the customer interface. Online ordering remains disabled until a server can revalidate price, inventory, compatibility, tax, and payment safely.

## Validation

From this folder, run:

```sh
node tools/validate-commerce-data.mjs
node tools/compile-standalone.mjs
```

Import tools are dry-run by default. They require `--write` and an explicit output path before they change a browser projection. Demo catalog data additionally requires `--allow-demo` and must never be promoted as production.
