/* The instructor panel (seed, commission, platform prices, ranking
   weights, shocks) is for staff. It appears only once the game has been
   opened with ?instructor in the link — remembered in this browser — so
   students can't quietly change the market. ?instructor=off forgets it.
   ?seed=NAME starts the game on a shared seed, so a cohort faces the same
   market and the debrief is about decisions. Only the seed travels in the
   link; the other settings stay in the instructor's browser. */
const currentSearch = () => (typeof location === "undefined" ? "" : location.search);

export function instructorMode(search = currentSearch()) {
  try {
    const q = new URLSearchParams(search).get("instructor");
    if (q === "off") localStorage.removeItem("mt-instructor");
    else if (q !== null) localStorage.setItem("mt-instructor", "1");
    return localStorage.getItem("mt-instructor") === "1";
  } catch { return false; }
}
// A seed a link can carry: letters, digits, _ . - and at most 40 characters.
export const linkableSeed = (seed) => /^[\w.-]{1,40}$/.test(String(seed));
export function urlSeed(search = currentSearch()) {
  try {
    const s = (new URLSearchParams(search).get("seed") || "").trim().slice(0, 40);
    return linkableSeed(s) ? s : null;
  } catch { return null; }
}
// The link a tutor sends a cohort: this seed, no instructor controls.
export function cohortLink(seed, loc = typeof location === "undefined" ? null : location) {
  return loc ? `${loc.origin}${loc.pathname}?seed=${encodeURIComponent(seed)}` : "";
}
