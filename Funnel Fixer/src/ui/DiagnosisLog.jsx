import React, { useId, useMemo, useState } from "react";
import { stageLabel, fixLabel, gbp } from "../engine/engine.js";
import { T, btn } from "./theme.js";
import { PrintBar, Section, articleStyle, subHead, useDocumentTitle, useStudentName } from "./report.jsx";
import { LEARNING_OUTCOMES, OUTCOMES, SKILLS, skillsOf } from "../engine/outcomes.js";
import { ModuleLink, Gloss } from "./Outcomes.jsx";
import { usePlain } from "./shared.jsx";
import SkillsRating, { RatingsTable } from "./SkillsRating.jsx";
import { REC_CHECKS, REC_READER } from "./Recommendation.jsx";
import { loadSkills, saveSkills } from "./progress.js";
import { resultCode } from "./cohort.js";

const mark = (v) => (v ? "✓" : "✗");
const tone = (v) => (v ? T.pos : T.neg);
const longDate = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const NOT_HERE = { LO1: "Not covered by this game.", LO2: "Not covered by this game.", LO4: "Assessed through the group Website Build, not this game." };
const NOT_HERE_PLAIN = { LO1: "This game does not cover it.", LO2: "This game does not cover it.", LO4: "This is marked in the group Website Build, not in this game." };

/* The diagnosis log: what this browser has done in Funnel Fixer, as one
   document to save as a PDF — the first finished run (the honest record),
   how the student's calls held up, what that run showed, their
   recommendation, a skills record and a CV line, the learning outcomes,
   how to use it in the assessment, their self-rating, and the result code
   for their tutor. In Simpler English (`say(rich, plain)`) the guidance
   around the record is reworded; the record itself — the tables, the
   figures, what the run showed — is the same. */
