import React, { useMemo } from "react";
import { EXPERIMENTS, QUIZ, QDIR, QMAG, effExperiment, lessonContext, runTest, statAt, powerAt, pct, pp, fmtN } from "../engine/engine.js";
import { BRIEFS } from "../engine/wireframe.js";
import { SEQUENCES, TUTOR_NOTES } from "../engine/tutorNotes.js";
import { T } from "./theme.js";
import { PrintBar, Section, articleStyle, subHead, useDocumentTitle } from "./report.jsx";
import { ACTIVITIES, OUTCOMES, MODULE, losLabel, skillNamesOf, suiteCoverage } from "./outcomesModel.js";

/* Instructor only (see App): the tutor's guide — how to run the lab with a
   cohort, which activities to set, how to debrief, how it develops the
   skills the module names, and, activity by activity, the design, what the
   current seed shows, and questions for the debrief. Built from the
   experiments themselves (and the authored notes in tutorNotes.js), so it
   stays right when an experiment or a setting changes. Printable. */
const labelOf = (id) => ACTIVITIES.find((a) => a.id === id).label;
const minutesOf = (ids) => ids.reduce((a, id) => a + TUTOR_NOTES[id].minutes, 0);
const duration = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);
const METRIC_FOR = { flash: "conversion rate — a low-value impulse sale with uniform order values", b2b: "revenue per visitor — high, varied order values", returning: "revenue per visitor — cross-sells and reorders change what an order is worth" };

