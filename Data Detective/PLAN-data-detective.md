# Data Detective — Build Plan

**A root-cause diagnosis game for WM956-15.** Students get an analytics dashboard for an e-commerce site and a ticket: "revenue's down — find out why." They explore segmented data (device, browser, country, traffic source, payment method, page) to isolate where an injected incident actually lives, distinguish it from red-herring events that happened nearby in time, and submit a structured diagnosis. Teaches segmentation discipline, correlation-vs-causation, and recognising when there's no real incident at all.

**Theme:** the dashboard belongs to **Chrichton** (garden retail) — each case is a real-feeling support ticket landing in the CRO team's inbox. *(Working title — easy to rename; "Incident Room" and "Dashboard Detective" were the alternates considered.)*

---

## 1. Why it exists (WM956 mapping)

- **LO3 — conversion enhancement:** diagnosis is the flip side of the fix — you can't enhance what you've misdiagnosed.
- **Digital Marketing / Analytics:** GA4-style segmentation (device, channel, geography), reading dashboards critically rather than at face value.
- **Operations:** payment gateways, checkout, inventory/stockouts as concrete failure points behind a "conversion dropped" headline.
- **Fundamentals:** correlation vs causation, confirmation bias, signal vs noise (the same statistical literacy Conversion Lab builds, applied to messier real-world data).

It completes the trio: Conversion Lab proves *whether* a change works; Funnel Fixer decides *where to invest*; this one diagnoses *why something broke* by reading the data trail — exactly the skill the report's "explain the Q3 dip" section needs.

## 2. The core insight it teaches

The thing students get wrong: they read the topline chart, spot something that happened nearby in time (a marketing push, a holiday, a competitor sale), and declare it the cause — without ever segmenting to check *where* the anomaly actually concentrates.

- **Segment first.** The true cause is almost always isolated to one segment; the aggregate chart just shows a smudged average (the same lesson as Conversion Lab's Simpson's-paradox case, applied to diagnosis instead of testing).
- **Shape tells you the cause class.** A sudden cliff at a precise date = a deploy/outage/gateway failure. A gradual decline = decay (site speed, SEO, fatigue). A spike-then-recovery = a temporary blip.
- **Correlation ≠ causation.** Red herrings — a co-occurring campaign, a holiday, a viral review — sit right next to the real cause in time and tempt a wrong call.
- **Sometimes there's no incident.** A "drop" can be ordinary seasonality or a tracking bug, not a real business problem. Chasing a root cause that isn't there wastes a team's time (the Type-I-error lesson again, in a messier setting).

## 3. The engine (pure, seeded, testable)

One generator + one scorer, same family as the rest of the suite:

```js
generateCase(caseId, seed) -> {
  series: daily { date, sessions, conversionRate, revenue },          // topline
  breakdowns: { device, browser, country, source, payment, page } ->  // per dimension
              { segmentValue -> daily series },
  events: [{ date, label, real: boolean }],   // the true cause + N red herrings, shown as markers (unlabelled as real/fake in-game)
  truth: { dimension, segment, startDate, shape, causeType, explanation }
}

scoreDiagnosis(guess, truth) -> { dimensionCorrect, segmentCorrect, causeTypeCorrect, dateWithinWindow }
```

- Baseline series: seeded daily noise + weekly seasonality, so "is this real or just noise?" is a genuine question, not a giveaway.
- The injected incident depresses (or, for case 4, inflates volume while crushing quality on) **one segment's** rate from `startDate`, in one of three shapes: **cliff**, **gradual decay**, **spike-revert**. Magnitude and noise are seeded — same seed reproduces identically, so a shared seed gives a cohort the identical case file.
- Red-herring events are real, plausible markers placed near `startDate` — but provably uncorrelated with the segment-level pattern once the right breakdown is checked. That gap (visible-in-the-data vs not) is what makes this a skill, not a guess.
- A "no incident" case sets every segment to baseline noise; the correct diagnosis is "no real cause, within normal variance."
- The **investigation log** (which breakdowns a student opened, in what order) is tracked as UI state, not engine state — same pattern as the prediction logs elsewhere in the suite.
- Dependency-free engine; `recharts` for the time series, event markers, and breakdown bars.

## 4. The case file (the heart of it)

A graded arc of Chrichton incidents, each engineered to teach one diagnostic move:

