import React, { useMemo } from "react";
import { CASES, generateCase, reviewTrail, variantFor } from "../engine/engine.js";
import { FIELD_CASES } from "../engine/fieldcase.js";
import { T } from "./theme.js";
import { pad2 } from "./format.js";
import { CaseFrame } from "./shared.jsx";
import { PrintBar, Section, subHead, useDocumentTitle } from "./report/ReportView.jsx";
import { causeLabel, dimsText, segsText, startText } from "./report/labels.js";

/* Instructor only (see App): the answer sheet for a seed. For every
   generated case, which variant this seed gives first and which a retry
   gives, with each variant's ticket, truth, the view where the signal
   lives and what happened; and the field cases' three calls. Printable,
   for running a shared-seed seminar debrief without playing every case. */
export default function AnswerSheet({ autoFocus, cfg, onBack }) {
  useDocumentTitle(`Data Detective – Answer sheet – seed ${cfg.seed}`, "");
  // every case by number: a generated case's variants, or a field case's question
  const rows = useMemo(() => [
    ...CASES.map((def) => {
      const first = variantFor(def.id, cfg.seed, 1);
      return { n: def.n, def, variants: def.variants.map((v, i) => {
        const cd = generateCase(def.id, cfg.seed, { noise: cfg.noise, variant: i });
        const review = reviewTrail(cd, [], [], []);
        return { i, v, truth: cd.truth, decisive: review.decisive, funnelStage: review.funnelStage, order: i === first ? "first attempt" : `retry ${((i - first + def.variants.length) % def.variants.length)}` };
      }) };
    }),
    ...FIELD_CASES.map((q) => ({ n: q.n, q })),
  ].sort((a, b) => a.n - b.n), [cfg]);
  const cell = { padding: "6px 10px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top" };
  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Instructor · answer sheet" phase="answers">
      <div className="rise" style={{ marginTop: 22 }}>
        <PrintBar onBack={onBack} backLabel="← back" />
        <article className="dd-report" aria-labelledby="dd-answers-title" style={{ background: "#FFFFFF", color: T.text, maxWidth: 900, margin: "0 auto", padding: "clamp(22px, 5vw, 46px) clamp(18px, 5vw, 50px)", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 14.5, lineHeight: 1.5 }}>
          <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Data Detective · Instructor answer sheet · not for students</div>
            <h1 id="dd-answers-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>Seed <span style={{ fontFamily: T.mono }}>{cfg.seed}</span> · noise {cfg.noise.toFixed(1)}×</h1>
            <p style={{ margin: 0, color: T.muted, fontSize: 13.5 }}>The seed picks each case's first variant; a retry (or a replay after a first attempt) moves to the next. Students with a different seed may get the other variant first. Days are written as on the dashboard: W3 Fri is the Friday of week 3. The numbers are this seed's, at this noise level — the same ones students see.</p>
          </header>
          {rows.map((row) => row.q ? <FieldAnswers key={row.q.id} q={row.q} /> : (
            <Section key={row.def.id} title={`Case ${pad2(row.def.n)} · ${row.def.title}`}>
              {row.variants.map(({ i, v, truth, decisive, funnelStage, order }) => (
                <div key={i} style={{ marginBottom: 14, breakInside: "avoid" }}>
                  <h3 style={subHead}>Variant {String.fromCharCode(65 + i)} — {order} for this seed</h3>
                  <p style={{ margin: "0 0 6px" }}><b>Ticket:</b> {v.ticket.subject}</p>
                  <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 6 }}>
                    <tbody>
                      <tr><th scope="row" style={{ ...cell, textAlign: "left", width: 130 }}>Answer</th><td style={cell}>{dimsText(truth)}{truth.dimension && <> · <b>{segsText(truth)}</b></>} · {causeLabel(truth.causeType)} · {truth.startDay == null ? "no start date" : <>starts {startText(truth)}{truth.dateTolerance ? ` (±${truth.dateTolerance} days accepted)` : " (±2 days accepted)"}</>}{truth.shape === "spike-revert" && ` · ends after ${row.def.variants[i].incident.days} days`}</td></tr>
                      <tr><th scope="row" style={{ ...cell, textAlign: "left" }}>Where it shows</th><td style={cell}>{decisive}{funnelStage ? `; the funnel, filtered to the segment, pins the ${funnelStage} step` : ""}{truth.lens ? "; view the report by average order value" : ""}{truth.causeType === "attribution_change" ? "; the sitewide total and back-office orders are flat" : ""}{truth.causeType === "tracking_bug" ? "; back-office orders don't dip" : ""}{truth.causeType === "traffic_quality" ? "; view it by sessions: the segment's share surged while no segment's own rate fell" : ""}</td></tr>
                      <tr><th scope="row" style={{ ...cell, textAlign: "left" }}>Real event</th><td style={cell}>{v.events.filter((e) => e.real).map((e) => e.label).join("; ") || "none"}</td></tr>
                    </tbody>
                  </table>
                  <p style={{ margin: "0 0 6px", color: T.body2 }}>{truth.explanation.what}</p>
                  <p style={{ margin: 0, color: T.body2 }}><b style={{ color: T.text }}>With this seed's data:</b> {truth.explanation.data}</p>
                </div>
              ))}
            </Section>
          ))}
        </article>
      </div>
    </CaseFrame>
  );
}

function FieldAnswers({ q }) {
  return (
    <Section title={`Case ${pad2(q.n)} · ${q.title} (real data — one version)`}>
      <p style={{ margin: "0 0 6px" }}><b>Verdict:</b> {q.verdicts.find((o) => o.id === q.verdictTruth).label}</p>
      <p style={{ margin: "0 0 6px" }}><b>Smoking gun:</b> {q.guns.find((o) => o.id === q.gunTruth).label}</p>
      <p style={{ margin: "0 0 6px" }}><b>First action:</b> {q.remedies.find((o) => o.id === q.remedyTruth).label}</p>
      <p style={{ margin: 0 }}><b>Core clues:</b> {q.clues.filter((c) => c.core).map((c) => c.label).join("; ")}.</p>
    </Section>
  );
}
