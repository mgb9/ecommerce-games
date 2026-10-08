import React, { Suspense, lazy, useEffect, useState } from "react";
import { CASES } from "../engine/engine.js";
import { T, GLOBAL_CSS } from "./theme.js";
import { PlainModeProvider } from "./shared.jsx";
import GeneratedCase from "./generated/GeneratedCase.jsx";
import InstructorPanel from "./generated/InstructorPanel.jsx";
import { readUrlConfig } from "./urlConfig.js";
import { clearCaseSessions, readSession, writeSession } from "./session.js";

// Case 8 carries ~1,400 lines of real 2015 data: download it only when opened.
const FieldCase = lazy(() => import("./field/FieldCase.jsx"));

/* Root: picks which case is on screen and with what instructor config.
   caseIndex 0..CASES.length-1 are the generated cases (1–7); CASES.length
   is the field-data case (8, real 2015 exports). Each case component owns
   its whole session; bumping `run` remounts it, which is how every
   "switch case" / "try again" / "apply instructor settings" starts afresh.
   `attempts` counts retries per case, so a retry gets a fresh variant.
   All of this is mirrored to the tab's session so a refresh resumes it. */
export default function App() {
  const [app, setApp] = useState(initialAppState);
  const { caseIndex, cfg, run, attempts } = app;
  const [showInstructor, setShowInstructor] = useState(false);
  const [instructor] = useState(instructorMode);
  useShellBarOffset();
  useEffect(() => { writeSession("app", { ...app, search: currentSearch() }); }, [app]);

  function startCase(idx, newCfg = cfg, { retry = false } = {}) {
    clearCaseSessions();
    setApp((a) => ({
      caseIndex: idx, cfg: newCfg, run: a.run + 1,
      // new instructor settings are a new puzzle for everyone: attempts restart
      attempts: newCfg !== a.cfg ? {} : retry ? { ...a.attempts, [idx]: (a.attempts[idx] || 1) + 1 } : a.attempts,
    }));
  }
  const isField = caseIndex >= CASES.length;
  const sessionKey = `r${run}:c${caseIndex}`;
  // After a switch, restart or refresh (not on first load), move focus to the screen.
  const autoFocus = run > 0;

  return (
    <PlainModeProvider>
      <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
        <style>{GLOBAL_CSS}</style>
        {isField ? (
          <Suspense fallback={<div role="status" style={{ maxWidth: 1180, margin: "48px auto", padding: "0 20px", color: T.muted, fontSize: 16 }}>Opening the 2015 archive…</div>}>
            <FieldCase key={run} sessionKey={sessionKey} autoFocus={autoFocus} onRestart={() => startCase(caseIndex)} onExit={() => startCase(0)} />
          </Suspense>
        ) : (
          <>
            <GeneratedCase key={run} sessionKey={sessionKey} autoFocus={autoFocus} caseIndex={caseIndex} cfg={cfg} attempt={attempts[caseIndex] || 1}
              onSelectCase={(i) => startCase(i)} onRetry={() => startCase(caseIndex, cfg, { retry: true })}
              onToggleInstructor={instructor ? () => setShowInstructor((v) => !v) : undefined} />
            {showInstructor && <InstructorPanel cfg={cfg} caseN={CASES[caseIndex].n} onApply={(c) => { setShowInstructor(false); startCase(caseIndex, c); }} onClose={() => setShowInstructor(false)} />}
          </>
        )}
      </div>
    </PlainModeProvider>
  );
}

const currentSearch = () => (typeof location === "undefined" ? "" : location.search);

// A refresh (same URL) resumes the saved session; arriving by a different
// link — e.g. a cohort link — starts from that link's settings instead.
function initialAppState() {
  const saved = readSession("app");
  if (saved && saved.search === currentSearch() && saved.cfg) return { caseIndex: saved.caseIndex, cfg: saved.cfg, run: saved.run, attempts: saved.attempts || {} };
  clearCaseSessions();
  const { caseIndex, cfg } = readUrlConfig();
  return { caseIndex, cfg, run: 0, attempts: {} };
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
