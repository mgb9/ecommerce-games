import React, { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { pct, pEq, profitPerThousand, gbp } from "../../engine/engine.js";
import { T, card, tipStyle } from "../theme.js";
import { Term, SectionTitle, Chart } from "../shared.jsx";

export const metricOf = (exp) => exp.metricLabel || "conversion rate";
const fmtN = (n) => n.toLocaleString("en-GB");
const kTick = (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v);

/* The run plays out over a few seconds: both arms' observed rates and the
   p-value, checkpoint by checkpoint, so students watch significance come
   and go. Screen-reader users get the same story without a running
   commentary: each chart is an image with a description of where it
   stands, and a polite live region speaks only when the verdict flips
   and when the run is complete. */
export default function Running({ exp, base, cfg, result, animN, total, liveStat, animComplete, plannedN, onCall }) {
  const chartData = result.series.filter((s) => s.n <= (animN || 1)).map((s) => ({ n: s.n, A: +(s.rA * 100).toFixed(3), B: +(s.rB * 100).toFixed(3), p: +s.pValue.toFixed(4) }));
  const canStop = cfg.peeking && !animComplete && animN > 200;
  const leader = liveStat.diff > 0 ? "B" : "A";
  const chipColor = liveStat.significant ? (liveStat.diff > 0 ? T.armB : T.armA) : T.amber;
  const metric = metricOf(exp);
  const firstSig = result.firstSignificantN != null && result.firstSignificantN <= animN ? result.firstSignificantN : null;

  // the live announcement: only on a change of verdict, and at the end
  const [said, setSaid] = useState("");
  const lastSig = useRef(null);
  useEffect(() => {
    if (animComplete) { setSaid(`Run complete at ${fmtN(total)} per arm: ${liveStat.significant ? `significant, ${leader} leads, ${pEq(liveStat.pValue)}` : `not significant, ${pEq(liveStat.pValue)}`}. Make your call below.`); return; }
    if (lastSig.current !== null && lastSig.current !== liveStat.significant) setSaid(liveStat.significant ? `Now significant at ${fmtN(liveStat.n)} per arm, ${leader} leads.` : `No longer significant at ${fmtN(liveStat.n)} per arm.`);
    lastSig.current = liveStat.significant;
  }, [liveStat.significant, animComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 24, letterSpacing: -0.5, margin: 0 }}>Running — {base.title}</h1>
        <span style={{ fontFamily: T.mono, color: T.muted, fontSize: 14.5 }}>{fmtN(animN * 2)} / {fmtN(total * 2)} visitors</span>
      </div>
      <div role="status" className="sr-only">{said}</div>

      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 12 }}>
        <ArmCounter tag="A · Control" color={T.armA} stat={liveStat} arm="A" exp={exp} />
        <ArmCounter tag="B · Challenger" color={T.armB} stat={liveStat} arm="B" exp={exp} />
      </div>

      <section style={{ ...card(), marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <SectionTitle>Observed {metric} as data accrues</SectionTitle>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.panel, border: `1.5px solid ${chipColor}`, color: chipColor === T.amber ? T.amber : chipColor, borderRadius: 20, padding: "5px 12px", fontWeight: 700, fontSize: 14, fontFamily: T.mono }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 8, background: chipColor, animation: animComplete ? "none" : "pulse 1s infinite" }} />
            {liveStat.significant ? `SIGNIFICANT · ${leader} leads · ${pEq(liveStat.pValue)}` : `NOT YET SIGNIFICANT · ${pEq(liveStat.pValue)}`}
          </span>
        </div>
        <Legend />
        <Chart label={`Line chart of observed ${metric} by visitors per arm. At ${fmtN(liveStat.n)} per arm: control A ${pct(liveStat.rA, 2)}, variant B ${pct(liveStat.rB, 2)}.`}>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={chartData} margin={{ top: 6, right: 14, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
              <XAxis dataKey="n" tickLine={false} type="number" domain={[0, total]} tickFormatter={kTick} />
              <YAxis tickLine={false} width={46} tickFormatter={(v) => `${v}%`} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tipStyle} formatter={(v, n) => [`${v}%`, n === "A" ? "Control" : "Variant"]} labelFormatter={(l) => `${l} per arm`} />
              <Line type="monotone" dataKey="A" stroke={T.armA} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="B" stroke={T.armB} strokeWidth={2.5} dot={false} isAnimationActive={false} strokeDasharray="7 3" />
            </LineChart>
          </ResponsiveContainer>
        </Chart>
      </section>

      <section style={{ ...card(), marginTop: 16 }}>
        <SectionTitle><Term term="pvalue">p-value</Term> vs visitors — watch it cross (and re-cross) the line</SectionTitle>
        <Chart label={`Line chart of the p-value by visitors per arm, with the α = ${cfg.alpha} line. Now ${pEq(liveStat.pValue)} at ${fmtN(liveStat.n)} per arm${firstSig ? `; it first fell below α at ${fmtN(firstSig)} per arm` : "; it has not yet fallen below α"}.`}>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={chartData} margin={{ top: 6, right: 14, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
              <XAxis dataKey="n" tickLine={false} type="number" domain={[0, total]} tickFormatter={kTick} />
              <YAxis tickLine={false} width={46} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
              <Tooltip contentStyle={tipStyle} formatter={(v) => [v, "p-value"]} labelFormatter={(l) => `${l} per arm`} />
              <ReferenceLine y={cfg.alpha} stroke={T.amber} strokeDasharray="5 4" label={{ value: `α=${cfg.alpha}`, fill: T.amber, fontSize: 13, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="p" stroke={T.player} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Chart>
        {cfg.peeking && <p style={{ margin: "8px 0 0", fontSize: 14, color: T.amber, lineHeight: 1.45 }}><span aria-hidden="true">⚠ </span><Term term="peeking">Peeking</Term> is enabled — you may stop the moment it dips below α. That's exactly the temptation that inflates false positives and exaggerates effects.</p>}
      </section>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        {!animComplete && !canStop && <p style={{ textAlign: "center", color: T.muted, fontSize: 14.5, fontFamily: T.mono, margin: 0 }}>collecting data… {Math.round((animN / total) * 100)}%</p>}
        {canStop && (
          <div style={{ background: T.amberTint, border: `1px solid ${T.amberFill}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 15, margin: "0 0 10px" }}>You said you'd run to <b>{fmtN(plannedN)}</b> per arm. Stop early at <b>{fmtN(animN)}</b>?</p>
            <button type="button" onClick={() => onCall(liveStat.significant ? (liveStat.diff > 0 ? "b" : "a") : "more", { stoppedEarly: true })} style={{ background: T.amber, color: T.onAccent, border: "none", borderRadius: 999, padding: "10px 18px", fontFamily: T.body, fontWeight: 900, fontSize: 16, cursor: "pointer" }}>⏹ Stop and call it now</button>
          </div>
        )}
        {animComplete && <CallBar onCall={onCall} />}
      </div>
    </div>
  );
}

function Legend() {
  const item = (color, label, dash) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke={color} strokeWidth="3" strokeDasharray={dash} /></svg>{label}
    </span>
  );
  return <div aria-hidden="true" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13.5, color: T.body2, margin: "-4px 0 8px" }}>{item(T.armA, "A · Control")}{item(T.armB, "B · Challenger", "7 3")}</div>;
}

function ArmCounter({ tag, color, stat, arm, exp }) {
  const rate = arm === "A" ? stat.rA : stat.rB;
  const conv = Math.round(rate * stat.n);
  const prof = exp.profit ? profitPerThousand(exp, rate, arm) : null;
  return (
    <section style={{ ...card(), borderColor: color + "55", padding: 16 }} aria-label={`${tag}: ${pct(rate, 2)}, ${fmtN(conv)} of ${fmtN(stat.n)}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: T.mono, fontSize: 13.5, color, fontWeight: 700 }}>{tag}</span>
        <span style={{ fontFamily: T.mono, fontSize: 13.5, color: T.muted }}>{fmtN(conv)} / {fmtN(stat.n)}</span>
      </div>
      <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 38, color, margin: "6px 0 2px" }}>{pct(rate, 2)}</div>
      {prof != null && <div style={{ fontSize: 13.5, color: T.muted }}>≈ {gbp(prof)} profit / 1,000 visitors{arm === "B" ? " (after free shipping)" : ""}</div>}
    </section>
  );
}

export const CALLS = [
  { id: "b", label: "B is the winner", color: T.armB },
  { id: "a", label: "A is the winner", color: T.armA },
  { id: "none", label: "No real difference", color: T.muted },
  { id: "more", label: "Need more data", color: T.amber },
];
function CallBar({ onCall }) {
  return (
    <section style={{ ...card(), textAlign: "center" }}>
      <SectionTitle>The data's in — what's your call?</SectionTitle>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {CALLS.map(({ id, label, color }) => (
          <button key={id} type="button" onClick={() => onCall(id)} style={{ background: "transparent", border: `1.5px solid ${color}`, color, borderRadius: 11, padding: "12px 18px", fontFamily: T.body, fontWeight: 700, fontSize: 15.5, cursor: "pointer" }}>{label}</button>
        ))}
      </div>
    </section>
  );
}
