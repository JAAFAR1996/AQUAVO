import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * The `wouter` stand-in used only by script/prerender-home-hero.ts.
 *
 * wouter's real `Link` reaches for `window`/`location` the moment it renders,
 * because it subscribes to the browser history. Shimming those globals well
 * enough to run it under Node turned into a moving target, and the component
 * itself must keep importing the real wouter so the two hero CTAs stay
 * client-side navigations once React has mounted.
 *
 * So the prerender aliases `wouter` to this module instead. wouter renders a
 * `Link` as a plain anchor carrying the href and whatever props were passed, so
 * the static markup matches; server/__tests__/home-hero-shell.test.ts asserts
 * the hrefs survive, and the prerendered markup is replaced by the real React
 * tree on mount regardless.
 */
export function Link({
  href,
  to,
  children,
  ...rest
}: {
  href?: string;
  to?: string;
  children?: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href ?? to ?? "#"} {...rest}>
      {children}
    </a>
  );
}
