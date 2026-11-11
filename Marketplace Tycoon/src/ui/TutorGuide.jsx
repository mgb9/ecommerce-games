import React, { useMemo } from "react";
import { SCENARIOS, PLATFORMS, PMAP, FULFILMENT, COMPETITORS, EVENT_CALENDAR, DEFAULT_CFG, CRO_LEVERS, CRO_TEST_FRACTION, initialStores, getPlatform, gbp, gbp2 } from "../engine/engine.js";
import { evaluatePlatforms, CRITERIA } from "../engine/platformfit.js";
import { SESSIONS, TUTOR_NOTES } from "../engine/tutorNotes.js";
import { T } from "./theme.js";
import { cohortLink, linkableSeed } from "./urlConfig.js";
import { PrintBar, Section, articleStyle, useFocusOnMount, subHead, useDocumentTitle } from "./report.jsx";
import { ACTIVITIES, OUTCOMES, MODULE, labelOf, losLabel, skillNamesOf, suiteCoverage } from "./outcomesModel.js";
import { REC_CHECKS, clientOf } from "./Recommendation.jsx";

/* Instructor only (see App): the tutor's guide — how to run the simulation
   with a cohort, which briefs to set, how to debrief, how it develops the
   skills the module names, what the platform-fit model recommends and how
   far the simulation's results agree with it, and, brief by brief, the
   client's economics and questions for the debrief. Built from the engine
   (and the authored notes in tutorNotes.js), so it stays right when a
   number or a setting changes. Printable. */
const minutesOf = (s) => (s.parallel ? Math.max(...s.ids.map((id) => TUTOR_NOTES[id].minutes)) : s.ids.reduce((a, id) => a + TUTOR_NOTES[id].minutes, 0));
const duration = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);
const pct0 = (v) => `${Math.round(v * 100)}%`;

