import { DMAP, CAUSE_TYPES, REPORTS, dayShort } from "../engine/engine.js";
import { ordinal, pad2 } from "./format.js";
import { CONFIDENCE } from "./progress.js";

/* The downloadable case report — the plan's "assessable artifact": the
   student's calls against the truth, their investigation trail, what
   really happened, and reflection prompts for the seminar. Plain
   Markdown, so it reads fine as text and renders anywhere. (Case 8's
   report lives with the field case, so its real data stays code-split.) */

// ---- answer labels, shared with the on-screen reveal ----------------
export const dimLabel = (key) => DMAP[key]?.label || key || "—";
const NOTHING = "None — nothing is broken";
const isNone = (o) => !o.dimension || o.dimension === "none";
const segLabel = (dimKey, segId) => DMAP[dimKey]?.segments.find((s) => s.id === segId)?.name || segId || "—";
export const causeLabel = (id) => CAUSE_TYPES.find((c) => c.id === id)?.label || id || "—";
// A diagnosis (or the truth) names one dimension/segment or a cross-tab pair.
// "None" (nothing broke) is a legitimate answer, for the student and the truth.
export const dimsText = (o) => (isNone(o) ? NOTHING : o.secondary ? `${dimLabel(o.dimension)} × ${dimLabel(o.secondary)}` : dimLabel(o.dimension));
export const segsText = (o) => (isNone(o) ? "—" : o.secondary ? `${segLabel(o.dimension, o.segment)} / ${segLabel(o.secondary, o.segmentB)}` : segLabel(o.dimension, o.segment));
export const startText = (o) => (isNone(o) || o.startDay == null ? "—" : dayShort(o.startDay));
export const confidenceText = (id) => { const c = CONFIDENCE.find((x) => x.id === id); return c ? `${c.label} (${c.hint})` : "—"; };

const REPORT_LABELS = Object.fromEntries([["realtime", "Realtime"], ["funnel", "Funnel exploration"], ["orders", "Back-office orders"], ...REPORTS.flatMap((g) => g.items.map((it) => [it.dim, it.label]))]);
const pivotLabel = (p) => p.split("×").map(dimLabel).join(" × ");
export const list = (items) => (items.length ? items.map((x, i) => `${i + 1}. ${x}`).join("\n") : "_none_");
export const mark = (ok) => (ok ? "✓" : "✗");
export const today = () => new Date().toISOString().slice(0, 10);

export function generatedCaseReport({ caseData, cfg, attempt = 1, diagnosis, result, viewed, pivots, review }) {
  const t = caseData.truth;
  return `# Data Detective — Case ${pad2(caseData.n)}: ${caseData.ticket.subject}

${today()} · seed \`${caseData.seed}\` · noise ${cfg.noise.toFixed(1)}× · ${attempt === 1 ? "first attempt" : `attempt ${attempt} (a fresh variant)`}

## Diagnosis — ${result.fieldsCorrect}/4 correct

| | You said | Truth | |
|---|---|---|---|
| Dimension | ${dimsText(diagnosis)} | ${dimsText(t)} | ${mark(result.dimensionCorrect)} |
| Segment | ${segsText(diagnosis)} | ${segsText(t)} | ${mark(result.segmentCorrect)} |
| Cause | ${causeLabel(diagnosis.causeType)} | ${causeLabel(t.causeType)} | ${mark(result.causeTypeCorrect)} |
| Start | ${startText(diagnosis)} | ${startText(t)} | ${mark(result.dateCorrect)} |

Confidence before the reveal: ${confidenceText(diagnosis.confidence)}.

## How you investigated

Reports opened, in order:
${list(viewed.map((k) => REPORT_LABELS[k] || k))}

Cross-tabs built, in order:
${list(pivots.map(pivotLabel))}

${review.noIncident
    ? `There was no broken segment to find: the dip moved every segment together. You checked ${review.reportsOpened} report${review.reportsOpened === 1 ? "" : "s"} before deciding.`
    : `The signal was in ${review.decisive}: ${review.found ? `you ${review.compound ? "built" : "opened"} it (${ordinal(review.foundAt)} ${review.compound ? "cross-tab" : "report"}).` : `you never ${review.compound ? "built" : "opened"} it.`} Reports that turned out to be dead ends: ${review.deadEnds}.`}${review.funnelStage ? ` Funnel exploration ${review.usedFunnel ? "was" : "was not"} used — filtered to the broken segment, it pins the drop to the ${review.funnelStage} step.` : ""}${review.needsBackOffice ? ` Back-office orders — the ground truth that separates a tracking fault from a real one — ${review.usedBackOffice ? "were" : "were not"} checked.` : ""}

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

// Hand the text to the browser as a file download.
export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
