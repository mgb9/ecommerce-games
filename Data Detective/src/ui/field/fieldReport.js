import {
  FIELD_CASE, FIELD_VERDICTS, FIELD_VERDICT_TRUTH, FIELD_GUNS, FIELD_GUN_TRUTH,
  FIELD_REMEDIES, FIELD_REMEDY_TRUTH, FIELD_EXPLANATION, FIELD_ROW_NAMES,
} from "../../engine/fieldcase.js";
import { pad2 } from "../format.js";
import { confidenceText, list, mark, today } from "../caseReport.js";

// Case 8's downloadable report: the three calls, the flagged evidence, the
// clue chain and seminar prompts (see caseReport.js for the generated cases).
export function fieldCaseReport({ guess, result, flags }) {
  const label = (opts, id) => opts.find((o) => o.id === id)?.label || "—";
  return `# Data Detective — Case ${pad2(FIELD_CASE.n)}: ${FIELD_CASE.ticket.subject}

${today()} · real Google Analytics exports, ${FIELD_CASE.period}

## Your calls — ${result.fieldsCorrect}/3 correct

- **Verdict** ${mark(result.verdictCorrect)} — you said: ${label(FIELD_VERDICTS, guess.verdict)}${result.verdictCorrect ? "" : `\n  - Truth: ${label(FIELD_VERDICTS, FIELD_VERDICT_TRUTH)}`}
- **Smoking gun** ${mark(result.gunCorrect)} — you said: ${label(FIELD_GUNS, guess.gun)}${result.gunCorrect ? "" : `\n  - Truth: ${label(FIELD_GUNS, FIELD_GUN_TRUTH)}`}
- **First action** ${mark(result.remedyCorrect)} — you said: ${label(FIELD_REMEDIES, guess.remedy)}${result.remedyCorrect ? "" : `\n  - Truth: ${label(FIELD_REMEDIES, FIELD_REMEDY_TRUTH)}`}

Confidence before the reveal: ${confidenceText(guess.confidence)}.

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

