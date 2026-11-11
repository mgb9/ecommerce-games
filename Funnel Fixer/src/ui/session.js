import { useEffect, useState } from "react";

/* Survive a refresh. The game's state — which screen, the funnel, the
   quarter's predictions and basket, the records so far — is mirrored to
   sessionStorage (this tab only, gone when it closes), so an accidental
   reload or a trip to the hub and back doesn't throw the run away. Storage
   can be missing or blocked: every access is guarded and the game simply
   forgets. */
const PREFIX = "ff-session:";

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
