/* Finishing a game sets the hub's "played" flag for Marketplace Tycoon
   (the hub page reads the same key). Storage can be missing or blocked:
   then nothing is remembered. */
const HUB_KEY = "wmg-games-progress";
export function markHubPlayed() {
  try {
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.mt) { hub.mt = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
  } catch {}
}
