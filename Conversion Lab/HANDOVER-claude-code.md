# Conversion Lab — build handover

An A/B-testing lab for WM956-15 (LO2 through the Wireframe Studio, LO3 through the experiments), built to
[PLAN-conversion-lab.md](PLAN-conversion-lab.md). Brought up to the Data Detective standard on 2026-10-09:
correct scoring, lesson texts that hold for every run, accessibility, saved progress, staff-only settings.

## Run it
```bash
npm install
npm run dev      # http://localhost:5173 (also `conversion-lab` in the repo's .claude/launch.json)
npm test         # 113 tests
npx vite build --base=/ecommerce-games/conversion-lab/   # then replace docs/conversion-lab/ with dist/
```

## Layout
- `src/engine/engine.js` — **pure, dependency-free, seeded.** The two-proportion z-test (pooled SE for the
  test, unpooled for the CI), normal CDF/quantile, `requiredSampleSize`, `powerAt`, and `runTest()` — the
  per-visitor Bernoulli stream with checkpoints for the live charts. Also the eight experiments, the scoring
  (`soundCall`, `matchesTruth`, `soundReason`), `lessonContext`, `replicate`, the quiz and the glossary.
- `src/engine/wireframe.js` — the Wireframe Studio's design model (`reviewLayout`, `layoutToExperiment`).
- `src/engine/*.test.js` — maths, determinism, calibration over many seeds; `lessons.test.js` — every
  lesson renders for any run and setting, each designed story holds at its suggested sample size over 200
  seeds, the scoring rules, the guardrail, the quiz wording, the wireframe control.
- `src/ui/` — `App.jsx` (screens + saved state), `theme.js`, `shared.jsx` (Term, Frame, choice groups,
  sliders, switch, ScoreCard — Data Detective's patterns), `Intro.jsx`, `InstructorPanel.jsx`,
  `lab/` (Bench, Running, Verdict, Summary, MockPage), `quiz/`, `wireframe/`, `session.js`, `progress.js`,
  `urlConfig.js` (`?instructor`). `screens.smoke.test.jsx` renders every screen from props.

## Scoring: two judgements of every call
- **Sound call** — the right reading of the *evidence*, never the truth. Significant at the planned n →
  naming the observed winner. Not significant → "need more data"; "no real difference" only if the CI lies
  inside ± the student's own MDE (an equivalence reading). An early stop that names a winner is never sound.
- **Matched the truth** — did the call name the true winner (±0.2pp null zone)? "Need more data" makes no
  claim → `null`, shown as "not scored".
- The predicted winner and the effect-size band are scored against the truth as before. Records, CSV and
  Markdown carry `prediction_correct`, `band_correct`, `sound_call`, `matched_truth`, `stopped_early`.
- The old `callCorrect` marked a significant false positive ✓ and every early stop ✓; both are fixed.

## Lessons hold for the run the student saw
Each experiment's `lesson(c)` takes `lessonContext(exp, cfg, run)` and returns `{ general, run }`: `general`
is written from the truth in force (the instructor's effect multiplier can change it — at ×0 no lesson
claims a real effect), `run` describes the student's own run (power at their n, false positive or not,
early-stop exaggeration, segment results, the measured guardrail). α and the CI level follow the settings.

Sweep, 200 seeds, at each experiment's suggested n (default settings):

| # | true effect | suggested n/arm | power | significant (right way) | ever p<α (peeking) | default seed LAB-2026-24 |
|---|---|---|---|---|---|---|
| 1 cta | +1.20pp | 5,000 | 82% | 84.5% | 93% | +1.10pp, p=0.010 |
| 2 imgbg | 0 | 4,000 | — | 4% (≈α/2 one way) | 33.5% | −0.05pp, p=0.92 |
| 3 scarcity | +0.30pp | 6,000 | 12% | 9% | 41.5% | +0.40pp, p=0.30 |
| 4 social | +0.80pp | 12,000 | 82% | 74% | 83% | +1.05pp, p<0.001 (first p<α at 1,800/arm showing +1.61pp) |
| 5 shipping | +1.30pp | 4,500 | 80% | 81.5% | 91.5% | +1.44pp, p=0.002 |
| 6 checkout | +0.18pp overall | 5,000 | — | 7% | 34% | +0.62pp, p=0.15 (mobile +2.6pp, desktop −1.8pp) |
| 7 promo | +1.00pp overall | 12,000 | 92% | 96.5% | 99% | +0.73pp, p=0.012 (returning −2.1pp) |
| 8 subject | +4.00pp opens | 5,000 | 100% | 100% | 100% | +4.30pp; guardrail p=0.010 |

What changed in the arc: cta "large, easy win" → a moderate effect, properly powered (n 2,000 → 5,000);
imgbg names the false positive only when the run was one, plus a 200-rerun strip; scarcity states the
~77,000/arm it would need; social now teaches the true half of peeking for a real effect — early stops
overstate it (200 reruns at 12,000/arm: mean lift at the first p<α +1.6pp vs a true +0.8pp — about double) — and points back to Experiment 2 for
false positives; checkout is "segment effects that cancel out" and says why it is *not* Simpson's paradox
(new `hte` glossary term); promo retuned (new 0.70: 4.0→6.2%, returning 0.30: 7.5→5.7%, n 12,000) so
"wins overall, hurts returning customers" is what students actually see; the subject line's guardrail is
simulated per recipient on its own streams (`:guardA`/`:guardB` — no other number changed) with its own test.

