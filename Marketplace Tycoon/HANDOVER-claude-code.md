# Marketplace Tycoon — Engineering Handover (for Claude Code)

**From:** Mark Bonnett (WMG, University of Warwick) · **Module:** WM956-15 Enterprise eCommerce Solutions
**You are taking over:** a working single-file React teaching game, to turn it into a deployable **multiplayer** web app for seminar use.

---

## 1. What this is

Marketplace Tycoon is an e-commerce strategy simulation for MSc students. A player runs an online store against four AI competitors over ten weeks; highest cumulative profit wins. It teaches platform build-vs-buy, conversion optimisation (CRO), operations/returns, retention/LTV, working capital, and platform economics — all mapped to the module's learning outcomes.

It currently exists as **one self-contained file**: `marketplace-tycoon.jsx` (~1090 lines, React + `recharts`, no other runtime deps). It runs today as a Claude artifact / single component. The single-player game is complete and verified.

## 2. The job, in priority order

1. **Extract the artifact into a real repo** (Vite + React), cleanly splitting the **pure game engine** from the React UI.
2. **Build the multiplayer port** on **PartyKit** so a cohort plays the same market in real time — this is the headline goal. It unlocks the module's LO4 ("collaboratively analyse…") and the 30%-weighted group presentation.
3. **Formalise the verification** I've been doing by hand into a proper test suite (Vitest).
4. **Deploy**: static client on **GitHub Pages**, authoritative room server on **PartyKit**.

> Context that matters: Mark has already shipped a PartyKit + GitHub Pages multiplayer app before (**WMG Quiz**, a Kahoot-style classroom quiz). Assume familiarity with the PartyKit room model, the GitHub Pages deploy flow, and a host/instructor + players topology. Reuse that mental model.

## 3. The engine was built for this — respect the contract

The whole architecture anticipates multiplayer. The core is **one pure, deterministic function** that resolves a week for *all* stores at once — it is effectively a server tick:

```js
// pure: no I/O, no Date.now, no Math.random — all randomness comes from `rng`
resolveRound(stores, round, cfg, rng) -> { stores: nextStores, log: string[] }
```

Key invariants you must preserve when moving it server-side:

- **Determinism is load-bearing.** All randomness flows through a seeded PRNG (`mulberry32` + `makeRng(str)`). The weekly tick uses `makeRng(cfg.seed + ":" + round)`. The player's CRO A/B lift values are pre-rolled once from `makeRng(seed + ":cro")` via `rollCroLifts(seed)`. **Given the same seed and the same decisions, every client must compute the identical result.** In multiplayer, run `resolveRound` **once on the PartyKit server** and broadcast the resulting state — do not resolve per-client.
- **`cfg`** holds the shared market rules: `commissionRate`, search-ranking `weights`, `platforms` (per-platform live `fixedCost` overrides), `txnAddon`, `seed`, `eventsOn`, `startingCash`, `scenarioId`, `demandMult`, `holdingMult`. This is the **instructor/host-owned** object — the host edits it (the ⚙ Instructor panel) and it must be the single source of truth broadcast to all players.
- **Scenario economics** come from the `SCENARIOS` table via `SC(cfg)` (unit cost, price range, demand, volatility, holding, returns, mobile share, ad-responsiveness, digital flag). `cfg.demandMult` / `cfg.holdingMult` are host multipliers layered on top. Don't reintroduce absolute economic values into `cfg`.
- **Per-store decision** each week is `{ price, ad, stock }` plus a persistent `cro` object `{ speed, trust, checkout, mobile }` (tier 0–3) and a per-week `croSpendThisWeek`. CRO is an upgrade, not a slider — it persists across weeks.
- **Bots** are deterministic given `rng`: `botDecide(store, stats, round, cfg, rng, sc)` and `botCro(id, round)`. In multiplayer you can keep some bots to backfill small cohorts, or drop them when enough humans join — but if you keep them, resolve them on the server with the room's seeded rng.

The clean module boundary already exists in the file: everything from the `COMPETITORS` constant down through `leaderDecisionOf` and the export helpers (`buildCSV` / `buildMarkdown`) is **engine + data + pure helpers**; everything from the `FONT_IMPORT` / `T` style object onward is **React UI**. Cut there.

## 4. Suggested repo shape

