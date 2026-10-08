import { DMAP, CAUSE_TYPES, REPORTS, dayShort } from "../engine/engine.js";
import {
  FIELD_CASE, FIELD_VERDICTS, FIELD_VERDICT_TRUTH, FIELD_GUNS, FIELD_GUN_TRUTH,
  FIELD_REMEDIES, FIELD_REMEDY_TRUTH, FIELD_EXPLANATION, FIELD_ROW_NAMES,
} from "../engine/fieldcase.js";
import { ordinal, pad2 } from "./format.js";

/* The downloadable case report — the plan's "assessable artifact": the
   student's calls against the truth, their investigation trail, what
   really happened, and reflection prompts for the seminar. Plain
   Markdown, so it reads fine as text and renders anywhere. */

// ---- answer labels, shared with the on-screen reveal ----------------
export const dimLabel = (key) => DMAP[key]?.label || key || "—";
const segLabel = (dimKey, segId) => DMAP[dimKey]?.segments.find((s) => s.id === segId)?.name || segId || "—";
export const causeLabel = (id) => CAUSE_TYPES.find((c) => c.id === id)?.label || id || "—";
// A diagnosis (or the truth) names one dimension/segment or a cross-tab pair.
export const dimsText = (o) => (o.secondary ? `${dimLabel(o.dimension)} × ${dimLabel(o.secondary)}` : dimLabel(o.dimension));
export const segsText = (o) => (o.secondary ? `${segLabel(o.dimension, o.segment)} / ${segLabel(o.secondary, o.segmentB)}` : segLabel(o.dimension, o.segment));

const REPORT_LABELS = Object.fromEntries([["realtime", "Realtime"], ["funnel", "Funnel exploration"], ...REPORTS.flatMap((g) => g.items.map((it) => [it.dim, it.label]))]);
const pivotLabel = (p) => p.split("×").map(dimLabel).join(" × ");
const list = (items) => (items.length ? items.map((x, i) => `${i + 1}. ${x}`).join("\n") : "_none_");
const mark = (ok) => (ok ? "✓" : "✗");
const today = () => new Date().toISOString().slice(0, 10);

export function generatedCaseReport({ caseData, cfg, diagnosis, result, viewed, pivots, review }) {
  const t = caseData.truth;
  return `# Data Detective — Case ${pad2(caseData.n)}: ${caseData.ticket.subject}

${today()} · seed \`${cfg.seed}\` · noise ${cfg.noise.toFixed(1)}×

## Diagnosis — ${result.fieldsCorrect}/4 correct

| | You said | Truth | |
|---|---|---|---|
| Dimension | ${dimsText(diagnosis)} | ${dimsText(t)} | ${mark(result.dimensionCorrect)} |
| Segment | ${segsText(diagnosis)} | ${segsText(t)} | ${mark(result.segmentCorrect)} |
| Cause | ${causeLabel(diagnosis.causeType)} | ${causeLabel(t.causeType)} | ${mark(result.causeTypeCorrect)} |
| Start | ${dayShort(diagnosis.startDay)} | ${dayShort(t.startDay)} | ${mark(result.dateCorrect)} |

## How you investigated

Reports opened, in order:
${list(viewed.map((k) => REPORT_LABELS[k] || k))}

Cross-tabs built, in order:
${list(pivots.map(pivotLabel))}

The signal was in ${review.decisive}: ${review.found ? `you ${review.compound ? "built" : "opened"} it (${ordinal(review.foundAt)} ${review.compound ? "cross-tab" : "report"}).` : "you never opened it."} Reports that turned out to be dead ends: ${review.deadEnds}.${review.funnelStage ? ` Funnel exploration ${review.usedFunnel ? "was" : "was not"} used — filtered to the broken segment, it pins the drop to the ${review.funnelStage} step.` : ""}

## What actually happened

${t.explanation}

Timeline events:
${caseData.events.map((e) => `- ${dayShort(e.day)} — ${e.label} — **${e.real ? "real cause" : "red herring"}**`).join("\n")}

## The principle

${t.lesson}

## Reflection — bring to the seminar

1. Which view actually revealed the issue, and which ones turned out to be dead ends? What made you open them?
2. How did you tell correlation from causation? Which timeline event was the red herring, and what in the data ruled it out?
3. If you got a call wrong, what would have caught it?
4. What would you ask the team to monitor so this is caught faster next time?
`;
}

export function fieldCaseReport({ guess, result, flags }) {
  const label = (opts, id) => opts.find((o) => o.id === id)?.label || "—";
  return `# Data Detective — Case ${pad2(FIELD_CASE.n)}: ${FIELD_CASE.ticket.subject}

${today()} · real Google Analytics exports, ${FIELD_CASE.period}

## Your calls — ${result.fieldsCorrect}/3 correct

- **Verdict** ${mark(result.verdictCorrect)} — you said: ${label(FIELD_VERDICTS, guess.verdict)}${result.verdictCorrect ? "" : `\n  - Truth: ${label(FIELD_VERDICTS, FIELD_VERDICT_TRUTH)}`}
- **Smoking gun** ${mark(result.gunCorrect)} — you said: ${label(FIELD_GUNS, guess.gun)}${result.gunCorrect ? "" : `\n  - Truth: ${label(FIELD_GUNS, FIELD_GUN_TRUTH)}`}
- **First action** ${mark(result.remedyCorrect)} — you said: ${label(FIELD_REMEDIES, guess.remedy)}${result.remedyCorrect ? "" : `\n  - Truth: ${label(FIELD_REMEDIES, FIELD_REMEDY_TRUTH)}`}

## Your evidence — ${flags.length} row${flags.length === 1 ? "" : "s"} flagged

${list(flags.map((id) => FIELD_ROW_NAMES[id] ?? id))}

## The clue chain — ${result.cluesFound}/${result.clueTotal} found (${result.coreFound}/${result.coreTotal} core)

${result.clueDetail.map((c) => `- **${c.found ? "Flagged" : "Missed"}${c.core ? " · core" : ""}: ${c.label}.** ${c.detail}`).join("\n")}

## What actually happened

${FIELD_EXPLANATION}

## Reflection — bring to the seminar

1. Which row first made you doubt the data, rather than the business? Why that one?
2. Which of the agency's numbers would survive once the tracking is fixed, and which would not?
3. What would you check in any analytics property before trusting it to set a budget?
`;
}

// Hand the text to the browser as a file download.
export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
