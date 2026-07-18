# Remaining limitations

1. Local mobile Lighthouse is 50, not the requested 90; LCP is 5.7 s, not <= 2.5 s. Field Core Web Vitals are unavailable.
2. The legacy broad Playwright collection has 14 stale failures; the current release matrix passes 10/10.
3. Physical screen-reader testing was not performed.
4. Production Meta Events Manager test-mode validation is unavailable from this workspace. Historical 400 errors ended on a Preview deployment; Preview tracking is now disabled. No Graph API version or token was changed without official/current evidence.
5. Historical order-count logs are outside Vercel retention, so the owner-confirmed intended order cannot be independently counted from runtime logs. No additional real order was created; new retry/double-submit protection is transactionally enforced.
6. Existing nonblocking production log groups show missing optional database objects (`banned_ips`, `orders.client_ip`) and a guest audit-log constraint mismatch. The successful order transaction is preserved, but database migration is intentionally not improvised during release.
7. Existing Resend domain verification and scheduled AutoBlog parsing errors are outside the storefront cutover and remain operational debt.
8. Historical Git credential remediation remains unresolved for any future repository push.

Measured classification: **Good but needs adjustment**. It is not a genuine 10/10 until performance, legacy browser debt, Meta test mode, schema drift, and manual assistive-technology verification are cleared.
