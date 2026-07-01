# Marketplace Tycoon — Design Handover (for Claude Design)

**From:** Mark Bonnett (WMG, University of Warwick) · **Module:** WM956-15 Enterprise eCommerce Solutions
**You are taking over:** the visual design of a working e-commerce teaching game, to tighten its system, redesign its busiest screen, and (optionally) reskin it around an existing case study.

---

## 1. What this is

Marketplace Tycoon is a ten-week e-commerce strategy game for MSc students — run a store against four rivals, set price/ads/stock, invest in conversion optimisation, manage cash and returns. It's functional and built as a React app. **The logic is settled; this handover is about the look, feel, hierarchy and clarity.** Don't redesign the mechanics — design *around* them.

Audience matters: international postgraduates, **many ESL**, often playing on **phones**, and the screens are sometimes **projected in a seminar** for whole-class debrief. So legibility, contrast and a clear visual hierarchy aren't polish — they're function.

## 2. Current design language (the starting point)

The current aesthetic is a **warm-dark "marketplace command centre."** Keep the spirit unless you have a stronger idea — but it's yours to push.

**Type**
- Display / headings: **Bricolage Grotesque** (700–800)
- Body / UI: **Hanken Grotesk** (400–700)
- Numbers / data / mono: **JetBrains Mono** (money, stats, tiers, percentages)

**Palette (current tokens)**
| Token | Hex | Use |
|---|---|---|
| ink | `#14110D` | page background |
| panel | `#1F1A13` | cards |
| panel2 | `#272015` | inset blocks |
| border | `#3A3022` | hairlines |
| text | `#F0E9DC` | primary text |
| muted | `#A99E8B` | secondary text |
| **player accent** | `#F2A93B` (amber) | the player, primary actions |
| **instructor accent** | `#C9A06A` (gold) | host/instructor surfaces, platform info |
| pos | `#7DCB6A` | profit / good |
| neg | `#E2654E` | loss / risk / insolvency |

Four competitor colours also exist (rose `#E8657F`, violet `#9B7BD4`, teal `#3FB6A8`, lime `#A8C24A`).

The current look leans on rounded cards (~16px), a sticky header of live stats, dotted-underline glossary terms, and small mono "pills" for metadata. It works but is utilitarian.

## 3. The screens (and where design help is most needed)

In play order:

1. **Intro** — title + name-the-store. Fine; could be more inviting.
2. **Scenario select** ("choose your client brief") — four cards: Fast-Fashion 👗, Grocer 🥬, B2B ⚙️, Digital 💾, each with a spec block. This is a strong moment — make the four briefs feel genuinely distinct and characterful.
3. **Setup** — pick a storefront platform (Wix/Shopify/WooCommerce/Headless) and a fulfilment model (in-house/3PL/dropship). Card-grid comparison.
4. **▶ PLAY BOARD — the priority.** This is the densest screen and the one that most needs you. In a two-column layout it currently stacks, top to bottom: a scenario reminder strip, event/insolvency/ramp banners, three sliders (price / ad / stock), a **CRO panel** (four upgrade rows with tier pips `●●○○` and "test £x / deploy £y" buttons), a 2×2 grid of mini-stats, a rank-prediction row, and the "Run the week" button — beside a live marketplace leaderboard. **It's a lot.** The design problem: give it a clear information hierarchy and rhythm so a student isn't overwhelmed, without hiding anything that teaches. Think dashboard, not form.
5. **Result** — weekly P&L (a line-item breakdown to a profit figure), a marketplace report, and a "next week" CTA.
6. **End + Debrief** — two charts (cumulative-profit line, profit-by-store bars) and a grid of "what the game was teaching" cards, plus CSV/Markdown export buttons.
7. **⚙ Instructor drawer** — a right-hand slide-in of sliders, toggles and one-tap "teaching shock" presets. Functional; could read more like a control room.

## 4. What I'd love from you

In rough priority:

1. **Redesign the play board** for hierarchy and calm. The decision levers, the CRO investments, the at-a-glance state (cash/margin/regulars), and the leaderboard each want their own clear zone. Make "what do I do this turn?" obvious.
2. **A tightened design system / component sheet** — type scale, spacing, the card/pill/button/slider/stat vocabulary, accent usage rules (amber = you/act, gold = instructor, green/red = outcome). Something I (or Claude Code) can implement consistently.
3. **A proper mobile / responsive layout** — students will play on phones. The two-column board needs a considered single-column story; the sliders and CRO buttons need comfortable touch targets.
4. **Seminar legibility** — a high-contrast pass that survives a projector and reads from the back of a room; check colour-contrast for the ESL audience.
5. **Scenario identity** — small visual cues that make fashion vs grocer vs B2B vs digital feel different (accent tint, iconography, texture) without four separate themes to maintain.

## 5. The Chrichton reskin (optional, high value)

I have a signature teaching case study — **"Chrichton,"** a fictional garden-retail business — used across my modules. A version of Marketplace Tycoon **reskinned around Chrichton** (garden-retail product nouns, brand identity, scenario framing) would knit this game into my existing assets and give it a consistent world. If you want a brief beyond the generic version, design **a Chrichton brand/identity and a themed skin** of these screens (logo lockup, palette variant, garden-retail flavour) that sits on the same component system. Treat it as an alternative theme, not a fork.

## 6. Constraints

- It's ultimately **implemented in React** (and will be ported to a Vite app), so designs should be buildable with standard CSS / a utility framework — favour systematic tokens over bespoke one-offs.
- **Keep the pedagogy visible:** the glossary tooltips (dotted-underline terms), the predict-your-rank step, the named P&L line items, and the "what this taught" debrief cards are teaching devices — redesign them, don't remove them.
- **UK English, £ currency**, mono for all numbers.
- Don't gamify into noise — this is a serious teaching tool that happens to be a game. Confident and clear beats loud.

## 7. Reference

The current build (`marketplace-tycoon.jsx`) is the live source of the existing look — pull screens from it to redline. The companion **engineering handover** (for Claude Code) covers the code/multiplayer side; you and it share the same component vocabulary, so a system you define here should be directly implementable there.
