import React, { useId, useMemo, useState } from "react";
import { EXPERIMENTS, pp } from "../engine/engine.js";
import { BRIEFS } from "../engine/wireframe.js";
import { T, btn } from "./theme.js";
import { PrintBar, Section, articleStyle, subHead, useDocumentTitle, useStudentName } from "./report.jsx";
import { ACTIVITIES, OUTCOMES, LEARNING_OUTCOMES, SKILLS, suiteCoverage } from "./outcomesModel.js";
import { ModuleLink } from "./Outcomes.jsx";
import SkillsRating, { RatingsTable } from "./SkillsRating.jsx";
import { REC_CHECKS, TEAM } from "./lab/Recommendation.jsx";
import { CALLS } from "./lab/Running.jsx";
import { WINNERS } from "./lab/Bench.jsx";
import { loadSkills, saveSkills } from "./progress.js";
import { resultCode } from "./cohort.js";

const yes = (v) => (v == null ? "no claim" : v ? "yes" : "no");
const mark = (v) => (v == null ? "•" : v ? "✓" : "✗");
const tone = (v) => (v == null ? T.muted : v ? T.pos : T.neg);
const longDate = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/* The experiment log: everything this browser has done in the lab, as one
   document to save as a PDF — first attempts (the honest record), how the
   student's judgement held up, their recommendations, a skills record and
   CV lines, the learning outcomes, how to use it in the assessment, their
   self-rating, and the result code for their tutor. */
