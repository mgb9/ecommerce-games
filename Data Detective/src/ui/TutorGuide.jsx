import React, { useMemo } from "react";
import { CASES, generateCase, reviewTrail } from "../engine/engine.js";
import { FIELD_CASES } from "../engine/fieldcase.js";
import { SEQUENCES, TUTOR_NOTES } from "../engine/tutorNotes.js";
import { T } from "./theme.js";
import { pad2 } from "./format.js";
import { CaseFrame } from "./shared.jsx";
import { ALL_CASES } from "./caseList.js";
import { caseLink } from "./urlConfig.js";
import { MODULE, losLabel, skillNamesOf, suiteCoverage } from "./outcomesModel.js";
import { PrintBar, Section, subHead, useDocumentTitle } from "./report/ReportView.jsx";
import { answerText, whereItShows } from "./answerText.js";

/* Instructor only (see App): the tutor's guide — how to run the game with
   a cohort, which cases to set, how to debrief, how it develops the skills
   the module names, and, case by case, the answers in general terms with
   questions for the debrief. Built from the cases themselves (and the
   authored notes in tutorNotes.js), so it stays right when a case changes.
   Answers here leave out what the seed changes — days, sizes — which the
   answer sheet gives for a particular seed. Printable as a PDF. */
const byN = Object.fromEntries(ALL_CASES.map((c) => [c.n, c]));
const minutesOf = (ns) => ns.reduce((a, n) => a + TUTOR_NOTES[byN[n].id].minutes, 0);
const duration = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