export default function DiagnosisLog({ progress, onBack }) {
  const [name, setName] = useStudentName();
  useDocumentTitle("Funnel Fixer – Diagnosis log", name);
  const [skills, setSkills] = useState(loadSkills);
  const [rating, setRating] = useState(false);
  const nameId = useId();
  const plain = usePlain();
  const say = (rich, simple) => (plain ? simple : rich);
  const f = progress.first;
  const rows = f?.rows || [];
  const rec = progress.recommendation?.text?.trim() ? progress.recommendation : null;
  const code = useMemo(() => resultCode(progress, skills), [progress, skills]);
  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const td = { padding: "7px 8px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const gapTraps = rows.filter((r) => !r.leakCorrect && r.predLeak === r.gapStage && r.gapStage !== r.actualLeak).length;
  const vs = f && f.untouched != null ? f.profit - f.untouched : null;

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <article className="ff-report" aria-labelledby="ff-log-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase" }}>
            <span style={{ color: T.playerText }}>Funnel Fixer · Diagnosis log</span>
            <span style={{ color: T.body2 }}>WM956-15 · LO3</span>
          </div>
          <h1 id="ff-log-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 31px)", lineHeight: 1.15, margin: "10px 0 6px" }}>Your diagnosis log</h1>
          <div style={{ fontSize: 14, color: T.body2 }}>{[longDate(), f ? `first run: ${f.quarters} quarters, seed ${f.seed}` : null, progress.runs > 1 ? `${progress.runs} runs in all` : null].filter(Boolean).join(" · ")}</div>
          <div className="ff-noprint" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label htmlFor={nameId} style={{ fontSize: 14.5, fontWeight: 600 }}>{say("Your name (optional, for the PDF)", "Your name (you can leave this empty; it is printed on the PDF)")}</label>
            <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 8, font: `15px ${T.body}`, minWidth: 200 }} />
          </div>
          {name.trim() && <p className="ff-print-only" style={{ margin: "8px 0 0", fontSize: 14 }}>{name.trim()}</p>}
        </header>

        {!f ? (
          <Section title="Nothing here yet"><p style={{ margin: 0 }}>{say("Finish a run and this log fills in: your calls each quarter, what you bought, and what the run developed.", "This log is empty until you finish a run. Then it shows your guesses for each quarter, what you bought, and the skills you used.")}</p></Section>
        ) : (
          <>
            {rows.length > 0 && (
              <Section title="Quarter by quarter (your first run)">
                <div role="region" aria-label="Quarter by quarter (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, minWidth: 640 }}>
                    <thead><tr>{["Quarter", "Biggest money leak: your call", "Best return: your call", "You bought", "Profit after spend"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.quarter}>
                          <th scope="row" style={{ ...td, fontWeight: 600 }}>Q{r.quarter}</th>
                          <td style={td}><span style={{ color: tone(r.leakCorrect), fontWeight: 700 }}><span aria-hidden="true">{mark(r.leakCorrect)} </span>{stageLabel(r.predLeak)}</span>{!r.leakCorrect && <div style={{ color: T.body2, fontSize: 13.5 }}>It was: {stageLabel(r.actualLeak)}</div>}<span className="sr-only">{r.leakCorrect ? " (right)" : " (wrong)"}</span></td>
                          <td style={td}><span style={{ color: tone(r.roiCorrect), fontWeight: 700 }}><span aria-hidden="true">{mark(r.roiCorrect)} </span>{fixLabel(r.predBest)}</span>{!r.roiCorrect && <div style={{ color: T.body2, fontSize: 13.5 }}>It was: {(r.bestBets || []).map(fixLabel).join(" or ")}</div>}<span className="sr-only">{r.roiCorrect ? " (right)" : " (wrong)"}</span></td>
                          <td style={td}>{r.allocations?.length ? r.allocations.join("; ") : "Nothing"}<div style={{ color: T.body2, fontSize: 13.5 }}>{gbp(r.spend)} spent{r.notPaidBack > 0 ? ` · ${gbp(r.notPaidBack)} of it not earned back by the end of the plan` : ""}</div></td>
                          <td style={{ ...td, fontFamily: T.mono, whiteSpace: "nowrap" }}>{gbp(r.grossProfit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            <Section title="How your judgement held up">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                <li>Biggest money leak called correctly in <b>{f.leakHits} of {f.quarters}</b> quarters; best-returning purchase in <b>{f.betHits} of {f.quarters}</b>. {say("Both calls were made before the figures were shown.", "You made both guesses before you saw the numbers.")}</li>
                {gapTraps > 0 && <li>{say(`In ${gapTraps} of the quarters you missed, you named the stage furthest below its benchmark in percentage points. The biggest gap was not the biggest loss in pounds.`, `In ${gapTraps} of the quarters you got wrong, you chose the step with the biggest percentage-point gap to its benchmark. The biggest gap was not the biggest loss in pounds.`)}</li>}
                <li>Profit after spend: <b>{gbp(f.profit)}</b>{vs != null && <> — {gbp(Math.abs(vs))} {vs >= 0 ? "more" : "less"} than the {gbp(f.untouched)} an untouched funnel would have made over the same quarters</>}.</li>
                {progress.runs > 1 && progress.best && <li>Best of your {progress.runs} runs: {gbp(progress.best.profit)}.</li>}
              </ul>
              <p style={{ margin: "8px 0 0", color: T.body2 }}>{say("This is your first run — the one made before you had seen how the funnel responds. Later runs don't replace it.", "This is your first run. You played it before you knew how the funnel reacts. If you play again, this record stays the same.")}</p>
            </Section>

            {f.cards?.length > 0 && (
              <Section title="What your first run showed">
                {f.cards.map((c) => (
                  <div key={c.title} style={{ marginBottom: 12, breakInside: "avoid" }}>
                    <h3 style={{ ...subHead, color: T.text }}>{c.title}</h3>
                    <p style={{ margin: 0 }}>{c.body}</p>
                  </div>
                ))}
              </Section>
            )}

            <Section title={`Your recommendation to ${REC_READER}`}>
              {rec ? (
                <>
                  <p style={{ margin: "0 0 4px", whiteSpace: "pre-wrap" }}>{rec.text}</p>
                  <p style={{ margin: 0, fontSize: 13.5, color: T.body2 }}>{say(`Self-check: ${rec.checks} of ${REC_CHECKS.length} points ticked.`, `You ticked ${rec.checks} of ${REC_CHECKS.length} checks.`)}</p>
                </>
              ) : <p style={{ margin: 0, color: T.body2 }}>{say("Not written yet — the debrief at the end of a run asks for one.", "You have not written one yet. You can write it on the results screen at the end of a run.")}</p>}
            </Section>

            <Section title="Skills record">
              {skillsOf().filter((s) => s.id !== "communication" || rec).map((s) => (
                <div key={s.id} style={{ marginBottom: 12, breakInside: "avoid" }}>
                  <h3 style={{ ...subHead, color: T.text }}>{s.name} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: T.body2 }}>({s.kind.toLowerCase()})</span></h3>
                  <p style={{ margin: 0, fontSize: 14.5 }}>
                    {s.id === "communication" ? say(`Your recommendation to ${REC_READER}, checked against ${rec.checks} of ${REC_CHECKS.length} points.`, `You wrote a recommendation to ${REC_READER}. You ticked ${rec.checks} of ${REC_CHECKS.length} checks.`)
                      : s.id === "selfassessment" ? say(`You called the biggest money leak and the best-returning purchase before the figures were shown, every quarter — the leak right in ${f.leakHits} of ${f.quarters}, the purchase in ${f.betHits} of ${f.quarters}.`, `Every quarter you guessed the biggest loss of money and the best purchase before you saw the numbers. Your guess about the loss was right in ${f.leakHits} of ${f.quarters} quarters. Your guess about the purchase was right in ${f.betHits} of ${f.quarters}.`)
                      : say(SKILLS[s.id].how, SKILLS[s.id].plain)}
                  </p>
                </div>
              ))}
            </Section>
            <Section title="For your CV or an interview">
              <p style={{ margin: 0 }}>{OUTCOMES.cv}</p>
            </Section>
            <Section title="Learning outcomes">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                {Object.keys(LEARNING_OUTCOMES).map((code) => (
                  <li key={code} style={{ marginBottom: 6 }}>
                    <b>{code}</b> — {LEARNING_OUTCOMES[code].text}{" "}
                    <span style={{ color: T.body2 }}>{OUTCOMES.los.includes(code) ? say("You worked on it here: judging which improvements to a store are worth their cost.", "You worked on this here. You decided which improvements to a store are worth the money.") : say(NOT_HERE[code], NOT_HERE_PLAIN[code])}</span>
                    {plain && <Gloss>{LEARNING_OUTCOMES[code].plain}</Gloss>}
                  </li>
                ))}
              </ul>
              <p style={{ margin: "8px 0 0", fontSize: 14 }}><ModuleLink /></p>
            </Section>
            <Section title="Using this in your assessment">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                <li style={{ marginBottom: 6 }}><b>Business Report (70%)</b> — {say("when your report recommends improvements to a site, size each one in pounds, say what it should return and over what period, and set any spend on traffic against acquisition cost and lifetime value. Say what you would not fund, and why.", "when your report recommends improvements to a site, give the value of each one in pounds. Say what it should bring back, and by when. If you recommend paying for visitors, compare the cost to win a customer with what that customer is worth over time. Say what you would not pay for, and why.")}</li>
                <li><b>Website Build presentation (30%, LO4)</b> — {say("justify what your team built first by where a store like yours loses the most money, not by what was easiest to add.", "explain why your team built some things first. Give the reason that a store like yours loses the most money there, not that those things were easy to add.")}</li>
              </ul>
            </Section>
          </>
        )}

        <Section title="How you rate yourself">
          {skills.before || skills.after ? (
            <>
              <RatingsTable before={skills.before} after={skills.after} />
              <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2 }}>{skills.before ? say(`Rated before your first game${skills.beforeAt ? ` (${skills.beforeAt})` : ""}`, `You rated yourself before your first game${skills.beforeAt ? ` (${skills.beforeAt})` : ""}`) : say("You skipped the rating before your first game", "You did not rate yourself before your first game")}{skills.after ? `, and again on ${skills.afterAt}` : ""}. {say("Compare it with the skills record above: confidence should follow the evidence.", "Compare these ratings with the skills record above. How sure you feel should match what you did.")}</p>
            </>
          ) : <p style={{ margin: 0, color: T.body2 }}>{say("You haven't rated yourself yet.", "You have not rated yourself yet.")}</p>}
          {rating ? (
            <SkillsRating style={{ marginTop: 14 }} title={skills.after ? "Rate yourself again" : "Rate yourself now"} initial={skills.after || skills.before} saveLabel="Save" onSkip={() => setRating(false)}
              intro={say("The same six statements. Answer for how you feel now, not how you think you should.", "These are the same six questions. Say how you feel now. There is no right answer.")}
              onSave={(r) => { setSkills(saveSkills({ after: r, afterAt: new Date().toISOString().slice(0, 10) })); setRating(false); }} />
          ) : (
            <button type="button" className="ff-noprint" onClick={() => setRating(true)} style={{ ...btn("transparent"), border: `1.5px solid ${T.border}`, color: T.text, padding: "10px 18px", fontSize: 15.5, marginTop: 12 }}>{skills.before || skills.after ? "Rate yourself again" : "Rate yourself now"}</button>
          )}
        </Section>

        {f && (
          <section className="ff-noprint" style={{ marginTop: 24 }}>
            <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, margin: "0 0 8px" }}>Share your results with your tutor</h2>
            <ResultCode code={code} />
          </section>
        )}
      </article>
    </div>
  );
}

function ResultCode({ code }) {
  const id = useId();
  const plain = usePlain();
  const [copied, setCopied] = useState(false);
  async function copy(e) {
    const input = e.currentTarget.previousSibling;
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { input.focus(); input.select(); }
  }
  return (
    <>
      <p style={{ margin: "0 0 8px", fontSize: 14.5, color: T.body2 }}>{plain
        ? "Your tutor may ask you for this code. It shows which guesses were right in your first run, your profit compared with a funnel that nobody changed, whether you wrote a recommendation, and your ratings. It does not include your name or your writing."
        : "Your tutor may ask for this code. It holds which calls were right in your first run, your profit against an untouched funnel, whether you wrote a recommendation and your self-ratings — no name and none of your writing."}</p>
      <label htmlFor={id} style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Your result code</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input id={id} readOnly value={code} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.panel2, font: `13.5px ${T.mono}`, color: T.text }} />
        <button type="button" onClick={copy} style={{ background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5 }}>Copy</button>
      </div>
      <p role="status" style={{ fontSize: 13.5, color: T.pos, margin: "6px 0 0", minHeight: 18 }}>{copied ? "Copied." : ""}</p>
    </>
  );
}
