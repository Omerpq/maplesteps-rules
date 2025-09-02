# MAPLESTEPS-RULES

[![Update NOC & Categories](https://github.com/Omerpq/maplesteps-rules/actions/workflows/update-noc.yml/badge.svg)](https://github.com/Omerpq/maplesteps-rules/actions/workflows/update-noc.yml)
![NOC last checked](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FOmerpq%2Fmaplesteps-rules%2Fmain%2Fdata%2Fnoc.2021.json&query=%24.last_checked&label=NOC%20last%20checked&style=flat)
![IRCC categories last checked](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FOmerpq%2Fmaplesteps-rules%2Fmain%2Fdata%2Fnoc.categories.json&query=%24.last_checked&label=IRCC%20categories%20last%20checked&style=flat)

Remote-first JSON used by the Expo/React Native app. A daily GitHub Action auto-syncs **NOC 2021** from StatCan and **IRCC category-based selection** groups from the IRCC site, validates, and opens a PR only when data changes. It also opens Issues when the StatCan CSV URL changes or IRCC category shapes/counts change.

## Data files
- `data/noc.2021.json` — normalized NOC 2021 (`{ code, title, teer, keywords }`)
- `data/noc.categories.json` — IRCC category groups → NOC codes map (`groups: { slug: string[] }`)
- (others you may use) `data/crs.params.json`, `data/fsw67.params.json`, etc.

## Scripts
- `scripts/fetch_noc.mjs` — auto-discovers latest StatCan NOC CSV, normalizes, no-churn guard
- `scripts/fetch_ircc_categories.mjs` — scrapes IRCC Category-based tables (retry/timeout, CI fail-safe)
- `scripts/validate_noc.mjs` — validates both files & contracts

## Workflow
- `.github/workflows/update-noc.yml`
  - Runs daily
  - Captures NOC CSV URL before/after (opens Issue on change)
  - Captures IRCC groups before/after (opens Issue on group removal/empties/**any count change**)
  - Validates JSON
  - Opens PR with updated data files

## App integration
Point your app to RAW JSON:
```ts
export const RULES_BASE = "https://raw.githubusercontent.com/Omerpq/maplesteps-rules/main/data";
export const nocUrl = `${RULES_BASE}/noc.2021.json`;
export const nocCategoriesUrl = `${RULES_BASE}/noc.categories.json`;
