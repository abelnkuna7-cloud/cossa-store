# CJ inventory-control safeguard — 2026-08-28

## Problem confirmed

The previous catalogue-fill automation could import CJ candidates every two hours while supported departments remained below their active-product target. Commercial freight and protected-pricing checks happened after draft creation, producing a large archived/rejected backlog.

## Immediate safeguard

- Automatic CJ catalogue-fill import jobs are paused.
- `cj_catalogue_fill_required()` returns `false` until a qualification-first acquisition engine replaces fill mode.
- Existing daily maintenance jobs are not removed by this safeguard.
- Admin bulk import is removed from the UI.
- Exact CJ products can still be deliberately sourced and must pass live stock, South Africa freight and protected-pricing checks before publication.
- Existing CJ drafts can be reviewed through the commercial qualification process.

## Commercial rule

A supplier product is not considered Cossa Store stock merely because it was discovered or imported. Public status requires confirmed availability and commercial qualification. Temporary provider uncertainty must stay non-public and be rechecked; confirmed commercial failures are archived.

## Next phase

Build qualification-first discovery that scores South African relevance, usefulness/demand signals, category need, stock, freight, landed cost, delivery feasibility and protected pricing before catalogue admission.