```
/src
  /engine
    engine.js          // resolveRound, botDecide, makeStore, initialStores, SC, scenarios,
                       // fulfilment, CRO tables, mulberry32/makeRng, getPlatform — NO React
    engine.test.js     // Vitest (see §6)
  /ui                  // the React components, importing from /engine
  /party
    server.ts          // PartyKit room: authoritative state + tick
/index.html
partykit.json
```

Keep the engine **dependency-free and isomorphic** so it runs identically in the browser (single-player) and on the PartyKit server (multiplayer). Single-player should keep working by calling the same engine locally.

## 5. Multiplayer model (PartyKit)

A room = one market (one cohort or one breakout group). Proposed design — adjust to taste:

- **Roles:** one **host** (instructor, or a nominated student) owns `cfg` and advances weeks; **players** each own one store and submit weekly decisions. Optionally a **team mode** where 3–4 students co-own one store with split roles (platform/CTO, marketing/CMO, ops/COO, pricing-cash/CFO) — this maps directly onto the existing levers and is the cleanest route to the LO4 "collaboratively" requirement.
- **Lockstep weekly resolution:** players lock in `{price, ad, stock, cro deploys/tests}` for the week. When all locked (or the host forces resolve / a timer expires), the **server** fills any empty bot slots, calls `resolveRound` once with `makeRng(seed + ":" + round)`, and broadcasts the new authoritative `stores` + `cfg` + `round`.
- **Server is authoritative.** Clients render state and collect intents; they never compute the canonical result. This also stops cheating and keeps everyone's market identical.
- **State to persist in the room:** `cfg`, `round`, `stores` (with each store's `cro`, `croLifts`, `loyalBase`, `cash`, `cumProfit`, `history`), per-player `locked` flags and pending decisions, and the prediction log. Use PartyKit storage so a refresh/reconnect rehydrates.
- **Reconnection:** a player rejoining gets a full state snapshot for their store + the public leaderboard. Pre-roll each human player's `croLifts` server-side at join (from `makeRng(seed + ":cro:" + storeId)`) so their A/B outcomes are fixed and fair.
- **Predict-then-reveal** stays per-player and is collected before the lock; calibration is tallied in the debrief/export.

Edge cases to handle: late joiners (assign a fresh store or a spectator view), a player who never locks (host force-resolves; treat as "hold previous decision"), host disconnect (promote another host or pause).

## 6. Tests to port (these are known-good — I ran them by hand)

Turn the manual checks into Vitest. The engine passed all of these after extraction-equivalent bundling:

- **Finiteness & sanity** across all 4 scenarios × 3 fulfilment models, 10 weeks: every `cumProfit / cash / loyalBase / review / profit / revenue / share / keptSales / croConv` must be `Number.isFinite`; `review ∈ [1,5]`; `share ∈ [0,1]`; `loyalBase >= 0`.
- **Determinism:** same seed → identical final `cumProfit`; different seed → different. (Verified: `7050 === 7050`, `7050 !== 5892`.)
- **CRO lift rolls** are seeded and vary by seed (`rollCroLifts("A") !== rollCroLifts("B")`), and `croConvOf` for a deployed tier equals the pre-rolled value (what the A/B test reveals must equal what deploy applies).
- **Mobile CRO scales with `scenario.mobileShare`** (tier-3 mobile: fashion ×1.18 vs B2B ×1.07 — confirmed).
- **Digital scenario invariants:** zero holding cost, never stocks out, fulfilment choice has no effect (all three fulfilment ids give identical results).

A representative harness (mirror this in `engine.test.js`):

```js
import { resolveRound, initialStores, SCMAP, makeRng, botDecide, leaderDecisionOf, DEFAULT_CFG } from "./engine.js";

function playGame(scenarioId, fulfilId, platformId, seed) {
  const cfg = { ...DEFAULT_CFG, scenarioId, seed };
  const sc = SCMAP[scenarioId];
  let stores = initialStores("Tester", platformId, fulfilId, cfg.startingCash, sc, seed);
  for (let round = 1; round <= cfg.maxRounds; round++) {
    const rng = makeRng(seed + ":" + round);
    stores = stores.map(s => s.isPlayer
      ? { ...s, decision: { price: Math.round((sc.priceMin + sc.priceMax) / 2), ad: 500, stock: Math.round(sc.demandBase / 3) } }
      : s);
    const lastTotalDemand = stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0);
    const stats = { lastTotalDemand, leaderDecision: leaderDecisionOf(stores) };
    const withBots = stores.map(s => s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, cfg, rng, sc) });
    stores = resolveRound(withBots, round, cfg, rng).stores;
  }
  return stores.find(s => s.isPlayer);
}
// assert finiteness, range, determinism as above.
```

> Watch-out from the build: there was a **temporal-dead-zone trap** — `DEFAULT_CFG` initialises from `PLATFORMS`, so `PLATFORMS`/`PMAP` must be declared **above** `DEFAULT_CFG`. Keep that ordering when you split files (or just `import` them — once modularised it's a non-issue). `esbuild`/`vite` won't catch a TDZ; only executing the module does, so the load-time test above is your guard.

## 7. Don't break these

- Single-player mode and the four bot archetypes (Carl/Aisha/Quinn/Bailey) stay.
- The **⚙ Instructor panel** and its one-tap "teaching shock" presets stay (in multiplayer they become **host** controls editing the shared `cfg`).
- The **CSV / Markdown decision-log export** stays — it's an assessable artifact students hand in. In multiplayer, each player exports their own store's log.
- UK English, £ currency, the ESL glossary tooltips, and the predict-then-reveal beat are pedagogical features, not decoration.

## 8. First three moves

1. Scaffold Vite + React; cut the engine out of `marketplace-tycoon.jsx` into `/engine/engine.js`; get the single-player UI running against the imported engine.
2. Stand up `engine.test.js` and make the §6 suite green — that proves the engine is portable and correct before any netcode.
3. Spike a minimal PartyKit room: host sets seed/scenario, two players join, lock decisions, server resolves one week and broadcasts. Grow from there.

The current artifact (`marketplace-tycoon.jsx`) is the source of truth for engine behaviour — when in doubt, match it.

---

## 9. First release pass (2026-11-11) — towards the Data Detective / Conversion Lab standard

Run: `npm test` (99 tests) · `npx vite build --base=/ecommerce-games/marketplace-tycoon/`. The weekly tick's numbers are
unchanged (same seed + decisions → same result as before); only text, new helpers and three extra history fields.

**Correctness**
- **Contribution / break-even on the play board were wrong.** They ignored returns (revenue is earned only on kept units,
  costs on every unit shipped) and the supplier-squeeze week's dearer unit cost, and rounded per-unit pounds to £1.
  Now `unitEconomics(store, round, cfg)` in the engine — tested to reproduce each week's profit exactly
  (`shipped × contribution − fixed − holding`). `returnRateOf()` is the one definition of the return rate.
- Per-unit money uses `gbp2` (3PL showed "£3" for £2.60, in-house "£2" for £1.50); `gbp` prints `-£1,234`, not `£-1,234`.
- **Debrief is built from the run** (`src/engine/debrief.js`, `debriefCards` / `runFacts`, pure and tested over
  4 briefs × 6 policies × 6 seeds + instructor presets). The old cards asserted things regardless of the run
  ("some tiers paid off and some didn't" with no CRO spend; a raw `<Term …>` tag printed in the retention card;
  "the same seed gave everyone an identical run"; fulfilment talk on the digital brief; the market's total commission
  presented as the player's rent).
- **Cash lesson reworded to what the model does.** Cash is starting cash + cumulative profit (stock is charged as it
  sells), so "profitable on paper but out of cash" cannot happen in the game; the card now says so and names the
  real-world difference. `insolvent` stays sticky in the engine (bots rely on it) but the UI shows "insolvent" only
  while cash is negative and otherwise "ran out of cash in week N".
- The weekly prediction is, and always was, scored against the **cumulative-profit leaderboard** — the wording said
  "rank this week". Wording fixed everywhere (board, result, CSV/Markdown text).
- Brief cards: "Margin" was a price range; "COGS" was the unit cost before fulfilment — relabelled. CRO estimate
  ranges show one decimal (mobile on B2B read "+1–2%" for 0.6–2.4%). `CRO_TEST_FRACTION` (18%) is one constant.
- Platform fit: the panel now says it is a requirements argument, not a forecast; `rationaleFor` says "no platform
  does better on X" only when true. LO4 claim removed (LO1 + LO3, spec wording).

**Staff / saved state**
- Instructor panel only after `?instructor` (remembered as `mt-instructor`; `?instructor=off` forgets) — `urlConfig.js`.
- A refresh resumes the game: `sessionStorage` `mt-session:game` / `mt-session:cfg` (versioned, `v: 1`).
  Reaching the end screen sets the hub's `wmg-games-progress.mt`.

**Accessibility** (CL's patterns, copied into `src/ui/theme.js`, `shared.jsx`, `InstructorPanel.jsx`)
Glossary terms are disclosure buttons; brief / platform / fulfilment / prediction are labelled groups of
`aria-pressed` buttons; sliders have labels, `aria-valuetext` and described-by hints; one h1 per screen, cards h2,
sub-sections h3; focus moves to each new screen's heading; the P&L is a table; charts are `role="img"` with the
final figures in the label (and a text ranking beside them; the player's line is solid, rivals dashed); a polite
status region announces each week's result; reduced motion honoured; the header band no longer sticks; contrast
tokens (`playerBtn`, `selText`, `platform` #765B36, amber #85600F); the instructor panel is a modal dialog with a
focus trap and Escape. Simpler English follows the WMG shell switch (bridge script removed from `index.html`).

**Not done / open**
- No true working-capital mechanic (stock is not paid for up front) — see the cash card.
- No screen-reader test. (axe: no violations on any student screen of the built site inside the WMG shell.)
- Second pass (skills record, decision-log page, result code, tally, tutor's guide) not started.
- There is no multiplayer client in `src/ui`; `party/` is untouched and its tests pass.

## 10. Platform balance retune (2026-11-11)
Before this, WooCommerce out-earned every platform on all four briefs, so the "top fit" platform was the best earner
only on B2B. Now a well-run store earns most on the top-fit platform on every brief. **This changes the weekly
numbers for every seed** (the note in § 9 that they were unchanged applies only up to this point).

Three mechanics in `platMods` (constants in `PLATFORM_RULES`), each one something the platform cards already claimed:
- **Organic edge acts through the brief.** `organicBonus` is worth nothing where `organicReliance` ≤ 0.15, its full
  value at ≥ 0.5, linear between (fashion 0, grocer 1/7, digital 3/7, B2B all of it).
- **Build time is a drag, not a delay.** Until mature, conversion and ad efficiency sit below the finished level
  (`launchDrag` 20% at week 1, easing to none). The old ramp started every platform at a neutral 1.0, which *helped*
  a platform whose finished conversion was below 1.
- **Owning the ops only costs.** `variance` is the worst share of a week's conversions lost; it was symmetric noise
  with no expected cost.

Numbers: Shopify £320 → £360 a week, conversion 1.05 → 1.07; WooCommerce £160 → £260, conversion 0.99 → 0.97,
ad efficiency 1.05 → 1.00, variance 0.05 → 0.10, organic bonus 300 → 600; Headless £650 → £1,200, conversion
1.12 → 1.18, ad efficiency 1.18 → 1.25. Wix unchanged. The fit model's recommendations are unchanged
(Shopify / Wix / WooCommerce / Headless for fashion / grocer / B2B / digital).

Average profit of the best of 16 sensible policies over 20 seeds, in-house fulfilment (`balance.test.js` pins the
ordering, for in-house and 3PL, and that the edge stays under 15%):

| brief | Wix | Shopify | WooCommerce | Headless | top fit's edge |
|---|---|---|---|---|---|
| fashion | £24.2k | **£26.6k** | £24.1k | £25.2k | 5% |
| grocer | **£10.3k** | £9.6k | £9.6k | £3.0k | 7% |
| B2B | £40.6k | £43.5k | **£45.6k** | £40.2k | 5% |
| digital | £106.2k | £120.6k | £112.0k | **£130.6k** | 8% |

What is *not* true, and the wording does not claim it:
- With weak decisions a cheaper platform can win. On digital, Headless leads only when ad spend is high; averaged
  over all 24 policies it is level with Shopify. That is the "only worth it at scale" lesson, not a fault.
- Fashion with dropshipping (a poor fit — profit a third of in-house) is won by Wix, the cheapest.
- Rivals: Quinn (on Headless) is weaker than before, most on the grocer brief; no rival goes bust that did not before.

The setup screen and debrief now say a well-run store "tends to earn a few per cent more" on the top-fit platform
and that pricing, stock, advertising and conversion work move profit far more. Saved-state `VERSION` is 2, so a tab
holding a game from the old numbers starts fresh.