export default function TutorGuide({ cfg, onBack }) {
  useDocumentTitle("Marketplace Tycoon – Tutor's guide");
  const headRef = useFocusOnMount();
  const link = cohortLink(cfg.seed);
  const { los, skills } = suiteCoverage();
  const fits = useMemo(() => Object.fromEntries(SCENARIOS.map((s) => [s.id, evaluatePlatforms(s)])), []);
  const rivals = useMemo(() => initialStores("", "shopify", "inhouse", 0, SCENARIOS[0], "guide").filter((s) => !s.isPlayer), []);
  const retuned = cfg.commissionRate !== DEFAULT_CFG.commissionRate || cfg.txnAddon !== DEFAULT_CFG.txnAddon || cfg.demandMult !== DEFAULT_CFG.demandMult || cfg.holdingMult !== DEFAULT_CFG.holdingMult
    || PLATFORMS.some((p) => cfg.platforms[p.id].fixedCost !== DEFAULT_CFG.platforms[p.id].fixedCost) || ["price", "review", "ad"].some((k) => cfg.weights[k] !== DEFAULT_CFG.weights[k]);
  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const td = { padding: "6px 8px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const li = { marginBottom: 6 };
  const mono = { fontFamily: T.mono, fontSize: 13.5, overflowWrap: "anywhere" };
  const events = Object.entries(EVENT_CALENDAR);

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <article className="mt-report" aria-labelledby="mt-guide-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Marketplace Tycoon · Tutor's guide · not for students</div>
          <h1 id="mt-guide-title" ref={headRef} tabIndex={-1} style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>Running Marketplace Tycoon with a cohort</h1>
          <p style={{ margin: 0, color: T.body2, fontSize: 14 }}>{MODULE.code} {MODULE.name} · {SCENARIOS.length} client briefs, {PLATFORMS.length} platforms, {cfg.maxRounds} weeks a game. Figures below are for the current settings: seed <b style={{ fontFamily: T.mono }}>{cfg.seed}</b>, marketplace fee {pct0(cfg.commissionRate)}, starting cash {gbp(cfg.startingCash)}, seasonal events {cfg.eventsOn ? "on" : "off"}.</p>
        </header>

        <Section title="At a glance">
          <div role="region" aria-label="At a glance (table)" tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600, fontSize: 14.5 }}>
              <thead><tr>{["Client brief", "Teaches", "Top-fit platform", "Time", "Learning outcomes"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {SCENARIOS.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" style={{ ...td, fontWeight: 600 }}>{s.name}</th>
                    <td style={td}>{s.teach}</td>
                    <td style={td}>{PMAP[fits[s.id].recommended].name}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{TUTOR_NOTES[s.id].minutes} min</td>
                    <td style={td}>{losLabel(OUTCOMES[s.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "8px 0 0", color: T.body2, fontSize: 14 }}>A game is one brief: choose a platform and a fulfilment model, then {cfg.maxRounds} weeks of price, advertising, stock and conversion decisions against four computer-run rivals, with a prediction of the leaderboard place before each week resolves.</p>
        </Section>

        <Section title="Running a session">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}>{linkableSeed(cfg.seed) ? <>Send students this link: <span style={mono}>{link}</span>. It opens the game on the seed set here (<b style={mono}>{cfg.seed}</b>), without the instructor controls.</> : <>The seed set here (<b style={mono}>{cfg.seed}</b>) cannot go in a link: use only letters, digits, hyphens, underscores and full stops in the Instructor panel, then come back for the student link.</>} Everyone on the same seed faces the same market — the same demand, the same rival behaviour, the same true lift behind each conversion upgrade — so the debrief is about decisions, not luck.</li>
            <li style={li}><b>Only the seed travels in the link.</b> The other Instructor panel settings (fees, platform prices, ranking weights, events) live in your browser only. To change those for a cohort, change them on the screen you are projecting and have students play there, or keep the defaults. A student who is part-way through a game keeps the seed they started on.</li>
            <li style={li}><b>Teaching shocks</b> (Instructor panel): raise the marketplace's fee, put up a platform's weekly price mid-game, or shift what the ranking rewards. They apply from the next week resolved, and show platform pricing power and lock-in better than any slide.</li>
            <li style={li}><b>Instructor tools</b> appear only once the game has been opened with <span style={mono}>?instructor</span>; the browser remembers it, and <span style={mono}>?instructor=off</span> forgets it. Never send students a link with it.</li>
            <li style={li}><b>Nothing leaves the student's browser.</b> Progress, recommendations and self-ratings stay there until a student shares a result code.</li>
          </ul>
        </Section>

        <Section title="Suggested sessions">
          {SESSIONS.map((s) => (
            <div key={s.title} style={{ marginBottom: 14, breakInside: "avoid" }}>
              <h3 style={subHead}>{s.title} · about {duration(minutesOf(s))}{s.parallel ? " (groups side by side)" : ""}</h3>
              <p style={{ margin: "0 0 4px" }}>{s.ids.map(labelOf).join(s.parallel ? " · " : " → ")}</p>
              <p style={{ margin: 0, color: T.body2 }}>{s.why}</p>
            </div>
          ))}
          <p style={{ margin: 0, color: T.body2, fontSize: 14 }}>Times are for setting up and running the ten weeks and reading the debrief; allow fifteen minutes on top for the recommendation and the discussion.</p>
        </Section>

        <Section title="Debriefing">
          <ol style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}><b>Start with the platform argument, not the leaderboard.</b> The fit rating is a requirements argument; the profit is the result of every week's decisions. Ask who chose against the top fit and why, before showing who won.</li>
            <li style={li}><b>Collect result codes.</b> Students copy theirs from the decision log (“Share your results with your tutor”); paste the batch into the cohort tally (Instructor → Cohort tally). Codes hold the platform chosen, the final place, predictions right, whether the store ran out of cash, whether a recommendation was written and the self-ratings — no names, none of the writing.</li>
            <li style={li}><b>Use the writing.</b> The final results screen asks for a short recommendation to the client ({SCENARIOS.map((s) => clientOf(s.id)).join("; ")}), with a {REC_CHECKS.length}-point self-check. Have pairs swap and read as the client: would they act on it?</li>
            <li style={li}><b>Read the debrief cards together.</b> Each is written from that student's run — fit, conversion work, retention, returns and stock, cash, calibration — so two students' cards differ, and the difference is the discussion.</li>
            <li style={li}><b>Ask the debrief questions</b> below; the decision log is a good thing to bring to the seminar.</li>
          </ol>
        </Section>

        <Section title="Platform fit, and how far the results agree with it">
          <p style={{ margin: "0 0 8px" }}>The setup screen scores each platform against the brief on {CRITERIA.length} criteria ({CRITERIA.map((c) => c.label).join("; ")}), weighted by what the brief needs. The scores, highest first:</p>
          <div role="region" aria-label="Platform fit by brief (table)" tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, fontSize: 14.5 }}>
              <thead><tr>{["Client brief", "1st", "2nd", "3rd", "4th", "Weighs most"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {SCENARIOS.map((s) => {
                  const top = [...CRITERIA].sort((a, b) => fits[s.id].weights[b.key] - fits[s.id].weights[a.key])[0];
                  return (
                    <tr key={s.id}>
                      <th scope="row" style={{ ...td, fontWeight: 600 }}>{s.short}</th>
                      {fits[s.id].rows.map((r) => <td key={r.id} style={td}>{r.short} <span style={{ fontFamily: T.mono, color: T.body2 }}>{Math.round(r.fit * 100)}</span></td>)}
                      <td style={td}>{top.label} ({pct0(fits[s.id].weights[top.key])})</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul style={{ margin: "10px 0 0", paddingLeft: 22 }}>
            <li style={li}><b>What the simulation backs up.</b> At the default settings, a well-run store earns most on the top-fit platform on every brief — by a few per cent, never by a landslide. A test in the code checks this whenever a platform number changes.</li>
            <li style={li}><b>What it does not.</b> With weak decisions a cheaper platform can come out ahead. On the digital brief the composable platform leads only when advertising spend is high. A poor fulfilment choice (dropshipping fashion, say) shrinks the margin so far that the cheapest platform wins. Price, stock, advertising and conversion work move profit far more than the platform does — which is the honest position for a student's report too.</li>
            <li style={li}><b>How platforms differ in the model.</b> Weekly cost and transaction fee; conversion and advertising efficiency; a build period during which the store works below its finished level; for a self-hosted site, some sales lost each week to its own upkeep; and an organic-reach edge that is worth nothing where buyers don't search before buying and most where they do.</li>
            {retuned && <li style={{ ...li, color: T.amber }}><b>Your settings differ from the defaults</b> (fee, demand, platform prices or ranking weights), so the “top fit earns most” result may not hold in the market you have set.</li>}
          </ul>
        </Section>

        <Section title="The market students face">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}><b>Rivals:</b> {rivals.map((r) => `${r.name} (${PMAP[r.platformId].short}) — ${COMPETITORS.find((c) => c.id === r.id).blurb.replace(/\.$/, "")}`).join("; ")}.</li>
            <li style={li}><b>Seasonal events{cfg.eventsOn ? "" : " (currently off)"}:</b> {events.map(([wk, e]) => `week ${wk}, ${e.title.toLowerCase()}`).join("; ")}. Students see each one at the top of that week's decisions.</li>
            <li style={li}><b>Platforms (current weekly cost):</b> {PLATFORMS.map((p) => { const live = getPlatform(cfg, p.id); return `${p.short} ${gbp(live.fixedCost)}${live.txnFee ? ` + ${(live.txnFee * 100).toFixed(1).replace(/\.0$/, "")}% of sales` : ""}${p.rampWeeks > 1 ? `, ${p.rampWeeks} weeks to build` : ""}`; }).join("; ")}.</li>
            <li style={li}><b>Fulfilment:</b> {FULFILMENT.map((f) => `${f.short} — ${f.perUnitCost ? `${gbp2(f.perUnitCost)} a unit` : f.marginCut ? `${pct0(f.marginCut)} of sales` : "no unit cost"}${f.fixed ? ` + ${gbp(f.fixed)} a week` : ""}`).join("; ")}. The digital brief has no fulfilment choice.</li>
            <li style={li}><b>Conversion work:</b> {CRO_LEVERS.map((l) => l.name.toLowerCase()).join(", ")}, three tiers each. Each tier's true lift is fixed by the seed and hidden behind an estimate range; an A/B test ({pct0(CRO_TEST_FRACTION)} of the deploy price) reveals it. Whether students tested before deploying is in their decision log.</li>
            <li style={li}><b>Cash:</b> stock is paid for as it sells, so cash moves with profit; there is no supplier credit or up-front stock purchase. The cash debrief card says so and explains how real stores differ.</li>
          </ul>
        </Section>

        <Section title="Skills development">
          <p style={{ margin: "0 0 8px" }}>Students rate the skills they recognise developing, so the simulation names them, in the module's own terms: the brief screen says what each brief develops, the final results screen says what practising each skill looked like and asks for a written recommendation, and the decision log collects a skills record, CV lines and a self-rating taken before the first game and again later.</p>
          <div role="region" aria-label="Skills by brief (table)" tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480, fontSize: 14.5 }}>
              <thead><tr>{["Skill", "Kind", "Practised in"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {skills.map((s) => <tr key={s.id}><th scope="row" style={{ ...td, fontWeight: 400 }}>{s.name}</th><td style={td}>{s.kind}</td><td style={td}>{s.in.length === ACTIVITIES.length ? "every brief" : s.in.map((a) => a.short).join(", ") || "—"}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "8px 0 0" }}><b>Learning outcomes:</b> {los.map((lo) => `${lo.code} — ${lo.in.length ? (lo.in.length === ACTIVITIES.length ? "every brief" : lo.in.map((a) => a.short).join(", ")) : lo.code === "LO4" ? "assessed through the group Website Build" : "not claimed"}`).join(" · ")}. Full wording: <a href={MODULE.url} target="_blank" rel="noopener" style={{ color: T.text }}>{MODULE.code} in the Warwick module catalogue<span className="sr-only"> (opens in a new tab)</span></a>.</p>
        </Section>

        <Section title="Accessibility">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            <li style={li}><b>Simpler English</b> — the switch in the WMG bar rewrites key text in plain English.</li>
            <li style={li}><b>Keyboard and screen reader</b> — every control works from the keyboard, sliders say their values, charts have text descriptions with the final figures, and each week's result is announced once. The game screens were checked with an automated accessibility checker and at phone width; not yet tested with a screen reader.</li>
            <li style={li}>The decision log saves as a tagged PDF through the browser's Save as PDF.</li>
          </ul>
        </Section>

        {SCENARIOS.map((s) => {
          const notes = TUTOR_NOTES[s.id];
          const margin = (p) => p - s.unitCost;
          return (
            <Section key={s.id} title={s.name}>
              <p style={{ margin: "0 0 6px", color: T.body2, fontSize: 14 }}>About {notes.minutes} minutes · {losLabel(OUTCOMES[s.id])} · {OUTCOMES[s.id].syllabus.join("; ")}</p>
              <p style={{ margin: "0 0 6px" }}><b>The client:</b> {s.brief}</p>
              <p style={{ margin: "0 0 6px" }}><b>The economics:</b> price {gbp(s.priceMin)}–{gbp(s.priceMax)} on a unit cost of {gbp(s.unitCost)} before fulfilment (so {gbp(margin(s.priceMin))}–{gbp(margin(s.priceMax))} a unit before fees and returns); about {s.demandBase.toLocaleString("en-GB")} new buyers a week across the market; {pct0(s.returnRate)} of units returned; {pct0(s.mobileShare)} of traffic on mobile{s.digital ? "; no stock or delivery" : `; unsold stock costs ${gbp2(s.holdingPerUnit)} a unit a week`}.</p>
              <p style={{ margin: "0 0 6px" }}><b>Platform fit:</b> {fits[s.id].rows.map((r) => `${r.name} (${r.verdict.toLowerCase()})`).join(", ")}.</p>
              <p style={{ margin: "0 0 10px", color: T.body2 }}><b style={{ color: T.text }}>Skills:</b> {skillNamesOf(OUTCOMES[s.id]).join(" · ")}. <b style={{ color: T.text }}>Recommendation to:</b> {clientOf(s.id)}.</p>
              <Notes notes={notes} />
            </Section>
          );
        })}
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
