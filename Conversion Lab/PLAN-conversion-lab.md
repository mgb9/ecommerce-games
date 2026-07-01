# Conversion Lab — Build Plan

**An A/B testing simulator for WM956-15.** Students are shown two product-page or checkout variants, predict which converts better and by how much, then run the test and watch a simulated funnel resolve with real statistical noise. Teaches CRO experimentation, sample size, significance, and why gut instinct (Cialdini / Kahneman) misleads.

**Theme:** the fictional store is **Chrichton** (garden retail), so every experiment is a real-feeling Chrichton page or checkout decision.

---

## 1. Why it exists (WM956 mapping)

- **LO3 — conversion enhancement:** the core skill, taught as method not opinion.
- **Design Principles:** every variant is a page/checkout design choice with a hypothesis.
- **Digital Marketing / Fundamentals:** significance, power, bias — the evidence base the 70% report should cite rather than asserting "X converts better."

It feeds the assessment directly: students leave able to *justify* a CRO recommendation with a test design and a result, not a hunch.

## 2. The pedagogical spine

Same proven beats as Marketplace Tycoon: **predict-then-reveal**, seeded determinism, an instructor panel, a debrief, ESL glossary tooltips, and CSV/Markdown export. The whole point is the gap between what students *predict* and what the data *shows* — that gap is the lesson.

Per experiment, the loop is:

1. **See both variants** (A = control, B = challenger) with a short rationale for B.
2. **Form a hypothesis & predict** — pick the winner *and* an effect-size band (e.g. "B wins, +1–3pp"), and commit a **sample size** before seeing any data.
3. **Run the test** — visitors stream in, split 50/50, each converting via a seeded Bernoulli trial against a hidden true rate. Watch observed rates wobble and converge, the confidence interval narrow, and the significance verdict update live.
4. **Call it** — declare a winner, no difference, or "need more data".
5. **Reveal & debrief** — show the hidden truth, whether the call was correct, and *why* (was it powered? did noise fool you? did intuition overrate a persuasion trick?).

## 3. The engine (pure, seeded, testable)

One pure function, mirroring the Marketplace Tycoon `resolveRound` pattern so it ports to the same repo/test harness:

```js
// deterministic: all randomness from makeRng(seed)
runTest(experiment, { nPerArm, alpha, seed }) -> {
  arms: { A:{n,conv,rate}, B:{n,conv,rate} },
  diff, ciLow, ciHigh,        // CI on (rateB - rateA)
  z, pValue, significant,     // two-proportion z-test
  series                      // running stats per checkpoint, for the live chart
}
```

**Stats (get these exactly right — they are the teaching content):**

- Visitors split 50/50; each converts with probability = that arm's hidden true rate, via seeded Bernoulli (`makeRng(seed + ":" + i) < rate`).
- **Two-proportion z-test:** pooled `p̂ = (cA+cB)/(nA+nB)`, `SE = √(p̂(1−p̂)(1/nA + 1/nB))`, `z = (rB−rA)/SE`, two-tailed p-value from the normal CDF.
- **Confidence interval** on the difference uses the *unpooled* SE: `(rB−rA) ± z_{α/2}·√(rA(1−rA)/nA + rB(1−rB)/nB)`.
- **Required sample size** (shown as a planning aid before they run): `n_per_arm ≈ (z_{α/2}+z_β)²·[pA(1−pA)+pB(1−pB)] / (pB−pA)²`, given baseline rate, MDE, α and power (default α=0.05, power=0.80).
- **Live series:** recompute the verdict at checkpoints (e.g. every N visitors) so the significance line can be watched crossing — and re-crossing — the threshold. This makes the peeking lesson visible.

Implement the normal CDF (Abramowitz-Stegin or `erf` approximation); don't pull in a stats library — keep the engine dependency-free like Tycoon's.

## 4. The experiment set (the heart of it)

A graded arc of Chrichton cases, each with a hidden truth chosen to teach one thing. Each variant embodies a persuasion principle so intuition has something to grab — and sometimes be wrong about.

