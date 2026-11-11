/* The instructor panel (seed, commission, platform prices, ranking
   weights, shocks) is for staff. It appears only once the game has been
   opened with ?instructor in the link — remembered in this browser — so
   students can't quietly change the market. ?instructor=off forgets it. */
const currentSearch = () => (typeof location === "undefined" ? "" : location.search);

export function instructorMode(search = currentSearch()) {
  try {
    const q = new URLSearchParams(search).get("instructor");
    if (q === "off") localStorage.removeItem("mt-instructor");
    else if (q !== null) localStorage.setItem("mt-instructor", "1");
    return localStorage.getItem("mt-instructor") === "1";
  } catch { return false; }
}
