import {
  FIELD_CASE, FIELD_VERDICTS, FIELD_VERDICT_TRUTH, FIELD_GUNS, FIELD_GUN_TRUTH,
  FIELD_REMEDIES, FIELD_REMEDY_TRUTH, FIELD_EXPLANATION, FIELD_ROW_NAMES,
} from "../../engine/fieldcase.js";
import { MODULE, confidenceLine, developed, losLabel } from "../outcomesModel.js";
import { pad2 } from "../format.js";
import { calibrationVerdict, confidenceText, longDate, REPORT_LABELS, wordsFor } from "../report/labels.js";

const label = (opts, id) => opts.find((o) => o.id === id)?.label || "—";
const FIELD_REPORT_NAMES = { channels: "Channels", sourceMedium: "Source / Medium", device: "Mobile overview", age: "Demographics: Age", landingPages: "Landing pages", products: "Product performance" };

/* Case 9's case report, in the same shape as the generated cases' (see
   report/generatedReport.js): the three calls, the evidence the student
   flagged, the clue chain, what really happened, and reflection. */
export function fieldReport({ guess, result, flags, viewed = [] }) {
  const verdict = calibrationVerdict(guess.confidence, result.allCorrect);
  const missedCore = result.clueDetail.filter((c) => c.core && !c.found);
  const wentWell = [], workOn = [];
  if (result.verdictCorrect) wentWell.push("You saw that the measurement itself was broken — the call the whole case turns on.");
  else workOn.push("Before trusting any channel's numbers, ask whether the tracking can be believed: who is being counted, and is any of it fake?");
  if (result.gunCorrect) wentWell.push("You picked the smoking gun: test orders posting fake revenue into the live data.");
  if (result.remedyCorrect) wentWell.push("You chose to fix the measurement first, before moving any budget.");
  else workOn.push("Fix the data before acting on it: no budget decision is safer than the numbers it rests on.");
  if (missedCore.length) workOn.push(`Flag the core evidence as you go — you missed: ${missedCore.map((c) => c.label.toLowerCase()).join("; ")}.`);
  else wentWell.push("You flagged every core clue.");

  return {
    fileTitle: `Data Detective – Case ${pad2(FIELD_CASE.n)} report`,
    tag: `${MODULE.code} · ${losLabel(FIELD_CASE.outcomes)}`,
    title: `Case ${pad2(FIELD_CASE.n)}: ${FIELD_CASE.ticket.subject}`,
    meta: [longDate(), "Field data", "Real Google Analytics exports, autumn 2015"],
    score: { got: result.fieldsCorrect, outOf: 3, detail: `${result.cluesFound} of ${result.clueTotal} clues found (${result.coreFound} of ${result.coreTotal} core)` },
    confidence: guess.confidence ? { label: confidenceText(guess.confidence), verdict } : null,
    principle: FIELD_CASE.lesson,
    callsTitle: "Your calls vs the truth",
    calls: [
      { label: "Verdict", you: label(FIELD_VERDICTS, guess.verdict), truth: label(FIELD_VERDICTS, FIELD_VERDICT_TRUTH), ok: result.verdictCorrect },
      { label: "Smoking gun", you: label(FIELD_GUNS, guess.gun), truth: label(FIELD_GUNS, FIELD_GUN_TRUTH), ok: result.gunCorrect },
      { label: "First action", you: label(FIELD_REMEDIES, guess.remedy), truth: label(FIELD_REMEDIES, FIELD_REMEDY_TRUTH), ok: result.remedyCorrect },
    ],
    wentWell, workOn,
    trail: [
      { heading: "Reports you opened, in order", items: viewed.map((k) => FIELD_REPORT_NAMES[k] || REPORT_LABELS[k] || k), empty: "None" },
      { heading: `Rows you flagged as evidence (${flags.length})`, items: flags.map((id) => FIELD_ROW_NAMES[id] ?? id), empty: "None" },
    ],
    happened: {
      text: FIELD_EXPLANATION,
      clues: result.clueDetail.map((c) => ({ label: c.label, tag: c.found ? "Flagged" : "Missed", tone: c.found ? "pos" : "neg", core: c.core, detail: c.detail })),
    },
    reflection: [
      "Which row first made you doubt the data, rather than the business? Why that one?",
      "Which of the agency's numbers would survive once the tracking is fixed, and which would not?",
      "What would you check in any analytics account before trusting it to set a budget?",
    ],
    words: wordsFor(FIELD_CASE.words || []),
    ...developed(FIELD_CASE.outcomes, FIELD_CASE.ticket, confidenceLine(guess.confidence, result.fieldsCorrect, 3)),
  };
}