| # | Case (the ticket) | True cause | Shape | Red herring(s) | Lesson |
|---|---|---|---|---|---|
| 1 | "Checkout's broken" | PayPal gateway failure | Cliff | A promo email sent same day (sessions actually rose) | Segment by payment method before blaming "checkout" broadly |
| 2 | "Mobile revenue cratered" | iOS Safari layout bug after a release | Cliff at deploy date | A competitor sale launched the same week (real, small, not dominant) | Correlate with the deploy timestamp, not just "stuff that happened" |
| 3 | "Germany's gone quiet" | Tax/currency calc error, DE checkout only | Cliff | A DE public holiday that week (real, minor, muddies the date) | Segment by country; don't let a real-but-small confound stand in for the cause |
| 4 | "Traffic's up, revenue isn't" | Bot/low-quality paid social campaign | Gradual, source-only | "More sessions" reads as good news | Volume vs quality — Funnel Fixer's leaky bucket, seen from the diagnosis side |
| 5 | "Slow bleed" | A new third-party script slows page load | Gradual decline, all segments, worst on mobile | None — the trap is *not* finding a single date at all | Correlate two metrics (load time vs conversion) instead of cliff-hunting |
| 6 | "False alarm" | An analytics tag misfires for one segment; real orders are fine | Cliff — in the dashboard only | The whole "incident" itself | Cross-check the dashboard against a ground-truth number before declaring a crisis |
| 7 | "One page tanked" | A bestselling SKU goes out of stock | Cliff, one landing page/category only | A bad review goes viral the same week (real, minor) | Segment by page/category, not just device or geography |
| 8 | "Just a normal Tuesday" | No incident — ordinary seasonal dip | Within the noise band | A vague "something feels off" Slack message | Calibrating overreaction — recognise when there's nothing to fix |

## 5. The investigation loop

1. **The case lands** — a Slack-style ticket: *"Revenue down 18% this week — find out why."* Only the topline chart shows.
2. **Investigate** — break down by any dimension, compare against date markers (shown but not labelled real/red-herring), brush the date range. Every breakdown opened is logged — that trail is the assessable artifact.
3. **Submit a diagnosis** — pick the dimension, the segment, the cause type (deploy bug / gateway failure / traffic quality / tracking bug / inventory / external–no issue), and a date. A structured form, not free text, so it auto-grades.
4. **Reveal** — the true cause, which red herrings were real-but-not-causal, a score (diagnosis accuracy + how focused the investigation was), and the named lesson.
5. Repeat across the case file; **win = cases correctly diagnosed / total**, with an efficiency note (how many wrong segments were checked before the right one).

## 6. Screens

1. **Case inbox** — the ticket queue, solved/unsolved status, the framing device.
2. **Investigation workspace** — the hero screen: topline time series with event markers and a date brush; a dimension picker swaps in a small-multiples/bar breakdown by segment, sorted by anomaly size; an investigation-log panel showing what's been checked so far.
3. **Submit diagnosis** — dimension, segment, cause type, date: a structured form.
4. **Reveal & debrief** — guess vs truth, the red-herring narrative, the score, the named diagnostic principle.
5. **Case file summary** — cases solved, calibration, "what this taught" cards (segment-first, shape-tells-cause, correlation≠causation, false alarms, the leaky bucket from the data side).

## 7. Instructor controls (host panel)

Re-use the ⚙ drawer. Tunable: which cases are in rotation, noise level (how hard signal is to find), red herrings per case, and the seed (shared seed → an identical case file for the whole cohort, so debrief is about process, not luck). Presets: *"Obvious"* (low noise, a first walkthrough), *"Brutal"* (high noise, more red herrings), *"No false alarms"* (drop cases 6 and 8 for a shorter run).

## 8. Export (assessable artifact)

CSV + Markdown: per case — the student's diagnosis, the true cause, correct/incorrect per field, the investigation trail (segments checked before the right one), and time/efficiency. Reflection prompts:

- Which segment cut actually revealed the issue — and which ones you checked turned out to be red herrings?
- How did you tell correlation from causation in this case?
- Was case 6 (or 8) a real incident or a false alarm — what told you?
- What would you ask the team to monitor going forward to catch this faster next time?

## 9. Build phasing

1. **Engine + tests first.** Series generation, the incident injector (cliff/gradual/spike-revert), breakdown generation, the scorer. Port the suite's test pattern: finiteness, determinism, and a sanity test — the true segment always shows the largest anomaly in its breakdown from `startDate`, and the no-incident case never exceeds the noise band.
2. **Single case playable** end to end (inbox → investigate → submit → reveal).
3. **Full case file + investigation log + debrief.**
4. **Instructor panel + export.**
5. **Design pass** — the investigation workspace (linked charts + breakdown switching) is the richest visual surface in the suite so far; prove the interaction before polishing it.

## 10. House conventions (shared with the suite)

Warm-dark "command centre" aesthetic and the Marketplace Tycoon token set (Bricolage Grotesque / Hanken Grotesk / JetBrains Mono; amber `#F2A93B` = player/act, gold `#C9A06A` = instructor; green/red = outcome). Pure dependency-free seeded engine, `recharts` for the charts, ESL glossary tooltips, UK English, £. Single-file React artifact to start; structured for extraction into the same Vite repo as the rest of the suite.

## 11. Scope note

This is a bigger build than Funnel Fixer: the other two games are a linear sequence of single-purpose screens, but the investigation workspace needs multiple linked, filterable charts plus a logged exploration trail — closer to a small BI tool than a form. Worth proving the core interaction (topline chart + dimension-swap breakdown + event markers) on one case before committing to the full eight-case arc.
