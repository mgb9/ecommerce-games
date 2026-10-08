import React, { useState } from "react";
import { T, PLAYER, btn, card, linkBtn } from "./theme.js";
import { pad2 } from "./format.js";
import { CaseFrame, Eyebrow, InstructorButton, LOS, PT, Tag, Term, TermsHint, useNarrow } from "./shared.jsx";
import { ALL_CASES, DIFFICULTY_COLOR, isPlayed, nextAttempt, ticketFor } from "./caseList.js";
import { CONFIDENCE, loadProgress, loadSkills, saveSkills } from "./progress.js";
import SkillsRating from "./SkillsRating.jsx";
import { SuiteOutcomes } from "./Outcomes.jsx";
import { losLabel } from "./outcomesModel.js";

/* The case inbox — the landing screen. Every case as a ticket in the CRO
   team's queue: its number, difficulty and the ticket this student would
   get, with their status — not played, in progress, or their FIRST
   attempt's score (the only one kept). The first unplayed case is marked
   "Next up". The case the student left (`current`) can be returned to as it
   was — mid-investigation, or at its results (`currentDone`). Once any case
   is finished, the case file is a click away. */
export default function Inbox({ autoFocus, cfg, attempts, current, currentDone = false, onOpen, onReturn, onCaseFile, onToggleInstructor }) {
  const [progress] = useState(loadProgress);
  const [skills, setSkills] = useState(loadSkills);
  const [rating, setRating] = useState(false);   // the skipped rating, reopened
  const narrow = useNarrow();
  const askRating = skills.before === undefined || rating;
  const played = ALL_CASES.filter((c) => isPlayed(progress, c.id));
  const perfect = played.filter((c) => progress[c.id].first === progress[c.id].outOf);
  const nextUp = ALL_CASES.find((c) => !isPlayed(progress, c.id));
  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Chrichton · case inbox" phase="inbox" actions={onToggleInstructor && <InstructorButton onClick={onToggleInstructor} />}>
      <div className="rise" style={{ maxWidth: 900, margin: "44px auto 0" }}>
        <Eyebrow title={LOS.LO3.full}>Root-cause diagnosis · LO3</Eyebrow>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px, 6.4vw, 46px)", lineHeight: 1.05, letterSpacing: -1.2, margin: "16px 0 0" }}>
          Case <span style={{ color: PLAYER }}>inbox</span>
        </h1>
        <p style={{ color: T.body2, fontSize: 18, lineHeight: 1.6, marginTop: 16 }}>
          <PT rich={<>{ALL_CASES.length} tickets have landed in Chrichton's <Term term="cro">CRO</Term> channel. In each one something looks wrong in the analytics: find where it really lives, what caused it and when it started — or show that nothing is broken. They get harder as you go; Cases 09 and 10 are real data from 2015, and 11 and 12 are Chrichton three years on, at enterprise scale. Work them in any order; only your first attempt at each case is scored. Below the list: the learning outcomes and skills the cases develop.</>}
              plain={<>There are {ALL_CASES.length} tickets. In each one, a number in the analytics has changed. Find which group of visitors it affects, what caused it and when it started — or show that nothing is broken. The cases get harder. Cases 09 and 10 use real data from 2015. Cases 11 and 12 are a much bigger Chrichton, three years later. You can do them in any order. Only your first try at each case gets a score.</>} />
        </p>
        <TermsHint />

        <div style={{ ...card(), marginTop: 20, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 15.5 }}>
            <b>{played.length}</b> of {ALL_CASES.length} cases played{played.length > 0 && <> · <b>{perfect.length}</b> fully right first time</>}
            <span style={{ color: T.muted, fontSize: 14 }}> · seed <span style={{ fontFamily: T.mono }}>{cfg.seed}</span></span>
          </p>
          {played.length > 0 && <button onClick={onCaseFile} style={{ ...btn("transparent"), border: `1.5px solid ${T.border}`, padding: "10px 18px", fontSize: 15.5 }}>Open your case file →</button>}
        </div>

        {askRating && (
          <SkillsRating style={{ marginTop: 18 }} title="Before you start: rate yourself" onSkip={() => { setSkills(saveSkills({ before: null, beforeAt: today() })); setRating(false); }}
            intro="Two minutes, once. After a few cases your case file will show these ratings next to what you actually did, and ask you to rate yourself again — so you can see what moved."
            onSave={(r) => { setSkills(saveSkills({ before: r, beforeAt: today() })); setRating(false); }} />
        )}
        {skills.before === null && !rating && <p style={{ margin: "14px 0 0", fontSize: 14, color: T.muted }}>You skipped the self-rating. <button onClick={() => setRating(true)} style={{ ...linkBtn, padding: 0, textDecoration: "underline", fontSize: 14 }}>Rate yourself now</button> — it takes two minutes and your case file compares it with what you do.</p>}
        <h2 className="sr-only">Cases</h2>
        <ol role="list" style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {ALL_CASES.map((c, i) => (
            <CaseRow key={c.id} c={c} narrow={narrow} done={progress[c.id]} isNext={nextUp?.id === c.id}
              resumable={current === i && !currentDone} results={current === i && currentDone}
              // the ticket being worked, or the one opening the case would give
              ticket={ticketFor(i, cfg, current === i && !currentDone ? attempts[i] || 1 : nextAttempt(i, attempts, progress))}
              onOpen={() => onOpen(i)} onReturn={onReturn} />
          ))}
        </ol>
        <SuiteOutcomes style={{ marginTop: 22 }} />
      </div>
    </CaseFrame>
  );
}

