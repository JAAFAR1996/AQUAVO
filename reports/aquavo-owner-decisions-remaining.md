# AQUAVO Owner Decisions Remaining

## Blocked — owner data required

### Warranty eligibility list

The six-month limited-warranty system will remain disabled by default until the owner supplies the exact product IDs/SKUs for approved electrical products. No product will be enrolled by category inference.

Required data:

- Product ID or SKU
- Owner approval: eligible / not eligible
- Any product-specific exclusions already promised by the manufacturer or distributor

## Recorded constraints, not open questions

- Provider name: `AQUAVO / محل المنبع / AL NABEA SHOP`.
- YEE certificate and AQUAVO customer warranty are separate.
- Payment: Cash on Delivery, and Al-Qaseh online payment. This line previously
  read "Cash on Delivery only", which stopped being true once Al-Qaseh shipped:
  `GET /api/payments/alqaseh/availability` returns `{"available":true}` in
  production and the checkout offers it. The schema's
  `paymentAccepted: "Cash on Delivery, Online Payment"` is therefore accurate
  and must not be "corrected" back to COD-only. AQUAVO stores no card data.
- Delivery: 5,000 IQD, within 24 hours, throughout Iraq.
- Support: 24/7.
- No live fish, animals or aquatic plants are sold.
- No deployment, production data mutation, real order, external message or DNS change is authorized.

## Release authorization required

### Credential rotation and Git-history treatment

Current tracked runtime files were rechecked without printing values: sensitive `.replit` assignments are empty and `script/inspect-gallery.ts` reads `process.env.DATABASE_URL`; no hardcoded database URL remains in that script. However, the pre-existing security audit documents credentials that were historically exposed in tracked content.

Before any push or deployment, the owner must authorize and complete:

- rotation/revocation of every historically exposed production credential;
- verification that hosting environments use the rotated values;
- a decision on Git-history rewrite versus repository replacement/secret-removal tooling;
- coordinated force-push only if history rewrite is chosen.

This work was not performed because it changes external production systems and repository history.