## "Which Test Won?" — realistic scenarios
The 11 items were labelled "real, documented" with no sources, and none is in the class deck
(`CRO Quiz Master 25_26.pptx` — deliberately: the test `does NOT reuse the in-class quiz scenarios` guards
it). They are now "realistic scenarios based on typical published findings": no precise figures (the
"$300m button" — a redesign, not an A/B test — and ~120% / ~32% / ~12% went), results give a direction and a
size band, sizes are labelled as *relative* lifts, q10's mechanism no longer says Simpson's, and the reveal
shows the chosen mechanism's text (it said "Option N"). Glossary terms only the class deck uses were removed.

## Wireframe Studio fixes
- The model now scores the brief's current page (`CONTROL_LAYOUT`) at exactly its base rate (every layout's
  multiplier is divided by the control's), so an unchanged control is a 0pp design; B2B's control used to
  model at +1.2pp.
- Metric feedback was wrong for the flash brief when the student chose correctly; the "no real effect"
  message fired for real small effects (it used a 1pp threshold) — now three cases on the ±0.2pp null zone.
- Default sample size 3,000 (4,000 wasn't one of the options). Studio state survives a refresh.

## Accessibility (Data Detective's patterns)
Glossary terms are disclosure buttons; choices are labelled groups of `aria-pressed` buttons; the peeking
switch is a `role="switch"` button; sliders have labels and `aria-valuetext`; steppers say what they change;
one h1 per screen, cards h2, scorecards h3; focus moves to each new screen's heading (and each quiz stage's)
via `Frame`'s `screenKey`; charts are `role="img"` with live descriptions and a dash-pattern legend; a polite
live region speaks only when significance flips and when the run completes; reduced motion skips the run
animation; contrast tokens from DD (`playerBtn`, `selText`, amber `#85600F`; `faint` only for rules);
two-column screens stack below 720px; the header no longer sticks; the wireframe review panel sticks below
the shell bar (`--cl-shell-h`). Simpler English follows the WMG shell's switch (the click-bridge script in
`index.html` is gone). axe: no violations on any screen of the built site, the instructor dialog included (only the suite-wide
`region` notes for the skip link and footer). `SCREEN-READER-TEST.md` is the VoiceOver script — not yet run.

## Saved progress and staff settings
- `sessionStorage` (`cl-session:*`): the screen, the bench, the plan and settings a run was committed
  under (`run: {n, cfg}` — the run itself is recomputed, identically), records, quiz, wireframe, cfg. A refresh
  mid-run lands on the completed run's call bar. Old records (no `v: 1`) are ignored.
- `localStorage` `cl-progress`: each experiment's first attempt (the intro cards say so, in words); finishing
  anything sets the hub's `wmg-games-progress.cl`.
- The instructor dialog appears only after `?instructor` (remembered; `?instructor=off` forgets), so students
  can't turn on peeking or shrink effects. Settings changed mid-experiment apply to the next run.

The default seed is **LAB-2026-24**, chosen from about 270 candidate seeds as the most typical: every default run lands
within ~1 SE of the truth and shows its story (the old LAB-2026 gave Experiment 1 +2.48pp against +1.20pp).
`lessons.test.js` locks this in.

## Skills, experiment log, tally and tutor's guide (2026-10-09, second pass)
The Data Detective features, so the lab makes its skills visible (the module's PTES skills-development gap):
- `src/engine/outcomes.js` — the spec's LO wording (shared with DD), the skills catalogue with lab-specific
  `how`, and per experiment / quiz / studio `OUTCOMES` (LOs, syllabus, skills with what practising them looked
  like, a CV line). Honest: every experiment LO3; cta and checkout partly LO2; the studio LO2 + LO3; no LO1/LO4.
- Bench: "What this experiment develops"; verdict: **"Your recommendation to the <team>"** (writing task with
  a four-point self-check, saved as you type) and "Skills you practised"; studio and quiz show theirs too.
- **Self-rating** (`SkillsRating.jsx`, six statements in `cohort.js`) asked on the intro before the first
  experiment (skippable), again from the log; stored in `cl-skills`.
- **Experiment log** (`ExperimentLog.jsx`, phase `log`, printable as a PDF — `.cl-report` print CSS in
  `theme.js`): first attempts, how the student's judgement held up (sound-but-missed vs lucky), recommendations,
  a skills record (communication counts only written recommendations; self-assessment is summed with its
  score), CV lines, LOs, assessment use, the self-rating, and a **result code** `CL1|seed|n:pbsm[:rN],…|Q:…|W:…|S:…`.
- **Instructor only** (behind `?instructor`, lazy-loaded): **cohort tally** (`InstructorTally.jsx`) and the
  **tutor's guide** (`TutorGuide.jsx` + authored, number-free `src/engine/tutorNotes.js`): sessions, presets,
  sequences, debriefing, skills, accessibility, and per activity the design, power, what the current seed's run
  shows, debrief questions, wrong turns, a stretch; the quiz's answers; the studio's briefs. A refresh never
  lands a student on an instructor page.
- `progress.js` now keeps the full first-attempt record, the recommendation, the first quiz and wireframe.
