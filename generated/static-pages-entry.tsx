import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import P0 from "../client/src/pages/about";
import P1 from "../client/src/pages/beginner-guide";
import P2 from "../client/src/pages/calculators";
import P3 from "../client/src/pages/contact";
import P4 from "../client/src/pages/fish-compatibility";
import P5 from "../client/src/pages/fish-breeding-calculator";
import P6 from "../client/src/pages/fish-finder";
import P7 from "../client/src/pages/fish-health-diagnosis";
import P8 from "../client/src/pages/privacy-policy";
import P9 from "../client/src/pages/return-policy";
import P10 from "../client/src/pages/shipping";
import P11 from "../client/src/pages/sustainability";
import P12 from "../client/src/pages/terms";
import P13 from "../client/src/pages/why-aquavo";
const PAGES = {
  "/about": P0,
  "/beginner-guide": P1,
  "/calculators": P2,
  "/contact": P3,
  "/fish-compatibility": P4,
  "/fish-breeding-calculator": P5,
  "/fish-finder": P6,
  "/fish-health-diagnosis": P7,
  "/privacy-policy": P8,
  "/return-policy": P9,
  "/shipping": P10,
  "/sustainability": P11,
  "/terms": P12,
  "/why-aquavo": P13,
};
export function renderAll() {
  const out = {};
  for (const [route, Component] of Object.entries(PAGES)) {
    out[route] = renderToStaticMarkup(createElement(Component));
  }
  return out;
}
