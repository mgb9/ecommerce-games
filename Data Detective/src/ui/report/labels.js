import { DMAP, CAUSE_TYPES, REPORTS, GLOSSARY, dayShort } from "../../engine/engine.js";
import { CONFIDENCE } from "../progress.js";

/* Words for answers, reports and verdicts — shared by the reveal screens
   and the case report, so both always describe a result the same way. */

export const dimLabel = (key) => DMAP[key]?.label || key || "—";
const segLabel = (dimKey, segId) => DMAP[dimKey]?.segments.find((s) => s.id === segId)?.name || segId || "—";
const NOTHING = "None — nothing is broken";
export const isNone = (o) => !o.dimension || o.dimension === "none";
export const causeLabel = (id) => CAUSE_TYPES.find((c) => c.id === id)?.label || id || "—";
// A diagnosis (or the truth) names one dimension/segment, a cross-tab pair,
// or — a legitimate answer — nothing at all.
export const dimsText = (o) => (isNone(o) ? NOTHING : o.secondary ? `${dimLabel(o.dimension)} × ${dimLabel(o.secondary)}` : dimLabel(o.dimension));
export const segsText = (o) => (isNone(o) ? "—" : o.secondary ? `${segLabel(o.dimension, o.segment)} / ${segLabel(o.secondary, o.segmentB)}` : segLabel(o.dimension, o.segment));
export const startText = (o) => (isNone(o) || o.startDay == null ? "—" : dayShort(o.startDay));
export const confidenceText = (id) => { const c = CONFIDENCE.find((x) => x.id === id); return c ? `${c.label} (${c.hint})` : "—"; };

export const REPORT_LABELS = Object.fromEntries([
  ["realtime", "Realtime"], ["funnel", "Funnel exploration"], ["orders", "Back-office orders"],
  ...REPORTS.flatMap((g) => g.items.map((it) => [it.dim, it.label])),
]);
export const pivotLabel = (p) => p.split("×").map(dimLabel).join(" × ");
const LENS_NAMES = { conversionRate: "conversion rate", sessions: "sessions", revenue: "revenue", aov: "average order value" };
export const lensLabel = (l) => { const [report, metric] = l.split(":"); return `${REPORT_LABELS[report] || report} by ${LENS_NAMES[metric] || metric}`; };

// An explanation's four parts, in reading order, with their headings.
export const EXPLANATION_PARTS = [["what", "What happened"], ["data", "What the data showed"], ["herrings", "What wasn't the cause"], ["next", "What should happen next"]];
export const explanationSections = (ex) => EXPLANATION_PARTS.map(([key, label]) => ({ key, label, text: ex[key], plain: ex.plain?.[key] ?? ex[key] }));

// Calibration: did the stated confidence match how the student did?
// "Very sure" should mean right about nine times in ten. [text, tone].
const VERDICTS = {
  90: [["Well calibrated: very sure, and fully right.", "pos"], ["Overconfident: “very sure” should mean fully right about nine times in ten. What did you take as proof that wasn't?", "neg"]],
  70: [["Fully right, and fairly sure — a reasonable call. Was anything left that would have made you certain?", "pos"], ["Fairly sure, and not fully right: what single check would have changed your mind?", "amber"]],
  50: [["Fully right on a hunch — the evidence was better than you thought. Trust it a little more next time.", "amber"], ["A hunch, and not fully right: what evidence would have turned it into a diagnosis?", "amber"]],
};
export const calibrationVerdict = (confidence, allCorrect) => {
  const v = VERDICTS[confidence]?.[allCorrect ? 0 : 1];
  return v ? { text: v[0], tone: v[1] } : null;
};

// The same verdict in two or three words, for the case file's table.
const SHORT = { 90: [["Well calibrated", "pos"], ["Overconfident", "neg"]], 70: [["Reasonable", "pos"], ["A little too sure", "amber"]], 50: [["Underconfident", "amber"], ["An honest hunch", "amber"]] };
export const calibrationShort = (confidence, allCorrect) => {
  const v = SHORT[confidence]?.[allCorrect ? 0 : 1];
  return v ? { text: v[0], tone: v[1] } : null;
};

// Display names for the glossary keys a case report lists under "Words to know".
const WORD_NAMES = {
  segmentation: "Segmentation", correlation: "Correlation", redherring: "Red herring", baseline: "Baseline", anomaly: "Anomaly",
  gateway: "Payment gateway", pp: "Percentage points (pp)", crosstab: "Cross-tab", funnelstep: "Funnel step", conversion: "Conversion",
  cro: "CRO", mixshift: "Mix shift", masking: "Masking", selfreferral: "Self-referral", exclusionlist: "Referral exclusion list",
  testtraffic: "Test traffic", aov: "AOV (average order value)", pla: "PLA (Product Listing Ads)", groundtruth: "Ground truth",
  calibration: "Calibration", noise: "Noise", revenuetree: "Revenue = sessions × conversion × AOV", coverage: "Data coverage", attribution: "Attribution",
};
export const wordsFor = (keys) => keys.filter((k) => GLOSSARY[k]).map((k) => ({ term: WORD_NAMES[k] || k, def: GLOSSARY[k] }));

export const longDate = (d = new Date()) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
