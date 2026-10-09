import React, { useEffect, useId, useRef, useState } from "react";
import { QDIR, QMAG, GLOSSARY } from "../../engine/engine.js";
import { T, card, gatedBtn, btn, pillBtn } from "../theme.js";
import { Term, Chip, ChoiceGroup, ScoreCard } from "../shared.jsx";
import QuizMock from "./QuizMock.jsx";

export const WAGERS = [
  { id: 1, label: "Hunch", note: "right +1 · wrong 0" },
  { id: 2, label: "Confident", note: "right +2 · wrong −1" },
  { id: 3, label: "Certain", note: "right +3 · wrong −2" },
];
export const MAX_Q_POINTS = 5;   // wager 3 (direction) + 1 magnitude + 1 mechanism
const dirLabel = (id) => QDIR.find((d) => d.id === id)?.label || "—";
const magLabel = (id) => QMAG.find((m) => m.id === id)?.label || "—";

/* One "Which Test Won?" scenario: predict direction, size and how sure
   you are (a wager) → name the mechanism → the reveal. Each stage
   replaces the last, so focus moves to the new stage's heading. The
   scenarios are realistic, not reports of particular tests. */
export default function QuizRound({ item, idx, total, onComplete }) {
  const [stage, setStage] = useState("predict");   // predict | mech | reveal
  const [dir, setDir] = useState(null);
  const [mag, setMag] = useState(null);
  const [wager, setWager] = useState(null);
  const [mechPick, setMechPick] = useState(null);
  const stageRef = useRef(null);
  const shownStage = useRef(stage);
  useEffect(() => {
    if (shownStage.current === stage) return;
    shownStage.current = stage;
    const h = stageRef.current?.querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
  }, [stage]);
  const ids = { dir: useId(), mag: useId(), wager: useId(), mech: useId() };

  const dirOk = dir === item.answer;
  const magOk = mag === item.mag;
  const mechOk = mechPick === item.mech.correct;
  const dirPoints = dirOk ? wager : -(wager - 1);
  const points = stage === "reveal" ? dirPoints + (magOk ? 1 : 0) + (mechOk ? 1 : 0) : 0;
  const ready = dir && mag && wager;

  return (
    <div className="rise" style={{ marginTop: 22, maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: T.playerText, fontSize: 14.5, fontWeight: 700 }}>SCENARIO {idx + 1} / {total}</span>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 26, letterSpacing: -0.5, margin: 0 }}>{item.title}</h1>
      </div>
      <p style={{ color: T.body2, fontSize: 16.5, lineHeight: 1.5, marginTop: 6 }}>{item.question}</p>

      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 12 }}>
        {["a", "b"].map((side) => {
          const isWin = stage === "reveal" && item.answer === side;
          const dim = stage === "reveal" && item.answer !== side && (item.answer === "a" || item.answer === "b");
          return (
            <section key={side} aria-label={`${side.toUpperCase()}: ${side === "a" ? item.a : item.b}${isWin ? " — this won" : ""}`} style={{ borderRadius: 16, overflow: "hidden", background: T.panel, border: `2px solid ${isWin ? T.pos : T.border}`, opacity: dim ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 16px 8px" }}>
                <span style={{ fontFamily: T.mono, fontSize: 13.5, color: side === "a" ? T.armA : T.armB, fontWeight: 700 }}>{side.toUpperCase()}</span>
                <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16.5, textAlign: "right" }}>{side === "a" ? item.a : item.b}</span>
              </div>
              <div aria-hidden="true" style={{ padding: "0 16px 16px" }}><QuizMock kind={item.mock} side={side} /></div>
              {stage === "reveal" && <div style={{ background: isWin ? T.posTint : "#ECEBEE", color: isWin ? T.pos : T.muted, fontFamily: T.mono, fontWeight: 700, fontSize: 13.5, textAlign: "center", padding: "7px 0" }}>{isWin ? "✓ this won" : "—"}</div>}
            </section>
          );
        })}
      </div>

      <div ref={stageRef}>
        {stage === "predict" && (
          <section style={{ ...card(), marginTop: 16 }}>
            <h2 className="sr-only">Your prediction</h2>
            <QLabel id={ids.dir} n="1" text="Which won — and is there even a real winner?" />
            <ChoiceGroup labelId={ids.dir} options={QDIR} value={dir} onChange={setDir} btnStyle={(on) => ({ ...pillBtn(on), padding: "10px 12px", textAlign: "left" })} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 200px),1fr))", gap: 8, marginBottom: 14 }} />
            <QLabel id={ids.mag} n="2" text="How big is the effect (relative to A)?" />
            <ChoiceGroup labelId={ids.mag} options={QMAG} value={mag} onChange={setMag} btnStyle={(on) => ({ ...pillBtn(on), flex: "1 1 auto", padding: "8px 12px", fontSize: 14 })} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }} />
            <QLabel id={ids.wager} n="3" text="How sure are you? (you're wagering points)" />
            <ChoiceGroup labelId={ids.wager} options={WAGERS} value={wager} onChange={setWager}
              render={(w) => <><span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{w.label}</span><span style={{ display: "block", fontSize: 13, fontFamily: T.mono, marginTop: 2 }}>{w.note}</span></>}
              btnStyle={(on) => ({ ...pillBtn(on), padding: "9px 8px" })} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 140px),1fr))", gap: 8, marginBottom: 16 }} />
            <button type="button" onClick={() => setStage("mech")} disabled={!ready} style={{ ...gatedBtn(ready), width: "100%" }}>{ready ? "Lock it in →" : "Answer all three to lock it in"}</button>
          </section>
        )}

        {stage === "mech" && (
          <section className="rise" style={{ ...card(), marginTop: 16 }}>
            <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, margin: "0 0 10px" }}>Whatever the result — which principle best explains it?</h2>
            <ChoiceGroup label="Which principle best explains it?" options={item.mech.options.map((o, i) => ({ id: i, label: o }))} value={mechPick} onChange={setMechPick}
              btnStyle={(on) => ({ ...pillBtn(on), padding: "11px 13px", textAlign: "left" })} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }} />
            <button type="button" onClick={() => setStage("reveal")} disabled={mechPick == null} style={{ ...gatedBtn(mechPick != null), width: "100%" }}>Reveal the result →</button>
          </section>
        )}

        {stage === "reveal" && (
          <section className="rise" style={{ ...card(), marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 19.5, color: points > 0 ? T.pos : points < 0 ? T.neg : T.muted }}>{points > 0 ? "+" : ""}{points} {Math.abs(points) === 1 ? "point" : "points"}</h2>
              <Chip>{item.stack} · CRO Stack</Chip>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 180px),1fr))", gap: 8, marginBottom: 12 }}>
              <ScoreCard ok={dirOk} title={`Direction (${WAGERS.find((w) => w.id === wager).label.toLowerCase()})`} you={dirLabel(dir)} truth={dirOk ? null : `Answer: ${dirLabel(item.answer)}`} />
              <ScoreCard ok={magOk} title="Effect size" you={magLabel(mag)} truth={magOk ? null : `Answer: ${magLabel(item.mag)}`} />
              <ScoreCard ok={mechOk} title="Mechanism" you={item.mech.options[mechPick]} truth={mechOk ? null : `Answer: ${item.mech.options[item.mech.correct]}`} />
            </div>
            <p style={{ fontSize: 15.5, lineHeight: 1.55, margin: "0 0 8px" }}>{item.result}</p>
            <p style={{ background: T.panel2, borderRadius: 10, padding: "11px 13px", fontSize: 15, lineHeight: 1.55, margin: 0 }}>
              <b style={{ color: T.playerText }}>Why:</b> {item.term && GLOSSARY[item.term] ? <Term term={item.term}>{item.principle}</Term> : item.principle}
            </p>
            <button type="button" onClick={() => onComplete({ dirOk, magOk, mechOk, wager, points })} style={{ ...btn(T.playerBtn), width: "100%", marginTop: 14 }}>{idx + 1 >= total ? "See your calibration →" : "Next scenario →"}</button>
          </section>
        )}
      </div>
    </div>
  );
}

function QLabel({ id, n, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
      <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 22, background: T.panel2, border: `1px solid ${T.border}`, color: T.body2, fontFamily: T.mono, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
      <span id={id} style={{ fontSize: 15, fontWeight: 600 }}>{text}</span>
    </div>
  );
}