| # | Chrichton experiment | A (control) | B (variant) | Hidden truth | Lesson |
|---|---|---|---|---|---|
| 1 | "Add to basket" button | muted grey | high-contrast green | **Real, large** (4.0% → 5.2%) | Testing works; an easy significant win builds trust in the method. |
| 2 | Hero shot: product vs lifestyle | plant on white | styled garden scene | **No effect** (4.5% = 4.5%) | The trap — students will call a winner from pure noise (Type I error). |
| 3 | "Only 3 left" scarcity badge | none | scarcity (Cialdini) | **Tiny real** (4.5% → 4.8%) | Power & sample size — needs huge n to detect; intuition overrates scarcity. |
| 4 | Social proof: "327 gardeners bought this" | none | live count (Cialdini) | **Moderate but high-variance** | The peeking problem — stopping when it first hits p<0.05 inflates false positives. |
| 5 | Free-shipping banner | none | banner | **Lifts conversion, cuts margin** | Significance ≠ business value; tie the verdict to profit, not just rate. |
| 6 | Checkout: multi-step vs one-page, by device | multi-step | one-page | **Wins on mobile, loses on desktop** (Simpson's paradox) | Segmentation — the aggregate hides the truth; always cut by segment. |

Advanced/optional: a **multiple-comparisons** case (run five colour variants at once; the more you test the more false winners appear → Bonferroni), and a **novelty-effect** case (B spikes early then regresses to the mean).

## 5. Screens

1. **Lab bench** — the two variants side by side (rendered mock pages, not just labels — this is where Claude Design earns its keep), the hypothesis/prediction controls, and the planned-sample-size calculator.
2. **Running the test** — live dual funnel filling, observed-rate counters, a convergence chart (both rates + CI band over n), and a significance verdict chip (red/amber/green) that updates as data accrues. A visible "you said stop at n=___" marker.
3. **Verdict & reveal** — observed vs true rates, the z/p/CI summary in plain language, the prediction scorecard, and a profit footnote where relevant (case 5).
4. **Debrief** — what this experiment taught, the named concept (Type I/II, power, peeking, Simpson's, the relevant Cialdini principle), and a calibration tally across all experiments completed.

## 6. Instructor controls (host panel)

Re-use the Tycoon ⚙ drawer pattern. Tunable: α and power, traffic rate / total available visitors, per-arm true rates and noise, allow/forbid peeking (toggle the optional-stopping mode), reveal-truth-immediately (demo mode), and the seed (so a whole cohort gets the identical "random" run and the debrief is about *decisions*, not luck). One-tap teaching presets: *"Underpowered"* (shrink the effect), *"Pure noise"* (set pA=pB), *"Peeking enabled"*, *"Segment trap"*.

## 7. Export (assessable artifact)

CSV + Markdown log: per experiment — hypothesis, predicted winner & effect band, planned vs actual sample size, stop point, observed diff/CI/p, the call made, whether it was correct, and the realised business impact. Plus calibration (predictions correct / total) and reflection prompts:

- Where did your intuition disagree with the data, and which bias was at work?
- Which experiments were underpowered, and what sample size would you have needed?
- For case 5, did the "winning" variant actually make Chrichton money?

## 8. Build phasing

1. **Engine + tests first.** `runTest`, the z-test, CI and sample-size maths, the seeded Bernoulli stream. Port the Tycoon test pattern: finiteness, determinism (same seed → identical), and a statistical sanity check (over many seeds, the false-positive rate on a null experiment ≈ α; power on a real effect ≈ the target). This last test is itself a nice artefact for class.
2. **Single experiment playable** (case 1) end to end.
3. **Experiment set + arc**, predict-then-reveal, debrief.
4. **Instructor panel + export.**
5. **Design pass** (the variant mock pages, the convergence chart) — hand to Claude Design against the shared token set.

## 9. House conventions (shared with the suite)

Warm-dark "command centre" aesthetic and the Marketplace Tycoon token set (Bricolage Grotesque / Hanken Grotesk / JetBrains Mono; amber `#F2A93B` = player/act, gold `#C9A06A` = instructor; green/red = outcome). Pure dependency-free seeded engine, `recharts` for the convergence chart, ESL glossary tooltips, UK English, £. Single-file React artifact to start; structured for extraction into the same Vite repo as Tycoon.
