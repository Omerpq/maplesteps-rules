# MapleSteps Rules Repo (Starter)

Stores canonical JSON used by the app (remote-first with local fallback). Includes a GitHub Action that opens a PR every 12h with updates from IRCC pages (scripts are simple stubs you can refine).

## Files
- data/crs.params.json
- data/fsw67.params.json
- data/rounds.json
- data/fees.json
- data/pdi.changelog.json
- scripts/fetch_rounds.mjs, fetch_fees.mjs, fetch_pdi.mjs
- .github/workflows/update-rules.yml

## Use
1) Create a GitHub repo (e.g. maplesteps-rules) and upload these files.
2) Enable Actions.
3) Point your app's src/services/config.ts to the raw JSON URLs.
