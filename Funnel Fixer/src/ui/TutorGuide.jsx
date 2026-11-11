import React, { useMemo } from "react";
import { INTERVENTIONS, initialState, leaks, bottleneckOf, biggestGapOf, previewSingles, bestBets, fixLabel, gbp, pct } from "../engine/engine.js";
import { MINUTES, SESSIONS, PROMPTS, MISCONCEPTIONS, EXTENSIONS, PRESET_NOTES } from "../engine/tutorNotes.js";
import { MODULE, LEARNING_OUTCOMES, OUTCOMES, skillsOf } from "../engine/outcomes.js";
import { T } from "./theme.js";
import { PrintBar, Section, articleStyle, subHead, useDocumentTitle, useFocusOnMount } from "./report.jsx";
import { SKILL_STATEMENTS } from "./cohort.js";
import { REC_CHECKS, REC_READER } from "./Recommendation.jsx";

/* Instructor only (see App): the tutor's guide — how to run Funnel Fixer
   with a cohort, what the current settings' opening funnel shows, how to
   debrief, and how the game develops the skills the module names. The
   figures are computed from the current settings, so the guide stays right
   when a seed, a preset or a slider changes. Printable. */
const points = (g) => `${+(g * 100).toFixed(1)} points`;
const times = (n) => (n < 0 ? "−" : "") + Math.abs(n).toFixed(2) + "×";

