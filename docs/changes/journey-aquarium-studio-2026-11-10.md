# Journey aquarium studio — 10 November 2026

## Goal
Make /journey easier to use and give the aquarium preview a coherent, detailed visual composition that reflects recorded choices.

## Scope and status
| Work | Status | Evidence | Next step | Decision owner |
| --- | --- | --- | --- | --- |
| Inspect current /journey | Done | Live desktop UI and repository main 910d817e858c84bb3ae45f337e14b350a1c8e127 | Compare preview | Assistant |
| Aquarium rendering | Done | Responsive SVG, dimension-driven L:H and projected W, explicit selections, unique IDs | Visual review | Assistant |
| Page and style choices | Done | Mobile preview opens initially; three editable decor styles; scoped IBM Plex font | Desktop/mobile visual check | Assistant |
| Automated verification | Done | Client typecheck and Vite build passed; 29 journey/recommendation/session tests passed | Final review of preview | Assistant |
| Production release | Pending | Main and production have not been changed | Founder approval of concrete preview | Founder |

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

## Release and rollback
Release only the reviewed branch after approval. No database migration, environment change, product update or price change is required. Roll back by reverting the journey studio commit and redeploying the prior main state. Saved plans retain their existing fields.
