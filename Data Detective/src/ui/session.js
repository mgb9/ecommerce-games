import { useEffect, useState } from "react";

/* Survive a refresh. The current case and the student's progress through
   it are mirrored to sessionStorage — this tab only, gone when it closes —
   so an accidental reload, or a trip to the hub and back, doesn't throw
   away twenty minutes of investigation. Keys carry the run number, so
   starting a case afresh (a new run) never restores the old one; App
   clears the previous run's keys when it starts a new one. Storage can be
   missing or blocked: every access is guarded and the game simply forgets. */
const PREFIX = "dd-session:";

export function readSession(key) {
  try { const raw = sessionStorage.getItem(PREFIX + key); return raw == null ? undefined : JSON.parse(raw); } catch { return undefined; }
}
export function writeSession(key, value) {
  try { sessionStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
}
// useState that is restored from, and saved to, this tab's session.
export function useSessionState(key, initial) {
  const [value, setValue] = useState(() => {
    const saved = readSession(key);
    return saved !== undefined ? saved : typeof initial === "function" ? initial() : initial;
  });
  useEffect(() => { writeSession(key, value); }, [key, value]);
  return [value, setValue];
}
// Forget every saved case-session value except the app-level record.
export function clearCaseSessions() {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith(PREFIX) && k !== PREFIX + "app") sessionStorage.removeItem(k);
  } catch {}
}