function CaseRow({ c, ticket, done, resumable, results, isNext, narrow, onOpen, onReturn }) {
  const played = done?.first !== undefined;
  const perfect = played && done.first === done.outOf;
  const said = played && CONFIDENCE.find((x) => x.id === done.confidence);
  const label = `case ${pad2(c.n)}`;
  const action = resumable ? { text: `Return to ${label}`, onClick: onReturn }
    : played ? { text: c.field ? `Work ${label} again` : `Replay ${label}`, onClick: onOpen }
    : { text: `Open ${label}`, onClick: onOpen };
  return (
    <li style={{ ...card(), padding: "16px 18px", borderLeft: `6px solid ${DIFFICULTY_COLOR[c.difficulty] || T.muted}`, display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) auto", gap: 14, alignItems: "center" }}>
      <div>
        <div style={{ display: "flex", gap: "4px 12px", flexWrap: "wrap", alignItems: "baseline", fontSize: 13.5, color: T.muted }}>
          <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.text }}>Case {pad2(c.n)}</span>
          <span>{c.difficulty}</span>
          <span>{losLabel(c.outcomes)}</span>
          <span style={{ fontFamily: T.mono }}>{ticket.channel} · {ticket.from}</span>
        </div>
        <h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18.5, lineHeight: 1.3, margin: "6px 0 6px" }}>{ticket.subject}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 14, color: T.muted }}>
          {resumable && <Tag tone="amber">In progress</Tag>}
          {!played && isNext && !resumable && <Tag tone="amber">Next up</Tag>}
          {played ? (
            <span>
              <span style={{ color: perfect ? T.pos : T.text, fontWeight: 700 }}>{perfect && <span aria-hidden="true">✓ </span>}First attempt {done.first}/{done.outOf}</span>
              {perfect && <span className="sr-only"> (fully right)</span>}
              {said && <> · you said “{said.label.toLowerCase()}”</>}
              {!c.field && !resumable && <> · replaying gives you a fresh variant</>}
            </span>
          ) : !resumable && <span>Not played yet</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: narrow ? "flex-start" : "flex-end", gap: 6 }}>
        <button onClick={action.onClick} style={{ ...btn(resumable || (isNext && !played) ? T.playerBtn : T.hdrBg), padding: "11px 18px", fontSize: 15, whiteSpace: "nowrap" }}>{action.text} →</button>
        {results && <button onClick={onReturn} style={{ ...linkBtn, fontSize: 14, padding: "2px 4px", textDecoration: "underline" }}>Back to your results for {label}</button>}
      </div>
    </li>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
