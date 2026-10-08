import { CASES, reviewTrail } from "../../engine/engine.js";
import { ordinal, pad2 } from "../format.js";
import {
  REPORT_LABELS, calibrationVerdict, causeLabel, confidenceText, dimsText, isNone, longDate, pivotLabel, segsText, startText, wordsFor,
} from "./labels.js";

/* The case report for cases 1–7, as a plain data model that ReportView
   renders (and the student saves as a PDF). Written to the student, in
   plain language: the result at a glance, the lesson, what went well and
   what to work on — derived from what they actually did — their trail,
   the full story, reflection questions they can answer in the report, and
   the words worth knowing. */
export function generatedReport({ caseData, cfg, attempt = 1, diagnosis, result, viewed, pivots }) {
  const t = caseData.truth;
  const def = CASES.find((c) => c.id === caseData.id);
  const review = reviewTrail(caseData, viewed, pivots);
  const verdict = calibrationVerdict(diagnosis.confidence, result.allCorrect);
  const view = review.compound ? "cross-tab" : "report";
  const wentWell = [], workOn = [];

  // Finding the signal
  if (review.noIncident) {
    if (review.found) wentWell.push(`You checked ${review.reportsOpened} dimensions before deciding — that is how you show that nothing stands out.`);
    else workOn.push("Before deciding nothing is broken, check at least three dimensions: a real fault shows up as one segment moving on its own.");
  } else if (review.found && result.segmentCorrect) {
    wentWell.push(`You found where the signal was: ${review.decisive} (your ${ordinal(review.foundAt)} ${view}).`);
  } else if (review.found) {
    // They opened the right view but drew the wrong conclusion from it.
    workOn.push(`You opened ${review.decisive}, where the signal was, but your answer didn't match it. Look again: which single ${review.compound ? "combination" : "row"} fell far more than its usual wobble?`);
  } else if (review.compound) {
    workOn.push(`The fault lived in ${review.decisive}. When two single reports each look a little off, cross-tab them.`);
  } else {
    workOn.push(`The signal was in ${review.decisive}, which you didn't open. Check each dimension once before you settle on one.`);
  }
  // The tools that turn "where" into "why"
  if (review.funnelStage) {
    if (review.usedFunnel) wentWell.push("You used Funnel exploration, which names the step that broke.");
    else workOn.push(`Filter Funnel exploration to the broken segment: it pins the drop to the ${review.funnelStage} step, which points to the cause.`);
  }
  if (review.needsBackOffice) {
    if (review.usedBackOffice) wentWell.push("You checked Back-office orders — the ground truth that shows whether a drop is real.");
    else workOn.push("Before calling a drop real, compare analytics with Back-office orders.");
  }
  // The calls themselves
  if (result.causeTypeCorrect) wentWell.push(`You named the right cause: ${causeLabel(t.causeType).toLowerCase()}.`);
  else workOn.push("Match the cause to the evidence: which kind of fault produces this shape, in this segment, at this step?");
  if (t.startDay != null && !isNone(diagnosis) && !result.dateCorrect) {
    workOn.push(`Pin the start on the daily chart: the first day the broken segment pulls away from the others${t.shape === "gradual" ? " — for a slow slide, where its line first starts to bend" : ""}.`);
  }
  // (the confidence verdict has its own box in "At a glance", so it isn't repeated here)

  return {
    fileTitle: `Data Detective – Case ${pad2(caseData.n)} report`,
    title: `Case ${pad2(caseData.n)}: ${caseData.ticket.subject}`,
    meta: [longDate(), def.difficulty, `Seed ${caseData.seed}`, attempt === 1 ? "First attempt" : `Attempt ${attempt} (a fresh variant)`],
    score: { got: result.fieldsCorrect, outOf: 4 },
    confidence: diagnosis.confidence ? { label: confidenceText(diagnosis.confidence), verdict } : null,
    principle: t.lesson,
    callsTitle: "Your diagnosis vs the truth",
    calls: [
      { label: "Dimension", you: dimsText(diagnosis), truth: dimsText(t), ok: result.dimensionCorrect },
      { label: "Segment", you: segsText(diagnosis), truth: segsText(t), ok: result.segmentCorrect },
      { label: "Cause", you: causeLabel(diagnosis.causeType), truth: causeLabel(t.causeType), ok: result.causeTypeCorrect },
      { label: "Started", you: startText(diagnosis), truth: startText(t), ok: result.dateCorrect },
    ],
    wentWell, workOn,
    trail: [
      { heading: "Reports you opened, in order", items: viewed.map((k) => REPORT_LABELS[k] || k), empty: "None" },
      { heading: "Cross-tabs you built, in order", items: pivots.map(pivotLabel), empty: "None" },
    ],
    happened: {
      text: t.explanation,
      events: caseData.events.map((e) => ({ label: e.label, tag: e.real ? "Real cause" : "Red herring", tone: e.real ? "pos" : "amber" })),
    },
    reflection: [
      "Which view first showed you where the problem was — and which ones turned out to be dead ends? Why did you open them?",
      review.noIncident
        ? "What told you this was ordinary variation rather than a fault? What would a real fault have looked like?"
        : "Which timeline event was the red herring, and what in the data ruled it out?",
      "If you got a call wrong, what single check would have caught it? If you got everything right, what convinced you?",
      "What would you ask the team to monitor so a problem like this is caught sooner?",
    ],
    words: wordsFor(def.words || []),
  };
}
