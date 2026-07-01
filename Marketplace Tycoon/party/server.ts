import type * as Party from "partykit/server";
import {
  createRoom, setHostCfg, joinPlayer, startGame, setDecision,
  lockPlayer, advance, publicState,
} from "./room.js";

/**
 * Authoritative market room. Clients send intents (join / setCfg / decision /
 * lock); the server holds the canonical state, resolves each week exactly once
 * via the pure engine, persists to storage for reconnects, and broadcasts the
 * public snapshot. Clients never compute the canonical result.
 */
export default class MarketServer implements Party.Server {
  state = createRoom();

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<ReturnType<typeof createRoom>>("state");
    if (saved) this.state = saved;
  }

  onConnect(conn: Party.Connection) {
    // Reconnecting/late joiner gets a full snapshot immediately.
    conn.send(JSON.stringify({ type: "state", state: publicState(this.state) }));
  }

  async onMessage(raw: string, sender: Party.Connection) {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    const isHost = this.state.players[sender.id]?.role === "host";

    switch (msg.type) {
      case "join":
        this.state = joinPlayer(this.state, sender.id, msg);
        break;
      case "setCfg":
        if (isHost) this.state = setHostCfg(this.state, msg.cfg);
        break;
      case "start":
        if (isHost) this.state = startGame(this.state);
        break;
      case "decision":
        this.state = setDecision(this.state, sender.id, msg.decision);
        break;
      case "lock": {
        this.state = lockPlayer(this.state, sender.id);
        this.state = advance(this.state, false).state; // resolves if everyone is locked
        break;
      }
      case "resolve":
        if (isHost) this.state = advance(this.state, true).state; // force-resolve
        break;
      default:
        return;
    }

    await this.room.storage.put("state", this.state);
    this.room.broadcast(JSON.stringify({ type: "state", state: publicState(this.state) }));
  }
}
