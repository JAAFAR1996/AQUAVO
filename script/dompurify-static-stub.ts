/**
 * `isomorphic-dompurify` stand-in for the build-time page prerender only.
 *
 * MetaTags imports it to sanitise strings before they go into JSON-LD. Bundling
 * the real package for Node drags in jsdom and its optional native `canvas`
 * binding, which fails to resolve during the prerender build.
 *
 * Nothing sanitised here ever ships: prerender-static-pages.ts strips every
 * <script>, <title>, <meta> and <link> from the rendered markup before it
 * reaches the crawler shell, and asserts none survived. The browser bundle is
 * untouched and keeps the real DOMPurify.
 */
const stub = {
  sanitize(value: string): string {
    return value;
  },
};

export default stub;
