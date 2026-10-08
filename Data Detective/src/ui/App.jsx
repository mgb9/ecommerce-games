import React, { useEffect, useState } from "react";
import { CASES } from "../engine/engine.js";
import { T, GLOBAL_CSS } from "./theme.js";
import { PlainModeProvider } from "./shared.jsx";
import GeneratedCase from "./generated/GeneratedCase.jsx";
import InstructorPanel from "./generated/InstructorPanel.jsx";
import FieldCase from "./field/FieldCase.jsx";
import { readUrlConfig } from "./urlConfig.js";

/* Root: picks which case is on screen and with what instructor config.
   caseIndex 0..CASES.length-1 are the generated cases (1–4); CASES.length
   is the field-data case (5, real 2015 exports). Each case component owns
   its whole session; bumping `run` remounts it, which is how every
   "start again" / "switch case" / "apply instructor settings" resets. */
export default function App() {
  const [initial] = useState(readUrlConfig); // ?case=&seed=&noise= from a cohort link
  const [caseIndex, setCaseIndex] = useState(initial.caseIndex);
  const [cfg, setCfg] = useState(initial.cfg);
  const [run, setRun] = useState(0);
  const [showInstructor, setShowInstructor] = useState(false);

  function startCase(idx = caseIndex, newCfg = cfg) { setCaseIndex(idx); setCfg(newCfg); setRun((r) => r + 1); }
  const isField = caseIndex >= CASES.length;
  useShellBarOffset();
  // After a switch/restart (not on first load), move focus to the new screen.
  const autoFocus = run > 0;

  return (
    <PlainModeProvider>
      <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
        <style>{GLOBAL_CSS}</style>
        {isField ? (
          <FieldCase key={run} autoFocus={autoFocus} onRestart={() => startCase()} onExit={() => startCase(0)} />
        ) : (
          <>
            <GeneratedCase key={run} autoFocus={autoFocus} caseIndex={caseIndex} cfg={cfg} onSelectCase={(i) => startCase(i)} onRestart={() => startCase()}
              onToggleInstructor={() => setShowInstructor((v) => !v)} />
            {showInstructor && <InstructorPanel cfg={cfg} caseN={CASES[caseIndex].n} onApply={(c) => { setShowInstructor(false); startCase(caseIndex, c); }} onClose={() => setShowInstructor(false)} />}
          </>
        )}
      </div>
    </PlainModeProvider>
  );
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
