/* The instructor dialog (seed, budget, the funnel itself) is for staff. It
   appears only once the game has been opened with ?instructor in the link
   — remembered in this browser — so students can't quietly raise the
   budget or flatten the funnel. ?instructor=off forgets it.
   ?seed=NAME starts the game on a shared seed, so a cohort gets the same
   funnel and the same outcomes and the debrief is about decisions. */
const currentSearch = () => (typeof location === "undefined" ? "" : location.search);

export function instructorMode(search = currentSearch()) {
  try {
    const q = new URLSearchParams(search).get("instructor");
    if (q === "off") localStorage.removeItem("ff-instructor");
    else if (q !== null) localStorage.setItem("ff-instructor", "1");
    return localStorage.getItem("ff-instructor") === "1";
  } catch { return false; }
}
export function urlSeed(search = currentSearch()) {
  try {
    const s = (new URLSearchParams(search).get("seed") || "").trim().slice(0, 40);
    return /^[\w.-]+$/.test(s) ? s : null;
  } catch { return null; }
}
