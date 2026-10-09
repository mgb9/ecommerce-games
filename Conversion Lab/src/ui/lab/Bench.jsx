import React, { useId } from "react";
import { BANDS, requiredSampleSize, clamp, pct } from "../../engine/engine.js";
import { T, card, pillBtn, croBtn, gatedBtn } from "../theme.js";
import { Term, Chip, SectionTitle, ChoiceGroup, QuestionLabel, NumRow, Slider } from "../shared.jsx";
import MockPage from "./MockPage.jsx";

export const WINNERS = [{ id: "a", label: "A wins" }, { id: "none", label: "No difference" }, { id: "b", label: "B wins" }];

/* The lab bench: see the two variants, commit a prediction (winner and
   effect size) and a sample size — before any data. The planner uses the
   student's own assumptions (baseline, minimum detectable effect), never
   the hidden truth; their MDE also decides later whether "no real
   difference" was a supported call. */
export default function Bench({ exp, base, cfg, bench, setBench, onCommit }) {
  const { predWinner, predBand, plannedN, baseAssume, mdeAssume } = bench;
  const set = (patch) => setBench((b) => ({ ...b, ...patch }));
  const reqN = requiredSampleSize(baseAssume / 100, mdeAssume / 100, cfg.alpha, cfg.power);
  const ready = predWinner != null && predBand != null;
  const winnerId = useId(), bandId = useId();
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: T.playerText, fontSize: 14.5, fontWeight: 700 }}>EXPERIMENT {base.n}</span>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 28, letterSpacing: -0.5, margin: 0 }}>{base.title}</h1>
        <Chip>{base.principle}</Chip>
      </div>
      <p style={{ color: T.body2, fontSize: 16, lineHeight: 1.55, marginTop: 8, maxWidth: 860 }}>{base.context}</p>

      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 12 }}>
        <VariantCard tag="A · Control" color={T.armA} kind={base.mock.kind} variant="A" label={base.control.label} note={base.control.note} />
        <VariantCard tag="B · Challenger" color={T.armB} kind={base.mock.kind} variant="B" label={base.variant.label} note={base.variant.rationale} isHypothesis />
      </div>

      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 16 }}>
        <section style={card()}>
          <SectionTitle>1 · Form your hypothesis</SectionTitle>
          <p style={{ fontSize: 14.5, color: T.body2, margin: "0 0 8px" }}>The control currently converts at about <b style={{ color: T.text }}>{pct(base.baselineRate)}</b>{base.metricLabel ? ` (${base.metricLabel})` : ""}. Which version wins, and by how much?</p>
          <QuestionLabel id={winnerId}>Your predicted winner</QuestionLabel>
          <ChoiceGroup labelId={winnerId} options={WINNERS} value={predWinner} onChange={(id) => set({ predWinner: id })} btnStyle={(on) => pillBtn(on)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }} />
          <QuestionLabel id={bandId} style={{ marginTop: 16 }}>Predicted effect size, in <Term term="pp">percentage points</Term></QuestionLabel>
          <ChoiceGroup labelId={bandId} options={BANDS} value={predBand} onChange={(id) => set({ predBand: id })} btnStyle={(on) => ({ ...pillBtn(on), textAlign: "left", padding: "9px 12px" })} style={{ display: "flex", flexDirection: "column", gap: 6 }} />
        </section>

        <section style={card()}>
          <SectionTitle>2 · Plan the sample size</SectionTitle>
          <p style={{ fontSize: 14.5, color: T.body2, margin: "0 0 12px", lineHeight: 1.5 }}>
            How many visitors <i>per arm</i> do you need? Bigger effects are easy to spot; small ones need huge samples. Commit before you see any data.
          </p>
          <NumRow label="Assumed baseline rate" name="assumed baseline rate" unit="percent" value={baseAssume} suffix="%" step={0.1} onChange={(v) => set({ baseAssume: v })} />
          <NumRow label={<><Term term="mde">Minimum detectable effect</Term></>} name="minimum detectable effect" unit="percentage points" value={mdeAssume} suffix="pp" step={0.1} onChange={(v) => set({ mdeAssume: v })} />
          <div style={{ background: T.panel2, borderRadius: 10, padding: "12px 14px", margin: "6px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13.5, color: T.muted }}>Required per arm (at <Term term="alpha">α</Term> = {cfg.alpha}, <Term term="power">power</Term> {Math.round(cfg.power * 100)}%)</div>
              <div aria-live="polite" style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 22, color: T.playerText }}>{isFinite(reqN) ? reqN.toLocaleString("en-GB") : "∞"}</div>
            </div>
            <button type="button" onClick={() => set({ plannedN: clamp(reqN, 200, cfg.maxVisitors) })} disabled={!isFinite(reqN)} style={croBtn(!isFinite(reqN), true)}>Use this →</button>
          </div>
          <Slider label="Sample size to run (per arm)" accent={T.player} value={plannedN} min={200} max={cfg.maxVisitors} step={100}
            fmt={(v) => v.toLocaleString("en-GB")} valueText={(v) => `${v.toLocaleString("en-GB")} visitors per arm`}
            hint={plannedN < reqN && isFinite(reqN) ? `⚠ Below the ${reqN.toLocaleString("en-GB")} your plan calls for${reqN > cfg.maxVisitors ? ` (more than the ${cfg.maxVisitors.toLocaleString("en-GB")} this lab allows)` : ""} — you may be underpowered.` : "Total visitors simulated = twice this (both arms)."}
            onChange={(v) => set({ plannedN: v })} />
          <button type="button" onClick={onCommit} disabled={!ready} style={{ ...gatedBtn(ready), width: "100%", marginTop: 8 }}>{ready ? "Run the test ▸" : "Make both predictions to continue"}</button>
        </section>
      </div>
    </div>
  );
}

function VariantCard({ tag, color, kind, variant, label, note, isHypothesis }) {
  return (
    <section style={{ ...card(), borderColor: color + "66" }} aria-label={`${tag}: ${label}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, fontSize: 13.5, color, fontWeight: 700 }}>{tag}</span>
        <h2 style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 16 }}>{label}</h2>
      </div>
      <MockPage kind={kind} variant={variant} label={`${tag}, ${label}`} />
      <p style={{ fontSize: 14, color: T.body2, margin: "10px 0 0", lineHeight: 1.45 }}>{isHypothesis ? <><b style={{ color: T.text }}>Hypothesis:</b> {note}</> : note}</p>
    </section>
  );
}
