import React, { useId, useMemo, useState } from "react";
import { SCENARIOS, SCMAP, PMAP, FMAP, DIGITAL_FULFIL, gbp } from "../engine/engine.js";
import { T, btn } from "./theme.js";
import { PrintBar, Section, articleStyle, subHead, useDocumentTitle, useStudentName } from "./report.jsx";
import { OUTCOMES, LEARNING_OUTCOMES, suiteCoverage, labelOf, didOf } from "./outcomesModel.js";
import { usePlain } from "./shared.jsx";
import { ModuleLink } from "./Outcomes.jsx";
import SkillsRating, { RatingsTable } from "./SkillsRating.jsx";
import { REC_CHECKS, clientOf } from "./Recommendation.jsx";
import { loadSkills, saveSkills } from "./progress.js";
import { resultCode } from "./cohort.js";

const longDate = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const fulfilName = (p) => (SCMAP[p.brief].digital ? DIGITAL_FULFIL.name : FMAP[p.fulfilId]?.name || p.fulfilId);
const fitWords = (p) => (p.fitRank === 1 ? "top fit for this brief" : `rated ${p.fitRank} of ${p.fitTotal} for this brief`);
const result = (p) => (p.profit >= 0 ? `${gbp(p.profit)} profit` : `${gbp(-p.profit)} loss`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* The decision log: everything this browser has done in the simulation, as
   one document to save as a PDF — the first completed game on each brief
   (the honest record), how the student's judgement held up, their
   recommendations to the client, a skills record and CV lines, the
   learning outcomes, how to use it in the assessment, their self-rating,
   and the result code for their tutor. */
export default function DecisionLog({ progress, cfg, onBack, onProgress }) {
  const [name, setName] = useStudentName();
  useDocumentTitle("Marketplace Tycoon – Decision log", name);
  const [skills, setSkills] = useState(loadSkills);
  const [rating, setRating] = useState(false);
  const nameId = useId();
  const plain = usePlain();
  const played = SCENARIOS.filter((s) => progress[s.id]);
  const P = (s) => progress[s.id];
  const recs = played.filter((s) => P(s).recommendation?.text?.trim());
  const doneIds = played.map((s) => s.id);
  const seeds = [...new Set(played.map((s) => P(s).seed).filter(Boolean))];
  const code = useMemo(() => resultCode(progress, skills, seeds[0] || cfg.seed), [progress, skills, cfg.seed]); // eslint-disable-line react-hooks/exhaustive-deps -- seeds come from progress
  const cov = suiteCoverage(doneIds);
  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const td = { padding: "7px 8px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const small = { color: T.body2, fontSize: 13.5 };

  const topFit = played.filter((s) => P(s).fitRank === 1);
  const offFit = played.filter((s) => P(s).fitRank !== 1);
  const hits = played.reduce((a, s) => a + P(s).predHits, 0), weeks = played.reduce((a, s) => a + P(s).weeks, 0);
  const bias = weeks ? played.reduce((a, s) => a + P(s).bias * P(s).weeks, 0) / weeks : 0;
  const deployed = played.reduce((a, s) => a + P(s).croDeployed, 0), untested = played.reduce((a, s) => a + P(s).croUntested, 0);
  const broke = played.filter((s) => P(s).insolvent);

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <article className="mt-report" aria-labelledby="mt-log-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase" }}>
            <span style={{ color: T.playerText }}>Marketplace Tycoon · Decision log</span>
            <span style={{ color: T.body2 }}>WM956-15 · LO1 · LO3</span>
          </div>
          <h1 id="mt-log-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 31px)", lineHeight: 1.15, margin: "10px 0 6px" }}>Your decision log</h1>
          <div style={{ fontSize: 14, color: T.body2 }}>{[longDate(), `${played.length} of ${SCENARIOS.length} client briefs`, seeds.length ? `seed ${seeds.join(", ")}` : null].filter(Boolean).join(" · ")}</div>
          <div className="mt-noprint" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label htmlFor={nameId} style={{ fontSize: 14.5, fontWeight: 600 }}>Your name (optional, for the PDF)</label>
            <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${T.muted}`, borderRadius: 8, font: `15px ${T.body}`, minWidth: 200, maxWidth: "100%" }} />
          </div>
          {name.trim() && <p className="mt-print-only" style={{ margin: "8px 0 0", fontSize: 14 }}>{name.trim()}</p>}
        </header>

        {played.length === 0 ? (
          <Section title="Nothing here yet"><p style={{ margin: 0 }}>{plain ? "Run a store for its ten weeks. This log will then show your platform choice, the store's results, your predictions, and the skills the brief developed." : "Run a store for its ten weeks and this log fills in: your platform choice, how the store did, your predictions, and what the brief developed."}</p></Section>
        ) : (
          <>
            <Section title="Brief by brief (your first completed game on each)">
              <div role="region" aria-label="Brief by brief (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, minWidth: 640 }}>
                  <thead><tr>{["Client brief", "Platform and fulfilment", "Result", "Place predictions", "Conversion work"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {played.map((s) => {
                      const p = P(s);
                      return (
                        <tr key={s.id}>
                          <th scope="row" style={{ ...td, fontWeight: 600 }}>{s.name}<div style={{ ...small, fontWeight: 400 }}>{p.at}</div></th>
                          <td style={td}>{PMAP[p.platformId]?.name || p.platformId}<div style={small}>{fitWords(p)}</div><div style={small}>{fulfilName(p)}</div></td>
                          <td style={td}><span style={{ color: p.profit >= 0 ? T.pos : T.neg, fontWeight: 700 }}>{result(p)}</span><div style={small}>{p.rank} of {p.of} on the leaderboard</div><div style={{ ...small, color: p.insolvent ? T.neg : T.body2 }}>{p.insolvent ? `ran out of cash${p.shortWeek ? ` in week ${p.shortWeek}` : ""}` : "never short of cash"}</div></td>
                          <td style={td}>{p.predHits} of {p.weeks} right<div style={small}>{p.meanAbsError ? `${p.meanAbsError.toFixed(1)} places out on average` : "never out"}</div></td>
                          <td style={td}>{p.croDeployed ? `${plural(p.croDeployed, "tier", "tiers")} deployed` : "none deployed"}<div style={small}>{p.croDeployed ? `${p.croDeployed - p.croUntested} tested first` : `${plural(p.croTests, "test", "tests")} bought`}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="How your judgement held up">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                <li>You chose the platform the fit model rates top in <b>{topFit.length} of {played.length}</b> {played.length === 1 ? "brief" : "briefs"}.{offFit.length > 0 && <> Elsewhere: {offFit.map((s) => `${PMAP[P(s).platformId]?.short} for ${s.short} (${P(s).fitRank} of ${P(s).fitTotal}; ${PMAP[P(s).topFit]?.short} was top)`).join("; ")}. {plain ? "That can be a good choice. Say what you gained from it and what you gave up." : "That can be defended — say what you were trading for."}</>}</li>
                <li>Leaderboard place predicted right in <b>{hits} of {weeks}</b> weeks.{Math.abs(bias) >= 0.5 ? ` On average you expected to finish ${bias < 0 ? "higher" : "lower"} than you did.` : weeks ? (plain ? " Your predictions were not usually too high or too low." : " No steady lean towards optimism or pessimism.") : ""}</li>
                <li>{deployed ? <>Of <b>{plural(deployed, "conversion tier", "conversion tiers")}</b> deployed, <b>{deployed - untested}</b> {deployed - untested === 1 ? "was" : "were"} A/B tested first{untested ? (plain ? ` and ${untested} ${untested === 1 ? "was" : "were"} deployed without a test, using only the estimate` : ` and ${untested} went in on the estimate alone`) : ""}.</> : plain ? "You deployed no conversion upgrades, so you never had to choose between testing an upgrade and trusting its estimate." : "You deployed no conversion upgrades, so there was no test-or-trust decision to judge."}</li>
                <li>{broke.length ? <>You ran out of cash on: {broke.map((s) => s.short).join(", ")}. A real store would have stopped trading there.</> : "You never ran out of cash."}</li>
              </ul>
              <p style={{ margin: "8px 0 0", color: T.body2 }}>{plain ? "Judge your platform choice by the reasons you can give for it, not only by the profit. In this simulation the top-fit platform helps a well-run store by a few per cent. Pricing, stock, advertising and conversion work change the result much more." : "Judge the platform choice by the argument you can make for it, not only by the profit: in this simulation the top-fit platform helps a well-run store by a few per cent, and pricing, stock, advertising and conversion work move the result far more."}</p>
            </Section>

            <Section title="Your recommendations">
              {recs.length === 0 ? <p style={{ margin: 0, color: T.body2 }}>{plain ? "You have not written one yet. The final results screen of each game asks you to write one." : "None written yet — the final results screen of each game asks for one."}</p> : recs.map((s) => {
                const r = P(s).recommendation;
                return (
                  <div key={s.id} style={{ marginBottom: 14, breakInside: "avoid" }}>
                    <h3 style={subHead}>{s.name} · to {clientOf(s.id)}</h3>
                    <p style={{ margin: "0 0 4px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.text}</p>
                    <p style={{ margin: 0, fontSize: 13.5, color: T.body2 }}>Self-check: {r.checks} of {REC_CHECKS.length} points ticked.</p>
                  </div>
                );
              })}
            </Section>

            <Section title="Skills record">
              {skillLines(cov, progress, played, recs, plain).map((s) => (
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
                    <span style={{ color: T.body2 }}>{lo.in.length ? `You worked on it in: ${lo.in.map((a) => labelOf(a.id)).join("; ")}.` : lo.code === "LO4" ? (plain ? "This is assessed in the group Website Build, not in this simulation." : "Assessed through the group Website Build, not this simulation.") : (plain ? "This simulation does not cover it." : "Not covered by this simulation.")}</span>{plain && <span style={{ display: "block", color: T.body2 }}>In simpler words: {LEARNING_OUTCOMES[lo.code].plain}</span>}
                  </li>
                ))}
              </ul>
              <p style={{ margin: "8px 0 0", fontSize: 14 }}><ModuleLink /></p>
            </Section>
            <Section title="Using this in your assessment">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                {plain ? <>
                  <li style={{ marginBottom: 6 }}><b>Business Report (70%)</b> — when your report recommends a platform, start from what the client needs: running cost, the best performance the platform can reach, organic reach, time to launch, and stability. Say what the client gives up with your choice. Support it with unit economics: contribution per unit after returns and fees, and the volume needed to break even.</li>
                  <li><b>Website Build presentation (30%, LO4)</b> — explain your group's own platform choice in the same way, against your client's brief. Say which platform you would move to if the business grew.</li>
                </> : <>
                  <li style={{ marginBottom: 6 }}><b>Business Report (70%)</b> — when your report recommends a platform, argue from the client's requirements (running cost, performance ceiling, organic reach, time to launch, stability), name the trade-off you are accepting, and back it with unit economics: contribution per unit after returns and fees, and the volume needed to break even.</li>
                  <li><b>Website Build presentation (30%, LO4)</b> — justify your group's own platform choice against your client's brief in the same way, and say what you would move to if the business grew.</li>
                </>}
              </ul>
            </Section>
          </>
        )}

        <Section title="How you rate yourself">
          {skills.before || skills.after ? (
            <>
              <div role="region" aria-label="Your self-ratings (table)" tabIndex={0} style={{ overflowX: "auto" }}><RatingsTable before={skills.before} after={skills.after} /></div>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2 }}>{skills.before ? `Rated before your first game${skills.beforeAt ? ` (${skills.beforeAt})` : ""}` : "You skipped the rating before your first game"}{skills.after ? `, and again on ${skills.afterAt}` : ""}. {plain ? "Compare these ratings with the skills record above. Your confidence should match what you actually did." : "Compare it with the skills record above: confidence should follow the evidence."}</p>
            </>
          ) : <p style={{ margin: 0, color: T.body2 }}>{plain ? "You have not rated yourself yet." : "You haven't rated yourself yet."}</p>}
          {rating ? (
            <SkillsRating style={{ marginTop: 14 }} title={skills.after ? "Rate yourself again" : "Rate yourself now"} initial={skills.after || skills.before} saveLabel="Save" onSkip={() => setRating(false)}
              intro={plain ? "These are the same six statements. Answer for how you feel now, not how you think you should feel." : "The same six statements. Answer for how you feel now, not how you think you should."}
              onSave={(r) => { setSkills(saveSkills({ after: r, afterAt: new Date().toISOString().slice(0, 10) })); setRating(false); onProgress?.(); }} />
          ) : (
            <button type="button" className="mt-noprint" onClick={() => setRating(true)} style={{ ...btn("transparent"), border: `1.5px solid ${T.muted}`, color: T.text, padding: "10px 18px", fontSize: 15.5, marginTop: 12 }}>{skills.before || skills.after ? "Rate yourself again" : "Rate yourself now"}</button>
          )}
        </Section>

        <section className="mt-noprint" style={{ marginTop: 24 }}>
          <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, margin: "0 0 8px" }}>Share your results with your tutor</h2>
          <ResultCode code={code} />
        </section>
      </article>
    </div>
  );
}

/* The skills record. Each skill lists the briefs it was practised on and
   what that looked like there. Two are practised by doing rather than by
   playing: a recommendation counts as communication only if one was
   written, and the weekly place predictions are summed up with their score. */
function skillLines(cov, progress, played, recs, plain) {
  return cov.skills.map((s) => {
    let lines;
    if (s.id === "communication") {
      lines = recs.map((b) => [b.name, `your recommendation to ${clientOf(b.id)}, checked against ${progress[b.id].recommendation.checks} of ${REC_CHECKS.length} points.`]);
    } else if (s.id === "selfassessment") {
      lines = played.map((b) => [b.name, plain ? `each week you said which place you would finish before you saw the result. You were right in ${progress[b.id].predHits} of ${progress[b.id].weeks} weeks.` : `you predicted your leaderboard place before each week resolved — right in ${progress[b.id].predHits} of ${progress[b.id].weeks} weeks.`]);
    } else {
      lines = s.in.filter((a) => OUTCOMES[a.id].skills[s.id]).map((a) => [labelOf(a.id), didOf(OUTCOMES[a.id], s.id, plain)]);
    }
    return { ...s, lines };
  }).filter((s) => s.lines.length);
}

function ResultCode({ code }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  const plain = usePlain();
  async function copy(e) {
    const input = e.currentTarget.previousSibling;
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { input.focus(); input.select(); }
  }
  return (
    <>
      <p style={{ margin: "0 0 8px", fontSize: 14.5, color: T.body2 }}>{plain ? "Your tutor may ask you for this code. For each brief it records the platform you chose, your final place, how many predictions were right, if you ran out of cash, if you wrote a recommendation, and your self-ratings. It does not contain your name or anything you wrote." : "Your tutor may ask for this code. It holds, for each brief, the platform you chose, where you finished, how many predictions were right, whether you ran out of cash, whether you wrote a recommendation, and your self-ratings — no name and none of your writing."}</p>
      <label htmlFor={id} style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Your result code</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input id={id} readOnly value={code} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0, padding: "8px 10px", border: `1px solid ${T.muted}`, borderRadius: 8, background: T.panel2, font: `13.5px ${T.mono}`, color: T.text }} />
        <button type="button" onClick={copy} style={{ background: T.panel2, border: `1px solid ${T.muted}`, color: T.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5 }}>Copy</button>
      </div>
      <p role="status" style={{ fontSize: 13.5, color: T.pos, margin: "6px 0 0", minHeight: 18 }}>{copied ? "Copied." : ""}</p>
    </>
  );
}
