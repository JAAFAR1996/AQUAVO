# Semantic Runtime Packaging V4

Date: 2026-08-03

## Production failure addressed

The earlier semantic SSR deployment failed because Vercel executed `api/ssr-preview.ts` without all relative helper modules in the function bundle. The stable handler was restored temporarily to keep the public site available.

## V4 packaging contract

- `api/ssr-preview.ts` remains the reviewed semantic SSR source in Git.
- `pnpm run build` generates the current HTML template first.
- esbuild bundles every relative SEO/AEO/GEO runtime module into `generated/ssr-preview-runtime.ts`.
- npm package dependencies remain external and are supplied through `node_modules`.
- the build replaces the Vercel entry with a one-line import of the generated runtime.
- `vercel.json` includes `generated/**` explicitly in the function bundle.
- the build fails if the generated runtime retains a relative import or loses the required 404/robots safety markers.

## Verified gates

The focused SEO workflow verified:

- TypeScript compilation.
- full production build.
- self-contained semantic runtime generation.
- correct 404 and `noindex, follow` behavior.
- canonical guide routes and complete answer content.
- Arabic database category normalization.
- truthful OnlineStore and Product structured data.
- sitemap and private-route safety contracts.

A deployment is not considered ready until the Vercel Preview also passes live HTTP and runtime-log checks.
