Original prompt: This thing needs extreme improvement. Search every single line of code. Make improvements. The game is buggy. Everywhere.

Notes:
- Auditing engine + frontend for correctness gaps and obvious runtime issues.
- Fixing core poker engine logic (blinds, dealing, betting semantics, side pots) and frontend API mismatches.

TODO:
- Run tests once Vitest is available (npm install) or confirm test harness.
- Consider wiring render_game_to_text / advanceTime if we add automated Playwright checks.

Updates:
- Fixed poker engine logic (heads-up blind positions/turn order, betting semantics, side pot eligibility).
- Implemented real deck shuffling/dealing/burning and new-hand resets in Table.
- Added showdown payout flow and prevented actions outside betting states.
- Improved hand evaluation straight detection and two-pair kicker selection.
- Frontend: fixed Supabase action payloads, hand query ordering, and table config fetch + store.
- Added render_game_to_text + advanceTime no-op hooks for test harness.

Remaining:
- Install/run Vitest to verify engine tests.
- Wire Playwright harness if you want automated UI regression coverage.
- Updated tests to match heads-up action order and timeout behavior.
- Dealer/blind advancement now skips busted players.
- Removed hardcoded "heheeheh" placeholders and replaced with dynamic owner/current-player display in PokerTable.
- UI: expanded table layout, responsive seat spacing, fixed empty-seat rendering, and removed cramped styling.
- Firebase: fetchGameState now returns table data; owner/blinds are rendered from real data when available.
- Tried to start Next dev server for Playwright but port binding is blocked (EPERM). Playwright client also failed due to missing Playwright package.
- Seat rendering now 1-based to match Firestore data, and owner display no longer guesses when unknown.
- Firebase logic improved: scoped queries, blinds posted on start, pot/current_bet updates, and actor rotation on actions.
- Table UI revamped: responsive layout, dynamic seat spacing/sizing, true empty seats, owner/blinds display.
- Added current-player glow, action tray polish, and render_game_to_text hook for automation.

Updates:
- Removed all Supabase routes/pages; no app/ code imports Supabase anymore.
- Updated SETUP.md to Firebase-only config and removed Supabase docs.
- Ran `npm run build`; it failed locally because `@next/swc-darwin-arm64` is not installed (native SWC binary missing). This is a local environment issue, not a code error.
- Removed `postcss.config.js` to avoid CommonJS vs ESM conflict with "type": "module". Kept `postcss.config.mjs`.
