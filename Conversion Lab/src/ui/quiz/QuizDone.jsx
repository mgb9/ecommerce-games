import React from "react";
import { T, card, btn, ghostBtn } from "../theme.js";
import { Term, SectionTitle, MiniStat } from "../shared.jsx";
import { MAX_Q_POINTS } from "./QuizRound.jsx";
import { WhatThisDevelops } from "../Outcomes.jsx";
import { OUTCOMES } from "../outcomesModel.js";

export default function QuizDone({ results, total, onReplay, onLab, onLog }) {
  const pts = results.reduce((a, r) => a + r.points, 0);
  const maxPts = total * MAX_Q_POINTS;
  const dirHits = results.filter((r) => r.dirOk).length;
  const magHits = results.filter((r) => r.magOk).length;
  const mechHits = results.filter((r) => r.mechOk).length;
  const certain = results.filter((r) => r.wager === 3);
  const certainWrong = certain.filter((r) => !r.dirOk).length;
  const overconfident = certainWrong >= 2;
  const ratio = maxPts ? pts / maxPts : 0;
  const verdict = ratio >= 0.7 ? "Sharp — and well-calibrated. You knew which calls to bet on." :
    ratio >= 0.4 ? "Direction is the easy part; sizing the effect and naming the mechanism is where the marks are." :
    "The data humbles intuition — which is the entire reason we test rather than assert.";
  return (
    <div className="rise" style={{ marginTop: 28, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
      <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 13.5, letterSpacing: 2 }}>WHICH TEST WON?</div>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 40, margin: "8px 0" }}>You scored <span style={{ color: pts >= 0 ? T.playerText : T.neg }}>{pts}</span><span style={{ color: T.muted, fontSize: 24 }}> / {maxPts}</span></h1>
      <p style={{ color: T.body2, fontSize: 17, lineHeight: 1.6 }}>{verdict}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 150px),1fr))", gap: 10, marginTop: 18 }}>
        <MiniStat label="Direction" value={`${dirHits}/${total}`} accent={T.pos} />
        <MiniStat label="Effect size" value={`${magHits}/${total}`} accent={T.amber} />
        <MiniStat label="Mechanism" value={`${mechHits}/${total}`} accent={T.armB} />
      </div>
      <section style={{ ...card(), marginTop: 16, textAlign: "left" }}>
        <SectionTitle>{overconfident ? "You over-bet your certainty" : "Calibration is the real skill"}</SectionTitle>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: T.text, margin: 0 }}>
          {overconfident
            ? <>You went <b>“Certain”</b> and were wrong {certainWrong} times — each cost you points. Confidence should track evidence, not conviction. </>
            : <>Notice the drop from getting the <i>direction</i> right to sizing the <i>effect</i> and naming the <i>mechanism</i>. </>}
          Sizes surprise everyone, some changes have no winner, and some reverse by segment. That's why every change runs through the <Term term="crostack">CRO Stack</Term>: find it in the <b>data</b>, prioritise by <b>strategy</b>, design with <b>psychology</b>, and prove it with a <b>test</b>.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: T.body2, margin: "10px 0 0" }}>These scenarios are realistic, written to reflect typical published findings — not reports of particular tests.</p>
      </section>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
        <button type="button" onClick={onReplay} style={btn(T.playerBtn)}>Play again ↺</button>
        <button type="button" onClick={onLab} style={ghostBtn}>Back to the lab →</button>
        {onLog && <button type="button" onClick={onLog} style={ghostBtn}>Your experiment log →</button>}
      </div>
      <WhatThisDevelops outcomes={OUTCOMES.quiz} title="What this round develops" style={{ marginTop: 18, textAlign: "left" }} />
    </div>
  );
}