export default function ExperimentLog({ progress, cfg, onBack, onProgress }) {
  const [name, setName] = useStudentName();
  useDocumentTitle("Conversion Lab – Experiment log", name);
  const [skills, setSkills] = useState(loadSkills);
  const [rating, setRating] = useState(false);
  const nameId = useId();
  const played = EXPERIMENTS.filter((e) => progress[e.id]);
  const recs = played.filter((e) => progress[e.id].recommendation?.text?.trim());
  const doneIds = [...played.map((e) => e.id), ...(progress.quiz ? ["quiz"] : []), ...(progress.wireframe ? ["wireframe"] : [])];
  const hits = (k) => played.filter((e) => progress[e.id][k]).length;
  const claims = played.filter((e) => progress[e.id].matchedTruth != null);
  const soundMissed = played.filter((e) => progress[e.id].soundCall && progress[e.id].matchedTruth === false);
  const lucky = played.filter((e) => !progress[e.id].soundCall && progress[e.id].matchedTruth === true);
  const seeds = [...new Set(played.map((e) => progress[e.id].seed).filter(Boolean))];
  const code = useMemo(() => resultCode(progress, skills, seeds[0] || cfg.seed), [progress, skills, cfg.seed]); // eslint-disable-line react-hooks/exhaustive-deps -- seeds come from progress
  const cov = suiteCoverage(doneIds);
  const label = (id) => ACTIVITIES.find((a) => a.id === id).label;
  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const td = { padding: "7px 8px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <article className="cl-report" aria-labelledby="cl-log-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase" }}>
            <span style={{ color: T.playerText }}>Conversion Lab · Experiment log</span>
            <span style={{ color: T.body2 }}>WM956-15 · LO2 · LO3</span>
          </div>
          <h1 id="cl-log-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 31px)", lineHeight: 1.15, margin: "10px 0 6px" }}>Your experiment log</h1>
          <div style={{ fontSize: 14, color: T.body2 }}>{[longDate(), `${played.length} of ${EXPERIMENTS.length} experiments`, seeds.length ? `seed ${seeds.join(", ")}` : null].filter(Boolean).join(" · ")}</div>
          <div className="cl-noprint" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label htmlFor={nameId} style={{ fontSize: 14.5, fontWeight: 600 }}>Your name (optional, for the PDF)</label>
            <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 8, font: `15px ${T.body}`, minWidth: 200 }} />
          </div>
          {name.trim() && <p className="cl-print-only" style={{ margin: "8px 0 0", fontSize: 14 }}>{name.trim()}</p>}
        </header>

        {played.length === 0 ? (
          <Section title="Nothing here yet"><p style={{ margin: 0 }}>Run an experiment and this log fills in: your prediction, your call, and what each one developed.</p></Section>
        ) : (
          <>
            <Section title="Experiment by experiment (first attempts)">
              <div role="region" aria-label="Experiment by experiment (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, minWidth: 620 }}>
                  <thead><tr>{["Experiment", "You predicted", "Your call", "Sound?", "Matched truth?"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {played.map((e) => {
                      const p = progress[e.id];
                      return (
                        <tr key={e.id}>
                          <th scope="row" style={{ ...td, fontWeight: 600 }}>{e.n} · {e.title}<div style={{ fontWeight: 400, color: T.body2, fontSize: 13.5 }}>{e.concept}</div></th>
                          <td style={td}>{WINNERS.find((w) => w.id === p.predictedWinner)?.label || "—"}<div style={{ color: T.body2, fontSize: 13.5 }}>{p.predictedBand}</div></td>
                          <td style={td}>{CALLS.find((c) => c.id === p.call)?.label || "—"}<div style={{ color: T.body2, fontSize: 13.5 }}>{p.actualN?.toLocaleString("en-GB")} per arm{p.stoppedEarly ? " (stopped early)" : ""} · {pp(p.obsDiff ?? 0)}</div></td>
                          <td style={{ ...td, color: tone(p.soundCall), fontWeight: 700 }}><span aria-hidden="true">{mark(p.soundCall)} </span>{yes(p.soundCall)}</td>
                          <td style={{ ...td, color: tone(p.matchedTruth), fontWeight: 700 }}><span aria-hidden="true">{mark(p.matchedTruth)} </span>{yes(p.matchedTruth)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="How your judgement held up">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                <li>Predicted winner right in <b>{hits("predictionCorrect")} of {played.length}</b>; effect size right in <b>{hits("bandCorrect")} of {played.length}</b>.</li>
                <li>Sound calls — the right reading of the evidence you had — in <b>{hits("soundCall")} of {played.length}</b>.</li>
                <li>Calls that named the true winner: <b>{claims.filter((e) => progress[e.id].matchedTruth).length} of the {claims.length}</b> that named one{played.length - claims.length ? ` (${played.length - claims.length} said “need more data”)` : ""}.</li>
                {soundMissed.length > 0 && <li>Sound but wrong about the truth: {soundMissed.map((e) => e.title).join("; ")}. Good method on an unlucky or underpowered run — that is what α and power describe.</li>}
                {lucky.length > 0 && <li>Right about the truth, but not on the evidence: {lucky.map((e) => e.title).join("; ")}. Luck, not method — it won't repeat.</li>}
              </ul>
              <p style={{ margin: "8px 0 0", color: T.body2 }}>Judge your method by the sound calls: the truth is hidden in real tests, and a good process sometimes loses to chance.</p>
            </Section>

            <Section title="Your recommendations">
              {recs.length === 0 ? <p style={{ margin: 0, color: T.body2 }}>None written yet — each experiment's verdict asks for one.</p> : recs.map((e) => {
                const r = progress[e.id].recommendation;
                return (
                  <div key={e.id} style={{ marginBottom: 14, breakInside: "avoid" }}>
                    <h3 style={subHead}>{e.n} · {e.title}</h3>
                    <p style={{ margin: "0 0 4px", whiteSpace: "pre-wrap" }}>{r.text}</p>
                    <p style={{ margin: 0, fontSize: 13.5, color: T.body2 }}>Self-check: {r.checks} of {REC_CHECKS.length} points ticked.</p>
                  </div>
                );
              })}
            </Section>
          </>
        )}

        {(progress.quiz || progress.wireframe) && (
          <Section title="Also in the lab">
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              {progress.quiz && <li><b>Which Test Won?</b> First round: {progress.quiz.points} of {progress.quiz.max} points.</li>}
              {progress.wireframe && <li><b>Wireframe Studio</b> ({BRIEFS.find((b) => b.id === progress.wireframe.brief)?.name}): effect size {progress.wireframe.bandCorrect ? "right" : "off"}, primary metric {progress.wireframe.metricCorrect ? "right" : "off"}, sample size {progress.wireframe.powerOk == null ? "— no real effect to find" : progress.wireframe.powerOk ? "adequate" : "under-powered"}.</li>}
            </ul>
          </Section>
        )}

        {doneIds.length > 0 && (
          <>
            <Section title="Skills record">
              {skillLines(cov, progress, played, recs).map((s) => (
                <div key={s.id} style={{ marginBottom: 12, breakInside: "avoid" }}>
                  <h3 style={{ ...subHead, color: T.text }}>{s.name} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: T.body2 }}>({s.kind.toLowerCase()})</span></h3>
                  <ul style={{ margin: 0, paddingLeft: 22, fontSize: 14.5 }}>
                    {s.lines.map(([who, what]) => <li key={who}><b>{who}</b> — {what}</li>)}
                  </ul>
                </div>
              ))}
            </Section>
            <Section title="For your CV or an interview">
              <ul style={{ margin: 0, paddingLeft: 22 }}>{doneIds.map((id) => <li key={id} style={{ marginBottom: 6 }}>{OUTCOMES[id].cv}</li>)}</ul>
            </Section>
            <Section title="Learning outcomes">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                {cov.los.map((lo) => (
                  <li key={lo.code} style={{ marginBottom: 6 }}>
                    <b>{lo.code}</b> — {LEARNING_OUTCOMES[lo.code].text}{" "}
                    <span style={{ color: T.body2 }}>{[lo.in.length ? `You worked on it in: ${lo.in.map((a) => label(a.id)).join("; ")}.` : null, lo.partlyIn.length ? `Partly, in: ${lo.partlyIn.map((a) => label(a.id)).join("; ")}.` : null].filter(Boolean).join(" ") || (lo.code === "LO4" ? "Assessed through the group Website Build, not this lab." : "Not covered by this lab.")}</span>
                  </li>
                ))}
              </ul>
              <p style={{ margin: "8px 0 0", fontSize: 14 }}><ModuleLink /></p>
            </Section>
            <Section title="Using this in your assessment">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                <li style={{ marginBottom: 6 }}><b>Business Report (70%)</b> — when your report recommends a change to a site, say how you would test it: the metric, a guardrail, the sample size it needs, and what result would change your mind. Judge the change by profit and by segment, not just by the headline rate.</li>
                <li><b>Website Build presentation (30%, LO4)</b> — use the Wireframe Studio's lesson: design for your audience and device mix, keep the page light, and present a design as a hypothesis with the test that would prove it.</li>
              </ul>
            </Section>
          </>
        )}

        <Section title="How you rate yourself">
          {skills.before || skills.after ? (
            <>
              <RatingsTable before={skills.before} after={skills.after} />
              <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2 }}>{skills.before ? `Rated before your first experiment${skills.beforeAt ? ` (${skills.beforeAt})` : ""}` : "You skipped the rating before your first experiment"}{skills.after ? `, and again on ${skills.afterAt}` : ""}. Compare it with the skills record above: confidence should follow the evidence.</p>
            </>
          ) : <p style={{ margin: 0, color: T.body2 }}>You haven't rated yourself yet.</p>}
          {rating ? (
            <SkillsRating style={{ marginTop: 14 }} title={skills.after ? "Rate yourself again" : "Rate yourself now"} initial={skills.after || skills.before} saveLabel="Save" onSkip={() => setRating(false)}
              intro="The same six statements. Answer for how you feel now, not how you think you should."
              onSave={(r) => { setSkills(saveSkills({ after: r, afterAt: new Date().toISOString().slice(0, 10) })); setRating(false); onProgress?.(); }} />
          ) : (
            <button type="button" className="cl-noprint" onClick={() => setRating(true)} style={{ ...btn("transparent"), border: `1.5px solid ${T.border}`, color: T.text, padding: "10px 18px", fontSize: 15.5, marginTop: 12 }}>{skills.before || skills.after ? "Rate yourself again" : "Rate yourself now"}</button>
          )}
        </Section>

        <section className="cl-noprint" style={{ marginTop: 24 }}>
          <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, margin: "0 0 8px" }}>Share your results with your tutor</h2>
          <ResultCode code={code} />
        </section>
      </article>
    </div>
  );
}

