# CKB release continuation — 2026-09-21

Starting HEAD: bb1cdfd56fca0074b7c54b82b8c61387162296ce. Work is on feat/i18n-trilingual in the existing clean wt-i18n worktree. The unrelated FishWebClean working tree was preserved.

## Contextual correction ledger

This is AI-assisted Arabic-source comparison, not native-human review. No translation status was changed to reviewed.

First batch: 14 corrected locations:
- tools: compatibility-calculator.s25 and fish-card.s9: centimetres had been translated as poisonous; use cm.
- tools: location-setup.s14: air conditioning had become alley; restore air conditioner / airflow.
- tools: fish-health-diagnosis.s9 and s17: gills confused with fins.
- Six blog posts, seven anatomical occurrences: gills had survived as ribs, throat or meaningless anatomy in white spot, jumping, diagnosis, ammonia emergency, tap-water and aeration articles.
- ammonia emergency: gradual return of feeding was rendered as groups; restore gradual return.
- product c4-1103 name: restore aquarium and adjustable temperature rather than a fixed/regulated setting.

Evidence for the anatomical term: https://ckb.wikipedia.org/wiki/ڕیشوو explicitly identifies Gill as the respiratory organ and cites grade-12 science. It supports terminology usage, not independent validation of every aquarium-care claim. https://www.rudaw.net/sorani/categories/health/1861792 attests medication-dose phrasing; generic fertiliser/conditioner quantities need not be called medication. https://gov.krd/dmi/activities/news-and-press-releases/2025/september/پێشانگەیەکی-نێودەوڵەتی-بە-شێوازێکی-مۆدێرن-لە-زاخۆ-دروست-کرا/ attests ventilation wording, not aquarium aeration specifically.

Glossary additions accept demonstrated unit forms (cm, °C, °س), plural/indefinite air-pump forms and biological-filtration orthographic variants. No global text replacement or warning suppression was performed.

## Verification in progress

- Initial fresh CKB validator: 0 errors, 170 glossary warnings; investigation ongoing.
- Internal links: 0 defects. HTML: 0 structural defects, 3 emphasis-count advisories across EN/CKB. Commerce integrity: 0 findings.
- Client TypeScript and api/tsconfig.json: exit 0.
- Targeted Vitest: 96 tests passed. Full suite running; failures require investigation.
- Production build: exit 0. Build-generated tracked-file removals restored.
- QA branch br-green-lake-a4j5pmgk independently verified through Neon as a child of production. 232 CKB machine rows seeded using guarded reseed tooling. This is NOT production sync.
- ckb.ready remains false. No merge or deployment.

This document is a progress ledger, not release certification. Full product, blog, high-risk UI review and browser QA remain in progress.
