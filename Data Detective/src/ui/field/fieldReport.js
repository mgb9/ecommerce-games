import { FIELD_CASE, FIELD_ROW_NAMES, fieldCaseById } from "../../engine/fieldcase.js";
import { MODULE, confidenceLine, developed, losLabel } from "../outcomesModel.js";
import { pad2 } from "../format.js";
import { calibrationVerdict, confidenceText, explanationSections, longDate, REPORT_LABELS, wordsFor } from "../report/labels.js";

const label = (opts, id) => opts.find((o) => o.id === id)?.label || "—";
const FIELD_REPORT_NAMES = { channels: "Channels", sourceMedium: "Source / Medium", device: "Mobile overview", age: "Demographics: Age", landingPages: "Landing pages", products: "Product performance" };

// Seminar questions, per question.
const REFLECTION = {
  "cold-case-2015": [
    "Which row first made you doubt the data, rather than the business? Why that one?",
    "Which of the agency's numbers would survive once the tracking is fixed, and which would not?",
    "What would you check in any analytics account before trusting it to set a budget?",
  ],
  "christmas-plan-2015": [
    "Which column did you rank the products by first, and what changed your mind?",
    "What would you need to know about this retailer's customers before trusting the age report to target a campaign?",
    "If you had one week and the raw order data, how would you separate consumer sales from trade and test orders?",
  ],
};

/* A field case's case report (`def`: the question — see fieldcase.js), in
   the same shape as the generated cases' (report/generatedReport.js): the
   three calls, the evidence the student flagged, the clue chain, what
   really happened, and reflection. */
export function fieldReport({ def = fieldCaseById(FIELD_CASE.id), guess, result, flags, viewed = [] }) {
  const verdict = calibrationVerdict(guess.confidence, result.allCorrect);
  const missedCore = result.clueDetail.filter((c) => c.core && !c.found);
  const wentWell = [], workOn = [];
  if (result.verdictCorrect) wentWell.push(def.wentWell.verdict);
  else workOn.push(def.workOn.verdict);
  if (result.gunCorrect) wentWell.push(def.wentWell.gun);
  if (result.remedyCorrect) wentWell.push(def.wentWell.remedy);
  else workOn.push(def.workOn.remedy);
  if (missedCore.length) workOn.push(`Flag the core evidence as you go — you missed: ${missedCore.map((c) => c.label.toLowerCase()).join("; ")}.`);
  else wentWell.push("You flagged every core clue.");

  return {
    caseId: def.id,
    fileTitle: `Data Detective – Case ${pad2(def.n)} report`,
    tag: `${MODULE.code} · ${losLabel(def.outcomes)}`,
    title: `Case ${pad2(def.n)}: ${def.ticket.subject}`,
    meta: [longDate(), "Field data", "Real Google Analytics exports, autumn 2015"],
    score: { got: result.fieldsCorrect, outOf: 3, detail: `${result.cluesFound} of ${result.clueTotal} clues found (${result.coreFound} of ${result.coreTotal} core)` },
    confidence: guess.confidence ? { label: confidenceText(guess.confidence), verdict } : null,
    principle: def.lesson,
    callsTitle: "Your calls vs the truth",
    calls: [
      { label: "Verdict", you: label(def.verdicts, guess.verdict), truth: label(def.verdicts, def.verdictTruth), ok: result.verdictCorrect },
      { label: "Smoking gun", you: label(def.guns, guess.gun), truth: label(def.guns, def.gunTruth), ok: result.gunCorrect },
      { label: "First action", you: label(def.remedies, guess.remedy), truth: label(def.remedies, def.remedyTruth), ok: result.remedyCorrect },
    ],
    wentWell, workOn,
    trail: [
      { heading: "Reports you opened, in order", items: viewed.map((k) => FIELD_REPORT_NAMES[k] || REPORT_LABELS[k] || k), empty: "None" },
      { heading: `Rows you flagged as evidence (${flags.length})`, items: flags.map((id) => FIELD_ROW_NAMES[id] ?? id), empty: "None" },
    ],
    happened: {
      sections: explanationSections(def.explanation),
      clues: result.clueDetail.map((c) => ({ label: c.label, tag: c.found ? "Flagged" : "Missed", tone: c.found ? "pos" : "neg", core: c.core, detail: c.detail })),
    },
    reflection: REFLECTION[def.id],
    words: wordsFor(def.words || []),
    ...developed(def.outcomes, def.ticket, confidenceLine(guess.confidence, result.fieldsCorrect, 3)),
  };
}
