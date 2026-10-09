/* The instructor dialog (seed, α, power, effect size, peeking) is for
   staff. It appears only once the game has been opened with ?instructor
   in the link — remembered in this browser — so students can't quietly
   turn on peeking or shrink the effects. ?instructor=off forgets it. */
const currentSearch = () => (typeof location === "undefined" ? "" : location.search);

export function instructorMode(search = currentSearch()) {
  try {
    const q = new URLSearchParams(search).get("instructor");
    if (q === "off") localStorage.removeItem("cl-instructor");
    else if (q !== null) localStorage.setItem("cl-instructor", "1");
    return localStorage.getItem("cl-instructor") === "1";
  } catch { return false; }
}