export default function TutorGuide({ cfg, onBack }) {
  useDocumentTitle("Conversion Lab – Tutor's guide");
  const link = typeof location === "undefined" ? "" : location.origin + location.pathname;
  const { los, skills } = suiteCoverage();
  const designs = useMemo(() => EXPERIMENTS.map((base) => {
    const exp = effExperiment(base, cfg);
    const n = Math.min(base.suggestN, cfg.maxVisitors);
    const result = runTest(exp, { nPerArm: n, alpha: cfg.alpha, seed: `${cfg.seed}:${exp.id}` });
    const l = base.lesson(lessonContext(exp, cfg, { s: statAt(result, n), result, n, plannedN: n, stoppedEarly: false }));
    return { base, exp, n, power: powerAt(exp.truth.pA, exp.truth.pB, n, cfg.alpha), lesson: l };
  }), [cfg]);
  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const td = { padding: "6px 8px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const li = { marginBottom: 6 };
  const mono = { fontFamily: T.mono, fontSize: 13.5, overflowWrap: "anywhere" };
  const allIds = ACTIVITIES.map((a) => a.id);

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <article className="cl-report" aria-labelledby="cl-guide-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Conversion Lab · Tutor's guide · not for students</div>
          <h1 id="cl-guide-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>Running Conversion Lab with a cohort</h1>
          <p style={{ margin: 0, color: T.body2, fontSize: 14 }}>{MODULE.code} {MODULE.name} · {EXPERIMENTS.length} experiments, a quiz and a design studio · about {duration(minutesOf(allIds))} in all. Figures below are for the current settings: seed <b style={{ fontFamily: T.mono }}>{cfg.seed}</b>, α = {cfg.alpha}, power {Math.round(cfg.power * 100)}%{cfg.effectMult !== 1 ? `, effects ×${cfg.effectMult}` : ""}.</p>
        </header>

        <Section title="At a glance">
          <div role="region" aria-label="At a glance (table)" tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, fontSize: 14.5 }}>
              <thead><tr>{["Activity", "Teaches", "Time", "Learning outcomes"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {allIds.map((id) => (
                  <tr key={id}>
                    <th scope="row" style={{ ...td, fontWeight: 600 }}>{labelOf(id)}</th>
                    <td style={td}>{EXPERIMENTS.find((e) => e.id === id)?.concept || (id === "quiz" ? "Predicting direction, size and mechanism" : "Design as a hypothesis")}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{TUTOR_NOTES[id].minutes} min</td>
                    <td style={td}>{losLabel(OUTCOMES[id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Running a session">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}>Send students the plain link: <span style={mono}>{link}</span>. Everyone on the same seed sees identical runs, so the debrief is about decisions, not luck.</li>
            <li style={li}><b>The default seed</b> was chosen to be typical: every experiment's run lands within about one standard error of the truth and shows the story its lesson tells. A different seed (Instructor → Run seed) gives a fresh set of runs; the lessons rewrite themselves to match.</li>
            <li style={li}><b>Teaching presets</b> (Instructor): “pure noise” sets every effect to zero — every winner is then a false positive, and the lessons say so; “underpowered” shrinks the effects; “peeking enabled” adds a stop button to the run, so students can stop at the first p &lt; α and see it scored as unsound. Settings apply to the next run.</li>
            <li style={li}><b>Instructor tools</b> appear only once the game has been opened with <span style={mono}>?instructor</span>; the browser remembers it, and <span style={mono}>?instructor=off</span> forgets it. Never send students a link with it.</li>
            <li style={li}><b>Nothing leaves the student's browser.</b> Progress, recommendations and self-ratings stay there until a student shares a result code.</li>
          </ul>
        </Section>

        <Section title="Suggested sequences">
          {SEQUENCES.map((s) => (
            <div key={s.title} style={{ marginBottom: 14, breakInside: "avoid" }}>
              <h3 style={subHead}>{s.title} · about {duration(minutesOf(s.ids))}</h3>
              <p style={{ margin: "0 0 4px" }}>{s.ids.map(labelOf).join(" → ")}</p>
              <p style={{ margin: 0, color: T.body2 }}>{s.why}</p>
            </div>
          ))}
          <p style={{ margin: 0, color: T.body2, fontSize: 14 }}>Times are for working an activity and reading its verdict; allow ten minutes each for the debrief.</p>
        </Section>

        <Section title="Debriefing">
          <ol style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}><b>Two judgements, not one.</b> Each call is scored as <i>sound</i> (the right reading of the evidence) and as <i>matching the truth</i>. Start where they part: a sound call that missed the truth (method beaten by chance) and a lucky call that matched it.</li>
            <li style={li}><b>Collect result codes.</b> Students copy theirs from the experiment log (“Share your results with your tutor”); paste the batch into the cohort tally (Instructor → Cohort tally). Codes hold scores, judgements, whether recommendations were written, the quiz and wireframe results and the self-ratings — no names, none of the writing.</li>
            <li style={li}><b>Use the writing.</b> Every verdict asks for a short recommendation to the team that asked for the test, with a four-point self-check. Have pairs swap and critique: does it say how sure we can be, and what to do next?</li>
            <li style={li}><b>Ask the debrief questions</b> below; the experiment log is a good thing to bring to the seminar.</li>
          </ol>
        </Section>

        <Section title="Skills development">
          <p style={{ margin: "0 0 8px" }}>The module's PTES score for skills development was 87.9%, below the department's. Students rate the skills they recognise developing, so the lab names them, in the module's own terms: each experiment's bench says what it develops, each verdict says what practising each skill looked like, and the experiment log collects a skills record, CV lines and a self-rating taken before the first experiment and again later.</p>
          <div role="region" aria-label="Skills by activity (table)" tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480, fontSize: 14.5 }}>
              <thead><tr>{["Skill", "Kind", "Practised in"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {skills.map((s) => <tr key={s.id}><th scope="row" style={{ ...td, fontWeight: 400 }}>{s.name}</th><td style={td}>{s.kind}</td><td style={td}>{s.in.length ? s.in.map((a) => a.short).join(", ") : "—"}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "8px 0 0" }}><b>Learning outcomes:</b> {los.map((lo) => `${lo.code} — ${[lo.in.length ? lo.in.map((a) => a.short).join(", ") : null, lo.partlyIn.length ? `partly ${lo.partlyIn.map((a) => a.short).join(", ")}` : null].filter(Boolean).join("; ") || (lo.code === "LO4" ? "assessed through the group Website Build" : "not claimed")}`).join(" · ")} (numbers are experiments). Full wording: <a href={MODULE.url} target="_blank" rel="noopener" style={{ color: T.text }}>{MODULE.code} in the Warwick module catalogue<span className="sr-only"> (opens in a new tab)</span></a>.</p>
        </Section>

        <Section title="Accessibility">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}><b>Simpler English</b> — the switch in the WMG bar rewrites key text in plain English.</li>
            <li style={li}><b>Keyboard and screen reader</b> — every control works from the keyboard, charts have text descriptions, and a running test announces only when its verdict changes and when it ends. Checked with axe and at 320 pixels wide; a VoiceOver script is in the repository (SCREEN-READER-TEST.md). Under reduced motion the run appears complete at once.</li>
            <li style={li}>The experiment log saves as a tagged PDF through the browser's Save as PDF.</li>
          </ul>
        </Section>

        {designs.map(({ base, exp, n, power, lesson }) => {
          const notes = TUTOR_NOTES[base.id];
          return (
            <Section key={base.id} title={`Experiment ${base.n} · ${base.title}`}>
              <p style={{ margin: "0 0 6px", color: T.body2, fontSize: 14 }}>{base.concept} · about {notes.minutes} minutes · {losLabel(OUTCOMES[base.id])} · {OUTCOMES[base.id].syllabus.join("; ")}</p>
              <p style={{ margin: "0 0 6px" }}><b>The design:</b> {exp.segments ? exp.segments.map((sg) => `${sg.name} (${Math.round(sg.share * 100)}% of traffic) ${pct(sg.pA)} → ${pct(sg.pB)}`).join("; ") + `; overall ${pp(exp.truth.pB - exp.truth.pA)}` : `${pct(exp.truth.pA)} → ${pct(exp.truth.pB)} (${pp(exp.truth.pB - exp.truth.pA)})`}. Suggested {fmtN(n)} per arm{Math.abs(exp.truth.pB - exp.truth.pA) > 0.002 ? ` — about ${Math.round(power * 100)}% power` : ""}.</p>
              <p style={{ margin: "0 0 6px" }}><b>The lesson:</b> {lesson.general}</p>
              <p style={{ margin: "0 0 6px", color: T.body2 }}><b style={{ color: T.text }}>On seed {cfg.seed} at the suggested size:</b> {lesson.run.replace(/\b([Yy])our run\b/g, (m, y) => (y === "Y" ? "The run" : "the run"))}</p>
              <p style={{ margin: "0 0 10px", color: T.body2 }}><b style={{ color: T.text }}>Skills:</b> {skillNamesOf(OUTCOMES[base.id]).join(" · ")}.</p>
              <Notes notes={notes} />
            </Section>
          );
        })}

        <Section title="Which Test Won? · the answers">
          <p style={{ margin: "0 0 8px", color: T.body2 }}>Realistic scenarios, not reports of particular tests; sizes are relative lifts. About {TUTOR_NOTES.quiz.minutes} minutes · {losLabel(OUTCOMES.quiz)}.</p>
          <div role="region" aria-label="Quiz answers (table)" tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620, fontSize: 14 }}>
              <thead><tr>{["Scenario", "Answer", "Size", "Mechanism"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {QUIZ.map((q) => (
                  <tr key={q.id}>
                    <th scope="row" style={{ ...td, fontWeight: 600 }}>{q.title}</th>
                    <td style={td}>{QDIR.find((d) => d.id === q.answer).label}{q.answer === "a" || q.answer === "b" ? ` (${q.answer === "a" ? q.a : q.b})` : ""}</td>
                    <td style={td}>{QMAG.find((m) => m.id === q.mag).label}</td>
                    <td style={td}>{q.mech.options[q.mech.correct]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notes notes={TUTOR_NOTES.quiz} />
        </Section>

        <Section title="Wireframe Studio">
          <p style={{ margin: "0 0 6px", color: T.body2 }}>About {TUTOR_NOTES.wireframe.minutes} minutes · {losLabel(OUTCOMES.wireframe)}. There is no universal best page: the model rewards fitting the brief and keeping the page light. The current page converts at the brief's base rate, so submitting it unchanged is a 0pp design.</p>
          <ul style={{ margin: "0 0 10px", paddingLeft: 22 }}>
            {BRIEFS.map((b) => <li key={b.id} style={li}><b>{b.name}</b> ({Math.round(b.mobileShare * 100)}% mobile, current page {pct(b.base)}): the right primary metric is {METRIC_FOR[b.id]}. {b.urgencyFit > 0 ? "One urgency cue helps; two read as a scam." : b.urgencyFit < 0 ? "Fake urgency hurts professional buyers; the description is decisive." : "Cross-sell helps warm buyers; stacked trust signals add little."}</li>)}
          </ul>
          <Notes notes={TUTOR_NOTES.wireframe} />
        </Section>
      </article>
    </div>
  );
}

function Notes({ notes }) {
  return (
    <>
      <h3 style={subHead}>Debrief questions</h3>
      <ol style={{ margin: "0 0 10px", paddingLeft: 22 }}>{notes.prompts.map((p) => <li key={p} style={{ marginBottom: 6 }}>{p}</li>)}</ol>
      <h3 style={subHead}>Common wrong turns</h3>
      <ul style={{ margin: "0 0 10px", paddingLeft: 22 }}>{notes.misconceptions.map((m) => <li key={m} style={{ marginBottom: 6 }}>{m}</li>)}</ul>
      <h3 style={subHead}>Stretch</h3>
      <p style={{ margin: 0 }}>{notes.extension}</p>
    </>
  );
}