/* The skills record. Each skill lists where it was practised and what that
   looked like there. Two are practised by doing rather than by playing: a
   recommendation counts as communication only if one was written, and the
   predictions made before any data are summed up in one line with their score. */
function skillLines(cov, progress, played, recs) {
  const nums = (es) => es.map((e) => e.n).join(", ");
  const label = (id) => ACTIVITIES.find((a) => a.id === id).label;
  return cov.skills.map((s) => {
    let lines;
    if (s.id === "communication") {
      lines = recs.map((e) => [label(e.id), `your recommendation to ${TEAM[e.id]}, checked against ${progress[e.id].recommendation.checks} of ${REC_CHECKS.length} points.`]);
    } else if (s.id === "selfassessment") {
      const right = (k) => played.filter((e) => progress[e.id][k]).length;
      lines = played.length ? [[`Experiment${played.length > 1 ? "s" : ""} ${nums(played)}`, `you predicted the winner and the size of the effect before any data — winner right in ${right("predictionCorrect")} of ${played.length}, size in ${right("bandCorrect")} of ${played.length}.`]] : [];
      if (progress.quiz) lines.push(["Which Test Won?", "you wagered points on how sure you were before each reveal."]);
    } else {
      lines = s.in.map((a) => [label(a.id), OUTCOMES[a.id].skills[s.id] || SKILLS[s.id].how]);
    }
    return { ...s, lines };
  }).filter((s) => s.lines.length);
}

function ResultCode({ code }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  async function copy(e) {
    const input = e.currentTarget.previousSibling;
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { input.focus(); input.select(); }
  }
  return (
    <>
      <p style={{ margin: "0 0 8px", fontSize: 14.5, color: T.body2 }}>Your tutor may ask for this code. It holds your scores, which judgements were right, whether you wrote recommendations and your self-ratings — no name and none of your writing.</p>
      <label htmlFor={id} style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Your result code</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input id={id} readOnly value={code} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.panel2, font: `13.5px ${T.mono}`, color: T.text }} />
        <button type="button" onClick={copy} style={{ background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5 }}>Copy</button>
      </div>
      <p role="status" style={{ fontSize: 13.5, color: T.pos, margin: "6px 0 0", minHeight: 18 }}>{copied ? "Copied." : ""}</p>
    </>
  );
}
