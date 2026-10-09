import React, { Suspense, lazy, useEffect, useState } from "react";
import { T, GLOBAL_CSS } from "./theme.js";
import { PlainModeProvider } from "./shared.jsx";
import GeneratedCase from "./generated/GeneratedCase.jsx";
import InstructorPanel from "./generated/InstructorPanel.jsx";
import Inbox from "./Inbox.jsx";
import CaseFile from "./CaseFile.jsx";

import { ALL_CASES, caseAt, isFieldAt, nextAttempt } from "./caseList.js";
import { loadProgress } from "./progress.js";
import { readUrlConfig } from "./urlConfig.js";
import { clearCaseSessions, readSession, writeSession } from "./session.js";

// The field cases (9, 10) share ~1,400 lines of real 2015 data: download it only when one is opened.
const FieldCase = lazy(() => import("./field/FieldCase.jsx"));
// Instructor-only screens (the answer sheet and the guide also need the field cases' questions): loaded on demand.
const AnswerSheet = lazy(() => import("./AnswerSheet.jsx"));
const InstructorTally = lazy(() => import("./InstructorTally.jsx"));
const TutorGuide = lazy(() => import("./TutorGuide.jsx"));
const Loading = ({ what }) => <div role="status" style={{ maxWidth: 1180, margin: "48px auto", padding: "0 20px", color: T.muted, fontSize: 16 }}>{what}</div>;

/* Root: which screen is on show — the case inbox, the case file, or one
   case — and with what instructor config. caseIndex indexes ALL_CASES
   (caseList.js): the generated cases and the two field-data cases, in case
   order. Each case component owns its whole session; bumping `run`
   remounts it, which is how every "open a case" / "try again" / "apply
   instructor settings" starts afresh. Going back to the inbox keeps the
   case where it was, so the student can return to it. `attempts` counts
   tries per case, so a retry gets a fresh variant; `nav` counts screen
   changes, so focus moves to each new screen's heading (not on first load).
   All of this is mirrored to the tab's session so a refresh resumes it. */
const VERSION = 3;   // saved records from before cases 10–12 (different case indexes) are ignored

