# Rollback and release plan

## Pre-cutover state

- Vercel project: `jaafar1996s-projects/aquavo`
- Current Production deployment ID: `dpl_HGzDzeqPt66gVMtHJVY4zQfaGkVJ`
- Current Production deployment URL: `https://aquavo-jjiw20i1l-jaafar1996s-projects.vercel.app`
- Production aliases include `https://www.aquavoiq.com`, `https://aquavoiq.com`, and `https://aquavo.vercel.app`.

## Rollback

If a critical defect appears, immediately promote/rollback to deployment `dpl_HGzDzeqPt66gVMtHJVY4zQfaGkVJ` using Vercel's rollback command or dashboard deployment promotion. Do not change DNS. After rollback, verify homepage, products, checkout rendering without submission, certificate, 404 behavior, robots, sitemap, and API health.

## Baseline finding

The old production deployment returns HTTP 200 for a definitely unknown route, confirming the old soft-404 defect. The V2 candidate must return a real 404 after Vercel routing.

## Secret-history note

Historical repository credential cleanup remains unresolved for future Git-history decisions, but it does not block this owner-authorized history-free Vercel export. No `.env`, `.env.*`, Git history, token, or local Vercel credential may enter the export. A deployment-protection bypass value was exposed by a prior tool response during verification and must be revoked/rotated before treating protected Preview access as clean; it is not reproduced here.
