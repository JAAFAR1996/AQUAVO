# Journey aquarium studio — 10 November 2026

## Goal
Make /journey easier to use and give the aquarium preview a coherent, detailed visual composition that reflects recorded choices.

## Scope and status
| Work | Status | Evidence | Next step | Decision owner |
| --- | --- | --- | --- | --- |
| Inspect current /journey | Done | Live desktop UI and repository main 910d817e858c84bb3ae45f337e14b350a1c8e127 | Compare preview | Assistant |
| Aquarium rendering | Done | Responsive SVG, dimension-driven L:H and projected W, explicit selections, unique IDs | Founder review | Founder |
| Page and style choices | Done | Preview opens initially; three editable decor styles; scoped IBM Plex font | Founder review | Founder |
| Automated verification | Done | Client typecheck and Vite build passed; 29 journey/recommendation/session tests passed | Release decision | Founder |
| Visual QA | Done | HTTPS preview at f908f59237bd53bcd5b38a3b05b0fc5e5e404d33; desktop and narrow viewport checks below | Release decision | Founder |
| Production release | Approved; merge pending | Founder explicitly requested merging the reviewed change into main on 10 November 2026 | Merge after required checks, then verify production | Assistant |

## Decisions
- Preview stays part of the existing nine-step journey and its saved-plan data shape.
- Three optional looks update only substrateType and decorations. They do not change equipment, tank measurements, fish selection or prices.
- Entered length/height control front proportions. Width controls restrained projected depth. Extreme proportions are bounded for legibility; this is not a construction drawing.
- Water is illustrated only after a source is recorded. Source and cycling step do not imply water color, safety or maturity.
- A selected species has one representative only and is shown after water selection. Density is not translated into a fabricated stocking count.
- Fixed fish counts and cm-per-liter shortcuts have been removed from this page. Existing explicit compatibility warnings remain.
- Existing real-stock/price/variant checks and storage behavior remain in place.
- No new runtime dependencies. Fonts are self-hosted, restricted to this route, with their license and sources.

## Design references
- Aqueon: tall plants at the back, medium in the middle, low at the front: https://www.aqueon.com/articles/choosing-the-right-aquarium-plant
- OATA: adequate swimming room; stocking also depends on adult body size, species, water conditions and compatibility: https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-fish/how-to-set-up-and-look-after-a-freshwater-tank-aquarium/
- Off-center hardscape and open foreground are visual composition choices, not biological capacity calculations.

## Preview and visual QA

- Draft PR: https://github.com/JAAFAR1996/AQUAVO/pull/351
- Reviewed preview: https://deploy-preview-351--aquavo.netlify.app/journey
- Reviewed source: `f908f59237bd53bcd5b38a3b05b0fc5e5e404d33`.
- Desktop screenshot: `/workspace/shared/aquavo-journey-preview.png`.
- All three style changes were visibly checked. Entering 60 × 35 × 40 cm displayed 84 L and updated the tank proportions. Water selection changed the local preview; navigation from step 1 to 5 and back to 1 preserved the choices.
- CSS viewport widths of 454 px and 340 px, reached using browser zoom, showed no horizontal overflow. These were narrow viewport checks, not physical-device emulation.
- Netlify configuration is limited to Deploy Previews. The preview builds the static client, returns a local JSON 404 for `/api/*`, and sets `noindex, nofollow`; it has no live API connection. This QA does not establish backend, account, account-save, or cart integration behavior.
- Pre-merge review corrected four Sorani glossary warnings. The unchanged UI translation validator then passed strict mode with 0 errors, 0 warnings and all 5,708 keys present in both English and Sorani. The optional full i18n gate has 53 catalog errors and 114 catalog warnings from data and validator trees identical to main; no gate was modified. Required pipeline, build, tests and security checks passed on the reviewed head and must pass again after the terminology correction.

## Release and rollback
The founder approved merging PR 351 into main on 10 November 2026. Merge only the reviewed branch after required checks, then record the merge and production verification in the PR. No database migration, environment change, product update or price change is required. Roll back by reverting the journey studio merge and redeploying the prior main state. Saved plans retain their existing fields.