export default function App() {
  const [app, setApp] = useState(initialAppState);
  const { view, caseIndex, cfg, run, attempts, nav } = app;
  const [showInstructor, setShowInstructor] = useState(false);
  const [instructor] = useState(instructorMode);
  useShellBarOffset();
  useEffect(() => { writeSession("app", { ...app, v: VERSION, search: currentSearch() }); }, [app]);

  function startCase(idx, newCfg = cfg, { retry = false } = {}) {
    clearCaseSessions();
    setApp((a) => {
      // new instructor settings are a new puzzle for everyone: attempts restart
      const attempt = newCfg !== a.cfg ? null : retry ? (a.attempts[idx] || 1) + 1 : nextAttempt(idx, a.attempts, loadProgress());
      return {
        ...a, view: "case", caseIndex: idx, cfg: newCfg, run: a.run + 1, nav: a.nav + 1,
        attempts: attempt === null ? {} : { ...a.attempts, [idx]: attempt },
      };
    });
  }
  const go = (v) => setApp((a) => ({ ...a, view: v, nav: a.nav + 1 }));
  // On the inbox, new settings apply to whichever case is opened next.
  const applyOnInbox = (c) => { clearCaseSessions(); setApp((a) => ({ ...a, cfg: c, attempts: {}, caseIndex: null })); };

  const autoFocus = nav > 0;
  const isField = caseIndex !== null && isFieldAt(caseIndex);
  const sessionKey = `r${run}:c${caseIndex}`;
  const toggleInstructor = instructor ? () => setShowInstructor((v) => !v) : undefined;
  const inCase = view === "case" && caseIndex !== null;

  return (
    <PlainModeProvider>
      <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
        <style>{GLOBAL_CSS}</style>
        {view === "inbox" && <Inbox autoFocus={autoFocus} cfg={cfg} attempts={attempts} current={caseIndex} currentDone={["reveal", "report"].includes(readSession(`${sessionKey}:phase`))}
          onOpen={(i) => startCase(i)} onReturn={() => go("case")} onCaseFile={() => go("casefile")} onToggleInstructor={toggleInstructor} />}
        {view === "casefile" && <CaseFile autoFocus={autoFocus} cfg={cfg} onBack={() => go("inbox")} />}
        {view === "answers" && instructor && <Suspense fallback={<Loading what="Preparing the answer sheet…" />}><AnswerSheet autoFocus={autoFocus} cfg={cfg} onBack={() => go(caseIndex === null ? "inbox" : "case")} /></Suspense>}
        {view === "tally" && instructor && <Suspense fallback={<Loading what="Opening the tally…" />}><InstructorTally autoFocus={autoFocus} onBack={() => go(caseIndex === null ? "inbox" : "case")} /></Suspense>}
        {view === "guide" && instructor && <Suspense fallback={<Loading what="Opening the tutor's guide…" />}><TutorGuide autoFocus={autoFocus} cfg={cfg} onBack={() => go(caseIndex === null ? "inbox" : "case")} /></Suspense>}
        {inCase && isField && (
          <Suspense fallback={<Loading what="Opening the 2015 archive…" />}>
            <FieldCase key={run} fieldId={caseAt(caseIndex).fieldId} sessionKey={sessionKey} autoFocus={autoFocus} onRestart={() => startCase(caseIndex)} onExit={() => go("inbox")} />
          </Suspense>
        )}
        {inCase && !isField && (
          <GeneratedCase key={run} sessionKey={sessionKey} autoFocus={autoFocus} caseIndex={caseAt(caseIndex).genIndex} cfg={cfg} attempt={attempts[caseIndex] || 1}
            onInbox={() => go("inbox")} onRetry={() => startCase(caseIndex, cfg, { retry: true })} onToggleInstructor={toggleInstructor} />
        )}
        {showInstructor && (
          <InstructorPanel cfg={cfg} caseN={inCase ? caseAt(caseIndex).n : null} onClose={() => setShowInstructor(false)}
            onOpenView={(v) => { setShowInstructor(false); go(v); }}
            onApply={(c) => { setShowInstructor(false); if (inCase) startCase(caseIndex, c); else applyOnInbox(c); }} />
        )}
      </div>
    </PlainModeProvider>
  );
}

const currentSearch = () => (typeof location === "undefined" ? "" : location.search);

// A refresh (same URL) resumes the saved session; arriving by a different
// link — e.g. a cohort link — starts from that link's settings instead: the
// inbox, or straight into the case it names.
function initialAppState() {
  const saved = readSession("app");
  if (saved?.v === VERSION && saved.search === currentSearch() && saved.cfg) {
    return { view: ["answers", "tally", "guide"].includes(saved.view) ? "inbox" : saved.view, caseIndex: saved.caseIndex, cfg: saved.cfg, run: saved.run, attempts: saved.attempts || {}, nav: saved.nav || 0 };
  }
  clearCaseSessions();
  const { caseIndex, cfg } = readUrlConfig();
  if (caseIndex === null) return { view: "inbox", caseIndex: null, cfg, run: 0, attempts: {}, nav: 0 };
  return { view: "case", caseIndex, cfg, run: 0, attempts: { [caseIndex]: nextAttempt(caseIndex, {}, loadProgress()) }, nav: 0 };
}

// The instructor panel (seed and noise level) is for staff. It appears only
// once the game has been opened with ?instructor in the link — remembered in
// this browser — so students can't quietly turn the noise down.
// ?instructor=off forgets it.
function instructorMode() {
  try {
    const q = new URLSearchParams(currentSearch()).get("instructor");
    if (q === "off") localStorage.removeItem("dd-instructor");
    else if (q !== null) localStorage.setItem("dd-instructor", "1");
    return localStorage.getItem("dd-instructor") === "1";
  } catch { return false; }
}

// The WMG shell's bar (in its open shadow root) is sticky. Publish its live
// height as --dd-shell-h so the game's own sticky report nav sits just
// below it rather than underneath. No shell (dev server, tests) → 0.
function useShellBarOffset() {
  useEffect(() => {
    const bar = document.querySelector("wmg-shell")?.shadowRoot?.querySelector(".bar");
    if (!bar || typeof ResizeObserver === "undefined") return;
    const publish = () => document.documentElement.style.setProperty("--dd-shell-h", `${bar.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
}
