import { HOME_CRITICAL_CSS, HOME_STYLESHEET_HREF } from "./_home-critical-css.js";

/** Only the complete Arabic home shell has matching build-generated styles. */
export function injectHomeStyles(html: string): string {
  return html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, (link) => {
    if (link.match(/href="([^"]+)"/)?.[1] !== HOME_STYLESHEET_HREF) return link;
    const deferred = link.replace('rel="stylesheet"',
      'rel="stylesheet" media="print" data-aq-deferred-style onload="this.media=\'all\';this.dataset.aqStyleReady=\'true\'" onerror="this.media=\'all\';this.dataset.aqStyleReady=\'error\'"');
    return `<style data-aq-home-critical>${HOME_CRITICAL_CSS}</style>${deferred}<noscript>${link}</noscript>`;
  });
}
