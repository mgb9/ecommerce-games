import React from "react";
import { EXPERIMENTS, CRO_STACK } from "../engine/engine.js";
import { T, btn } from "./theme.js";
import { PT, Term, TermsHint, Eyebrow, LOS } from "./shared.jsx";

const status = (p) => {
  if (!p) return null;
  const word = (v) => (v == null ? "no claim" : v ? "✓" : "✗");
  return `Done · sound call ${p.soundCall ? "✓" : "✗"} · matched the truth ${word(p.matchedTruth)}`;
};
const statusSr = (p) => p && `Done on your first attempt: the call was ${p.soundCall ? "sound" : "not sound"}${p.matchedTruth == null ? " and made no claim" : p.matchedTruth ? " and matched the truth" : " and missed the truth"}.`;

/* The lab's front page: the three modes, the experiment set (each card
   says whether this browser has done it, in words), and the CRO Stack
   the lab is built on. */
export default function Intro({ onStart, onQuiz, onWireframe, cfg, progress }) {
  const modeCard = (icon, title, desc, onClick) => (
    <button type="button" onClick={onClick} style={{ width: "100%", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", background: T.panel, border: `1px solid ${T.border}`, borderLeft: `5px solid ${T.amberFill}`, borderRadius: 16, padding: "16px 18px", cursor: "pointer", boxShadow: T.shadow, fontFamily: T.body }}>
      <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">{icon}</span>
      <span>
        <span style={{ display: "block", fontFamily: T.display, fontWeight: 700, fontSize: 19.5, color: T.text }}>{title}</span>
        <span style={{ display: "block", color: T.body2, fontSize: 15, lineHeight: 1.5, marginTop: 3 }}>{desc}</span>
      </span>
    </button>
  );
  const done = EXPERIMENTS.filter((e) => progress[e.id]).length;
  return (
    <div className="rise" style={{ maxWidth: 1180, margin: "48px auto 0" }}>
      <div style={{ maxWidth: 820 }}>
        <Eyebrow>A/B testing · LO2 · LO3</Eyebrow>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(34px, 7vw, 50px)", lineHeight: 1.04, letterSpacing: -1.2, margin: "16px 0 0" }}>
          <PT rich={<>Design is a hypothesis. <span style={{ color: T.player }}>Prove it with data.</span></>}
              plain={<>A design is only a guess. <span style={{ color: T.player }}>Use data to test it.</span></>} />
        </h1>
        <p style={{ color: T.body2, fontSize: 19, lineHeight: 1.6, marginTop: 18 }}>
          Each experiment shows two <b style={{ color: T.text }}>Chrichton</b> page variants. Predict which converts better and by how
          much, commit a <Term term="samplesize">sample size</Term>, then run a seeded <Term term="abtest">A/B test</Term> with
          real statistical noise. The gap between your hunch and the data is the lesson.
        </p>
        <p style={{ color: T.body2, fontSize: 14.5, lineHeight: 1.55, margin: "6px 0 0" }}>
          <b style={{ color: T.text }}>Learning outcomes.</b> LO2: {LOS.LO2} LO3: {LOS.LO3}
        </p>
      </div>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 300px),1fr))", gap: 16, margin: "26px 0 0" }}>
        <li style={{ display: "flex" }}>{modeCard("🧱", "Wireframe Studio", "Assemble a product page for a brief, then test your design against the current page.", onWireframe)}</li>
        <li style={{ display: "flex" }}>{modeCard("🏆", "Which Test Won?", "Realistic A/B-test scenarios — call the winner, the size of the effect and the mechanism.", onQuiz)}</li>
      </ul>
      <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 21, margin: "28px 0 12px" }}>A/B experiment set{done ? <span style={{ fontFamily: T.body, fontWeight: 400, fontSize: 15, color: T.body2 }}> · {done} of {EXPERIMENTS.length} done</span> : null}</h2>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 230px),1fr))", gap: 14 }}>
        {EXPERIMENTS.map((e, i) => (
          <li key={e.id} style={{ display: "flex" }}>
            <button type="button" onClick={() => onStart(i)} style={{ width: "100%", textAlign: "left", background: T.panel, border: `1px solid ${progress[e.id] ? T.posFill : T.border}`, borderRadius: 16, padding: "14px 16px", cursor: "pointer", boxShadow: T.shadow, fontFamily: T.body }}>
              <span style={{ display: "block", fontFamily: T.mono, fontSize: 13.5, fontWeight: 700, color: T.second }}>{String(e.n).padStart(2, "0")}</span>
              <span style={{ display: "block", fontFamily: T.display, fontWeight: 700, fontSize: 18, color: T.text, margin: "3px 0 4px", lineHeight: 1.25 }}>{e.title}</span>
              <span style={{ display: "block", color: T.body2, fontSize: 14.5 }}>{e.principle}</span>
              {progress[e.id] && <span style={{ display: "block", color: T.pos, fontSize: 13.5, fontWeight: 700, marginTop: 6 }}><span aria-hidden="true">{status(progress[e.id])}</span><span className="sr-only">{statusSr(progress[e.id])}</span></span>}
            </button>
          </li>
        ))}
      </ol>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 24, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onStart(0)} style={btn(T.playerBtn)}>Run the full set →</button>
        <span style={{ color: T.body2, fontSize: 15.5 }}>{EXPERIMENTS.length} experiments · seed <b style={{ color: T.text, fontFamily: T.mono }}>{cfg.seed}</b></span>
      </div>
      <TermsHint />
      <section aria-labelledby="cl-stack" style={{ marginTop: 30 }}>
        <h2 id="cl-stack" style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: 1.5, color: T.body2, margin: "0 0 10px", fontWeight: 700 }}>BUILT ON THE CRO STACK</h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 150px),1fr))", gap: 10 }}>
          {CRO_STACK.map((s, i) => (
            <li key={s.k} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", boxShadow: T.shadow }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 22, background: T.instructor, color: T.onAccent, fontFamily: T.mono, fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15.5 }}>{s.k}</span>
              </div>
              <div style={{ color: T.body2, fontSize: 14, lineHeight: 1.4 }}>{s.d}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