export default function TutorGuide({ cfg, onBack }) {
  const headRef = useFocusOnMount();
  useDocumentTitle("Funnel Fixer – Tutor's guide");
  const base = typeof location === "undefined" ? "" : location.origin + location.pathname;
  const opening = useMemo(() => {
    const state = initialState(cfg);
    const l = leaks(state.rates, cfg.sessions, cfg, state.marginCut);
    const singles = previewSingles(state, cfg);
    return { l, bott: bottleneckOf(l), gap: biggestGapOf(l), singles, bets: bestBets(singles) };
  }, [cfg]);
  const { l, bott, gap, singles, bets } = opening;
  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const td = { padding: "6px 8px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const li = { marginBottom: 6 };
  const mono = { fontFamily: T.mono, fontSize: 13.5, overflowWrap: "anywhere" };
  const flipped = singles.filter((s) => s.roi < 1 && s.planRoi >= 1);

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <article className="ff-report" aria-labelledby="ff-guide-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Funnel Fixer · Tutor's guide · not for students</div>
          <h1 id="ff-guide-title" ref={headRef} tabIndex={-1} style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>Running Funnel Fixer with a cohort</h1>
          <p style={{ margin: 0, color: T.body2, fontSize: 14 }}>{MODULE.code} {MODULE.name} · {OUTCOMES.los.join(" · ")} · one run takes about {MINUTES.play} minutes. Figures below are for the current settings: seed <b style={{ fontFamily: T.mono }}>{cfg.seed}</b>, {cfg.quarters} quarters, {gbp(cfg.budget)} a quarter.</p>
        </header>

        <Section title="At a glance">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}>Each quarter a student makes two calls <b>before the figures are shown</b> — the biggest money leak, and the purchase that will return most per £ by the end of the plan — then spends a budget that cannot buy everything. Both calls have a “none” answer.</li>
            <li style={li}>The lesson: size a leak in pounds, not percentage points; judge a purchase over the time it lasts; re-diagnose as the bottleneck moves.</li>
            <li style={li}>Student link (this seed, no instructor controls): <span style={mono}>{base}?seed={encodeURIComponent(cfg.seed)}</span></li>
            <li style={li}>This guide, the cohort tally and the settings open only from <span style={mono}>{base}?instructor</span>; <span style={mono}>?instructor=off</span> forgets it on this browser.</li>
            <li style={li}>A refresh resumes a run. The student's log and result code describe their <b>first finished run</b>; later runs don't replace it.</li>
          </ul>
        </Section>

        <Section title="What the opening funnel shows (current settings)">
          <div role="region" aria-label="Opening funnel (table)" tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520, fontSize: 14.5 }}>
              <thead><tr>{["Stage", "Rate", "Benchmark", "Gap", "Loss a quarter"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {l.map((s) => (
                  <tr key={s.stage}>
                    <th scope="row" style={{ ...td, fontWeight: 600 }}>{s.label}{bott?.stage === s.stage && <span style={{ color: T.pos }}> · biggest money leak</span>}{gap?.stage === s.stage && <span style={{ color: T.amber }}> · biggest gap</span>}</th>
                    <td style={td}>{pct(s.rate, 0)}</td><td style={td}>{pct(s.bench, 0)}</td><td style={td}>{points(s.gap)}</td><td style={{ ...td, fontFamily: T.mono }}>{gbp(s.leak)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "8px 0 0" }}>
            {!bott ? "No stage is below its benchmark, so the right first call is “none”."
              : gap && gap.stage !== bott.stage ? `The trap is set: ${gap.label} is furthest below its benchmark (${points(gap.gap)}), but ${bott.label} loses the most money (${gbp(bott.leak)} a quarter against ${gbp(gap.leak)}).`
              : `On these settings the biggest gap and the biggest money leak are the same stage (${bott.label}). Sizing in pounds confirms the obvious answer here — say so in the debrief.`}
          </p>
          <div role="region" aria-label="First-quarter purchases (table)" tabIndex={0} style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520, fontSize: 14.5 }}>
              <thead><tr>{["Purchase in quarter 1", "Cost", "Return in the quarter", "Return over the plan"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {singles.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" style={{ ...td, fontWeight: 600 }}>{s.name}{bets.includes(s.id) && <span style={{ color: T.pos }}> · counts as the best bet</span>}<div style={{ fontWeight: 400, color: T.body2, fontSize: 13.5 }}>{s.type === "acq" ? "bought traffic — paid for again each quarter" : "one-off fix — stays"}</div></th>
                    <td style={td}>{gbp(s.cost)}</td><td style={{ ...td, fontFamily: T.mono }}>{times(s.roi)}</td><td style={{ ...td, fontFamily: T.mono, fontWeight: 700, color: s.planRoi >= 1 ? T.pos : T.neg }}>{times(s.planRoi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "8px 0 0" }}>
            {bets[0] === "none" ? "No purchase earns back its cost over the plan on these settings, so the right first call is “none pays back”." : `The best first-quarter call is ${bets.map(fixLabel).join(" or ")} (any purchase within 5% of the top counts).`}
            {flipped.length > 0 && ` ${flipped.map((s) => s.name).join(", ")} ${flipped.length === 1 ? "returns less than its cost in the quarter and more than its cost" : "each return less than their cost in the quarter and more than their cost"} over the plan — the clearest case for judging over the time left.`}
          </p>
          <p style={{ margin: "8px 0 0", color: T.body2, fontSize: 14 }}>Later quarters depend on what each student bought, so they are not listed. Every student on this seed sees these figures in quarter 1; of the {INTERVENTIONS.length} purchases, the one-off fixes can each be bought once.</p>
        </Section>

        <Section title="Ways to run it">
          {SESSIONS.map((s) => (
            <div key={s.title} style={{ marginBottom: 12, breakInside: "avoid" }}>
              <h3 style={{ ...subHead, color: T.text }}>{s.title}</h3>
              <ol style={{ margin: 0, paddingLeft: 22 }}>{s.steps.map((x) => <li key={x} style={li}>{x}</li>)}</ol>
            </div>
          ))}
        </Section>

        <Section title="Debrief questions">
          <ol style={{ margin: 0, paddingLeft: 22 }}>{PROMPTS.map((x) => <li key={x} style={li}>{x}</li>)}</ol>
          <p style={{ margin: "8px 0 0", color: T.body2, fontSize: 14 }}>Each student's end screen has a debrief written from their own run (“What your run showed”), so the questions can start from what they saw.</p>
        </Section>
        <Section title="Wrong turns to listen for">
          <ul style={{ margin: 0, paddingLeft: 22 }}>{MISCONCEPTIONS.map((x) => <li key={x} style={li}>{x}</li>)}</ul>
        </Section>
        <Section title="Stretch questions">
          <ul style={{ margin: 0, paddingLeft: 22 }}>{EXTENSIONS.map((x) => <li key={x} style={li}>{x}</li>)}</ul>
        </Section>
        <Section title="The presets">
          <ul style={{ margin: 0, paddingLeft: 22 }}>{PRESET_NOTES.map(([name, why]) => <li key={name} style={li}><b>{name}</b> — {why}</li>)}</ul>
          <p style={{ margin: "8px 0 0", color: T.body2, fontSize: 14 }}>Starting rates, the seed and the number of quarters apply to a new game; budget and unit economics apply from the next quarter resolved. Settings are not carried by the student link — only the seed is — so set a preset on the machine students play on, or describe it and let the default funnel stand.</p>
        </Section>

        <Section title="Learning outcomes and skills">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            {Object.keys(LEARNING_OUTCOMES).map((code) => (
              <li key={code} style={li}><b>{code}</b> — {LEARNING_OUTCOMES[code].text} <span style={{ color: T.body2 }}>{OUTCOMES.los.includes(code) ? "Served by this game." : code === "LO4" ? "Not claimed: assessed through the group Website Build." : "Not claimed by this game."}</span></li>
            ))}
          </ul>
          <h3 style={{ ...subHead, color: T.text, marginTop: 14 }}>Skills, as the specification names them</h3>
          <ul style={{ margin: 0, paddingLeft: 22 }}>{skillsOf().map((s) => <li key={s.id} style={li}><b>{s.name}</b> ({s.kind.toLowerCase()}) — {s.how}</li>)}</ul>
          <h3 style={{ ...subHead, color: T.text, marginTop: 14 }}>How the game makes them visible</h3>
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}>The intro states the learning outcome in the specification's words and names the skills.</li>
            <li style={li}>Before the first game students rate six statements, 1–5 (they can skip), and again from their log: {SKILL_STATEMENTS.map((s) => s.text.charAt(0).toLowerCase() + s.text.slice(1)).join("; ")}.</li>
            <li style={li}>The end screen asks for a recommendation to {REC_READER}, with four self-checks: {REC_CHECKS.map((c) => c.replace(/\.$/, "")).join("; ").toLowerCase()}.</li>
            <li style={li}>The diagnosis log (“Open your diagnosis log” on the intro and the end screen) prints as a PDF: the first run quarter by quarter, the recommendation, a skills record, a CV line, the learning outcomes, how to use it in the assessment, the ratings, and a result code.</li>
            <li style={li}>Communication is recorded only if a recommendation was written; self-assessment is reported with its score.</li>
          </ul>
        </Section>

        <Section title="The cohort tally">
          <p style={{ margin: 0 }}>Students copy the result code from the foot of their log. Paste the batch into the tally (instructor panel): quarter by quarter, how often each call was right; profit against an untouched funnel; recommendations written; ratings before and after. A code holds no name and none of the student's writing, and nothing leaves your browser.</p>
        </Section>

        <Section title="Accessibility">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}>Everything works from the keyboard; choices are labelled groups of toggle buttons; focus moves to each new screen's heading.</li>
            <li style={li}>The funnel picture and both charts have text alternatives with the same figures; right and wrong are said in words, not colour alone.</li>
            <li style={li}>“Simpler English” in the bar at the top of the page rewrites the instructions; glossary terms open a plain definition.</li>
            <li style={li}>Screens stack on a phone and at 400% zoom; reduced-motion settings are respected. A full screen-reader test has not been run.</li>
          </ul>
        </Section>
      </article>
    </div>
  );
}
