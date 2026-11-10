# Journey: interactive decision guides

## Goal and release state

Owner: Jaafar / AQUAVO. Implementation: Codex.

Requested outcome: every choice in `/journey` explains its effect, suitability, setup and limitations through an appropriate interaction, while keeping the aquarium preview useful and attractive.

Base: production commit `382379c68e05afd2ce08cd07f395f592ee402177` (PR #351). This follow-up is developed separately on `design/journey-interactive-guides-20261110`.

| Work | State | Evidence | Next step / decision owner |
| --- | --- | --- | --- |
| Aquarium exploration and composition guides | Implemented | Component explorer, six visual highlights, three composition walkthroughs | Integrated browser review / Codex |
| Planning and equipment interactions | Implemented | All choices covered; 8 focused interaction tests | Browser review / Codex |
| Decor, water and cycling interactions | Implemented | All choices covered; 5 focused safety and state tests | Browser review / Codex |
| Species and care interactions | Implemented | All 7 groups and 23 species; 6 focused care tests | Browser review / Codex |
| Preview and release | Not released | Separate feature branch | Review preview; decide production release / Jaafar |

## Interaction design

- The short explanation appears next to the current choice. Longer suitability, setup and caution sections use native disclosures.
- Demo controls are separate from the persisted plan. Exploring light intensity, water depth, readings or maintenance does not change the saved equipment or certify aquarium readiness.
- Buttons work by touch and keyboard, show their selected state and expose accessible names. No essential explanation relies on hovering.
- Existing aquarium preview semantics remain: water appears only after a source is chosen; species appear only after water is selected; one illustration per selected species is not a quantity recommendation.
- The three composition guides illustrate focal point, open space and depth. They are layout examples, not scale drawings or species-specific space approvals.
- Every source is presented as guidance; product instructions and species-specific requirements still govern the real setup.

## Content corrections

Avoid universal pH/temperature targets, automatic suitability of RO water, readiness inferred from elapsed time or two isolated zero readings, fixed stocking formulas, and blanket filter-media replacement schedules. Detailed lessons explain the necessary checks instead.

The existing species catalog is displayed as recorded planning guidance. This change does not independently certify every catalog species value or establish compatibility merely from an overlap in temperature.

## Primary references

Reviewed on 2026-11-10. Relevant references are also accessible inside the lessons.

- [OATA: freshwater aquarium setup](https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-fish/how-to-set-up-and-look-after-a-freshwater-tank-aquarium/): size, siting, maturation, compatibility, testing and maintenance.
- [OATA: freshwater water quality](https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-fish/how-to-test-water-quality-in-your-freshwater-tank-aquarium/): measurement-led water guidance.
- [RSPCA: aquarium environment](https://www.rspca.org.uk/adviceandwelfare/pets/fish/environment): aquarium welfare, filtration and cycling.
- [RSPCA: keeping fish together](https://www.rspca.org.uk/adviceandwelfare/pets/fish/company): social needs and species compatibility.
- [Aqueon: choosing aquarium plants](https://www.aqueon.com/articles/choosing-the-right-aquarium-plant): plant size, lighting and placement.
- [JBL: stones and roots](https://www.jbl.de/en/essentials-aquarium-decoration/section/61/decoration-stones-roots?country=us): stable decoration, material suitability and wood preparation.
- [MWRA: chloramines and aquariums](https://www.mwra.com/sites/default/files/2023-11/chloramines-qa.pdf): chloramine treatment requirements.
- [Seachem: Equilibrium](https://www.seachem.com/equilibrium.php): minerals and RO water. Product-specific directions are not generalized into a dose.
- [Aqueon: aquarium cleaning checklist](https://www.aqueon.com/articles/aquarium-cleaning-checklist) and [heater care](https://www.aqueon.com/articles/fish-tank-heater-tips-for-cold-weather): maintenance sequencing and equipment checks.

## Scope and rollback

Frontend components, lesson styles, translations and focused tests only. No database migration, production data, products, prices, inventory, credentials, account permissions or payment behavior is changed. Arabic, English and Sorani use the existing `tools` namespace.

Release requires a reviewable preview and the owner's specific approval. If released, rollback is a normal revert of this feature commit followed by the existing deployment pipeline; the saved journey schema remains compatible with the previous version.

## Validation

Local verification completed: 45 tests passed across 8 journey suites, TypeScript `tsc --noEmit` passed, Vite client build passed, and strict UI translation validation reported 0 errors and 0 warnings (6,282 keys present in both English and Sorani). `git diff --check` passed. The production build adds no dependency. Browser review and hosted preview are the remaining review steps.

The full catalog translation gate has a pre-existing baseline of 53 catalog errors and 114 catalog warnings from PR #351. This change does not edit the catalog translations or gate configuration; the isolated UI check above validates all changed interface text.
