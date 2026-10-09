import { useEffect, useState } from "react";

/* Survive a refresh. The game's state — which screen, the experiment in
   progress, the student's predictions, plan and call, the quiz and the
   wireframe — is mirrored to sessionStorage (this tab only, gone when it
   closes), so an accidental reload or a trip to the hub and back doesn't
   throw away the session. A run is never stored: it is recomputed from
   the seed and the plan, which reproduces it exactly. Storage can be
   missing or blocked: every access is guarded and the game simply forgets. */
const PREFIX = "cl-session:";

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
