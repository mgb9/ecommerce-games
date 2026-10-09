import { causeLabel, dimsText, segsText, startText } from "./report/labels.js";

/* How the instructor pages (the answer sheet and the tutor's guide) word a
   generated case's answer and where its signal shows — one wording, so the
   two pages never disagree. `withStart: false` leaves out the start date,
   which changes with the seed. */
export function answerText(truth, incident, { withStart = true } = {}) {
  const parts = [dimsText(truth) + (truth.dimension ? ` · ${segsText(truth)}` : ""), causeLabel(truth.causeType)];
  if (withStart) parts.push(truth.startDay == null ? "no start date" : `starts ${startText(truth)} (±${truth.dateTolerance || 2} days accepted)`);
  if (truth.shape === "spike-revert") parts.push(`ends after ${incident.days} days`);
  return parts.join(" · ");
}

export function whereItShows(truth, review) {
  return [
    review.decisive,
    review.funnelStage && `the funnel, filtered to the segment, pins the ${review.funnelStage} step`,
    truth.lens && "view the report by average order value",
    truth.causeType === "attribution_change" && "the sitewide total and back-office orders are flat",
    truth.causeType === "tracking_bug" && "back-office orders don't dip",
    truth.causeType === "traffic_quality" && "view it by sessions: the segment's share surged while no segment's own rate fell",
  ].filter(Boolean).join("; ");
}