export default function TutorGuide({ autoFocus, cfg, onBack }) {
  useDocumentTitle("Data Detective – Tutor's guide", "");
  const inboxLink = caseLink({ seed: cfg.seed, noise: cfg.noise });
  const total = minutesOf(ALL_CASES.map((c) => c.n));
  const { los, skills } = suiteCoverage();
  const nums = (cs) => cs.map((c) => pad2(c.n)).join(", ");
  // every generated case's variants, answered — seed-independent wording
  const variants = useMemo(() => Object.fromEntries(CASES.map((def) => [def.id, def.variants.map((v, i) => {
    const cd = generateCase(def.id, cfg.seed, { noise: cfg.noise, variant: i });
    return { v, answer: answerText(cd.truth, v.incident, { withStart: false }), where: whereItShows(cd.truth, reviewTrail(cd, [], [], [])), real: v.events.filter((e) => e.real).map((e) => e.label).join("; ") };
  })])), [cfg]);
  const cell = { padding: "6px 10px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const th = { ...cell, borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const li = { marginBottom: 6 };
  const mono = { fontFamily: T.mono, fontSize: 13, overflowWrap: "anywhere" };

  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Instructor · tutor's guide" phase="guide">
      <div className="rise" style={{ marginTop: 22 }}>
        <PrintBar onBack={onBack} backLabel="← back" />
        <article className="dd-report" aria-labelledby="dd-guide-title" style={{ background: "#FFFFFF", color: T.text, maxWidth: 900, margin: "0 auto", padding: "clamp(22px, 5vw, 46px) clamp(18px, 5vw, 50px)", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 15, lineHeight: 1.55 }}>
          <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Data Detective · Tutor's guide · not for students</div>
            <h1 id="dd-guide-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>Running Data Detective with a cohort</h1>
            <p style={{ margin: 0, color: T.muted, fontSize: 13.5 }}>{MODULE.code} {MODULE.name} · {ALL_CASES.length} cases · about {duration(total)} of play in all. Answers in this guide hold for every seed; the answer sheet gives one seed's days and numbers.</p>
          </header>

          <Section title="The cases at a glance">
            <div role="region" aria-label="The cases at a glance (table)" tabIndex={0} style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead><tr>{["Case", "Level", "Time", "Learning outcomes"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {ALL_CASES.map((c) => (
                    <tr key={c.id}>
                      <th scope="row" style={{ ...cell, fontWeight: 400 }}><b style={{ fontFamily: T.mono }}>{pad2(c.n)}</b> {c.title}</th>
                      <td style={cell}>{c.difficulty}</td>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>{TUTOR_NOTES[c.id].minutes} min</td>
                      <td style={cell}>{losLabel(c.outcomes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Running a session">
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              <li style={li}>Send students a link to the case inbox. With this browser's current settings (seed <b style={{ fontFamily: T.mono }}>{cfg.seed}</b>, noise {cfg.noise.toFixed(1)}×) it is <span style={mono}>{inboxLink}</span>. Add <span style={mono}>&amp;case=3</span> to open a case directly.</li>
              <li style={li}><b>The seed</b> fixes every dashboard and picks which variant of each case comes first, so a cohort on one seed can debrief one answer. Each simulated case has more than one variant; a student who replays a case moves on to the next, so they never replay an answer they have seen. Set a new seed for each cohort (Instructor → Seed) so last year's notes don't carry the answers. Cases 09 and 10 are real 2015 data and are the same for everyone.</li>
              <li style={li}><b>The noise level</b> sets how hard the signal is to see: 0.6× for a first walkthrough, 1.4× (the default) for seminars, 2.0× for a stretch. Every case's story is checked to hold at all three.</li>
              <li style={li}><b>Instructor tools</b> appear only once the game has been opened with <span style={mono}>?instructor</span> in the link; the browser remembers it, and <span style={mono}>?instructor=off</span> forgets it. Never send students a link with it.</li>
              <li style={li}><b>Nothing leaves the student's browser.</b> There are no accounts; progress, the case file and the self-ratings live in each student's browser until they share a result code.</li>
            </ul>
          </Section>

          <Section title="Suggested sequences">
            {SEQUENCES.map((s) => (
              <div key={s.title} style={{ marginBottom: 14, breakInside: "avoid" }}>
                <h3 style={subHead}>{s.title} · about {duration(minutesOf(s.cases))} of play</h3>
                <p style={{ margin: "0 0 4px" }}>{s.cases.map((n) => `${pad2(n)} ${byN[n].title}`).join(" → ")}</p>
                <p style={{ margin: 0, color: T.body2 }}>{s.why}</p>
              </div>
            ))}
            <p style={{ margin: 0, color: T.muted, fontSize: 14 }}>Times are for working a case and reading the reveal; allow ten minutes per case for debrief in a seminar.</p>
          </Section>

          <Section title="Debriefing a seminar">
            <ol style={{ margin: 0, paddingLeft: 22 }}>
              <li style={li}><b>Before:</b> open the answer sheet for the cohort's seed (Instructor → Answer sheet) and print it. It gives each case's first variant, the answer, where the signal shows, and that seed's numbers.</li>
              <li style={li}><b>During:</b> students say how sure they are before they submit. Ask for the evidence behind a call, not just the call: which report, which segment, what ruled the red herrings out.</li>
              <li style={li}><b>After:</b> students copy their result code from their case file (“Share your results with your tutor”) into a form or the chat. Paste the batch into the cohort tally (Instructor → Cohort tally). A code holds scores, stated confidence, which calls were right, the reply self-check and the skills self-ratings — no names.</li>
              <li style={li}><b>Read the tally:</b> “Call missed most” says where to start — the place, the cause or the start date. “Confidence against results” shows calibration: of the calls made at about 90% sure, about nine in ten should be fully right; fewer means the cohort is overconfident.</li>
              <li style={li}><b>Follow up in writing:</b> the case report asks each student to write the reply to the person who raised the ticket, and to check it against four points. It is a short, assessable piece of communication.</li>
            </ol>
          </Section>

          <Section title="Skills development">
            <p style={{ margin: "0 0 8px" }}>The module's PTES score for skills development was 87.9%, below the department's. Students rate the skills they recognise developing, so Data Detective names them, in the module's own terms, at every step:</p>
            <ul style={{ margin: "0 0 10px", paddingLeft: 22 }}>
              <li style={li}>Each case opens with the learning outcomes it serves (in the specification's words), its syllabus topic and the skills it practises.</li>
              <li style={li}>Each reveal says what practising each skill looked like in that case, and the case report records it with a line for a CV.</li>
              <li style={li}>The case file collects every case's skills record and CV lines, and a self-rating taken before the first case and again later; the tally shows the cohort's before and after.</li>
            </ul>
            <p style={{ margin: "0 0 10px" }}><b>In the room:</b> name the skill when you debrief (“that was critical thinking: you ruled out the event that lined up best”), and ask students to keep their case-file PDF as evidence for the Business Report and their careers portfolio.</p>
            <div role="region" aria-label="Skills by case (table)" tabIndex={0} style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                <thead><tr>{["Skill", "Kind", "Practised in cases"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {skills.map((s) => (
                    <tr key={s.id}><th scope="row" style={{ ...cell, fontWeight: 400 }}>{s.name}</th><td style={cell}>{s.kind}</td><td style={cell}>{s.cases.length === ALL_CASES.length ? "Every case" : nums(s.cases)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: "10px 0 0" }}><b>Learning outcomes:</b> {los.map((lo) => `${lo.code} — ${lo.cases.length === ALL_CASES.length ? "every case" : lo.partlyIn.length ? `partly, in cases ${nums(lo.partlyIn)}` : lo.code === "LO4" ? "assessed through the group Website Build, not this game" : "not claimed"}`).join("; ")}. Full wording: <a href={MODULE.url} target="_blank" rel="noopener" style={{ color: T.text }}>{MODULE.code} in the Warwick module catalogue<span className="sr-only"> (opens in a new tab)</span></a>.</p>
          </Section>

          <Section title="Accessibility">
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              <li style={li}><b>Simpler English</b> — the switch in the WMG bar rewrites explanations in plain English, for students working in a second language.</li>
              <li style={li}><b>Keyboard and screen reader</b> — every control works from the keyboard and every chart has a text description. Checked with automated tests (axe) and at 320 pixels wide; a step-by-step VoiceOver test script is in the repository (SCREEN-READER-TEST.md).</li>
              <li style={li}><b>Reports</b> save as tagged PDFs through the browser's own Save as PDF.</li>
              <li style={li}>The suite's <a href="../accessibility.html" style={{ color: T.text }}>accessibility statement</a> lists what is known not to work yet.</li>
            </ul>
          </Section>

          {ALL_CASES.map((c) => {
            const notes = TUTOR_NOTES[c.id];
            const q = c.kind === "field" ? FIELD_CASES.find((f) => f.id === c.id) : null;
            return (
              <Section key={c.id} title={`Case ${pad2(c.n)} · ${c.title}`}>
                <p style={{ margin: "0 0 6px", color: T.muted, fontSize: 14 }}>{c.difficulty} · about {notes.minutes} minutes · {losLabel(c.outcomes)} · {c.outcomes.syllabus.join("; ")}</p>
                <p style={{ margin: "0 0 6px" }}><b>The lesson:</b> {c.lesson}</p>
                <p style={{ margin: "0 0 10px", color: T.body2 }}><b style={{ color: T.text }}>Skills:</b> {skillNamesOf(c.outcomes).join(" · ")}.</p>
                <h3 style={subHead}>{q ? "The answer (real data — one version)" : "The answers (the seed picks which variant comes first)"}</h3>
                {q ? (
                  <ul style={{ margin: "0 0 10px", paddingLeft: 22 }}>
                    <li style={li}><b>Verdict:</b> {q.verdicts.find((o) => o.id === q.verdictTruth).label}</li>
                    <li style={li}><b>Smoking gun:</b> {q.guns.find((o) => o.id === q.gunTruth).label}</li>
                    <li style={li}><b>First action:</b> {q.remedies.find((o) => o.id === q.remedyTruth).label}</li>
                  </ul>
                ) : (
                  <ul style={{ margin: "0 0 10px", paddingLeft: 22 }}>
                    {variants[c.id].map(({ v, answer, where, real }, i) => (
                      <li key={i} style={li}><b>Variant {String.fromCharCode(65 + i)}</b> (“{v.ticket.subject}”): {answer}. <span style={{ color: T.body2 }}>Shows in {where}. Real event: {real || "none"}.</span></li>
                    ))}
                  </ul>
                )}
                <h3 style={subHead}>Debrief questions</h3>
                <ol style={{ margin: "0 0 10px", paddingLeft: 22 }}>{notes.prompts.map((p) => <li key={p} style={li}>{p}</li>)}</ol>
                <h3 style={subHead}>Common wrong turns</h3>
                <ul style={{ margin: "0 0 10px", paddingLeft: 22 }}>{notes.misconceptions.map((m) => <li key={m} style={li}>{m}</li>)}</ul>
                <h3 style={subHead}>Stretch</h3>
                <p style={{ margin: 0 }}>{notes.extension}</p>
              </Section>
            );
          })}
        </article>
      </div>
    </CaseFrame>
  );
}
