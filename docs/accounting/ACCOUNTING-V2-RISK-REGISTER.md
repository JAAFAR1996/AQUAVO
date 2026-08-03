# Accounting V2 controlled risks

| Risk | Current control | Production blocker |
|---|---|---|
| Opening inventory quantities are not physically approved | Provisional opening movements plus open review flags | Yes |
| Product packaging/insert zeros are unresolved | Exact/verified-zero cost resolution gate | Yes |
| Tax identity and accountant approval are incomplete | Tax profile remains draft; tax-final trigger blocks | Yes for tax final, no for administrative close |
| Vercel build-rate limit can cancel previews | Independent GitHub Actions accounting pipeline | No, provided CI passes |
| Legacy reports use old formulas | New accounting register is the default and labels old reports explicitly | No for V2 operations; legacy tabs remain reference-only |
| Accountant package is JSON, not final ZIP/PDF bundle | Structured export contains all source sections | No for data handoff; formatting enhancement remains |
| Existing `orders` Drizzle declaration does not include delivered_at/carrier_fee | Raw SQL is isolated and V2 schema has an explicit compatibility interface | Review before future db:push |
| Migration checksums 0051–0054 started as placeholders | 0055 replaces them with deterministic migration identity digests | Must apply 0055 in same release |
