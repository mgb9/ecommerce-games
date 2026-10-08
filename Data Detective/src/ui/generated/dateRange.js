import { useMemo } from "react";
import { TOTAL_DAYS, precedingPeriod } from "../../engine/engine.js";
import { useSessionState } from "../session.js";

/* ---- date range ------------------------------------------------------
   GA-style: a current window (last 7/14/21 days) compared against either
   the first week or the equal-length period just before it. Positioning
   the window matters — one that straddles the incident start, or a
   comparison that's also affected, dilutes the delta. The state is owned
   by GeneratedCase so it survives a trip to the diagnosis screen, and is
   kept in the tab's session so it survives a refresh. */
export const PRESETS = [7, 14, 21].map((n) => ({ label: `Last ${n} days`, win: [TOTAL_DAYS - n, TOTAL_DAYS - 1] }));
export function useDateRange(sessionKey) {
  const [cur, setCur] = useSessionState(`${sessionKey}:cur`, PRESETS[0].win);
  const [cmpMode, setCmpMode] = useSessionState(`${sessionKey}:cmp`, "first");   // "first" week | "preceding" period
  const cmp = useMemo(() => (cmpMode === "first" ? [0, 6] : precedingPeriod(cur)), [cmpMode, cur]);
  return { cur, setCur, cmp, cmpMode, setCmpMode, cmpName: cmpMode === "first" ? "Wk1" : "prev" };
}
