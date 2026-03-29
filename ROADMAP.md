# Roadmap

Planned features and improvements, roughly in priority order. Inspired partly by [KasamiBot](https://kasami.github.io/kasamibot/features.html).

---

## In Progress
- Pioneer bootstrap for E12N53 (claimed, needs spawn built)

---

## Short Term (RCL 3-4)

### basehauler role
Dedicated creep for refilling extensions and towers in the home room.
Currently harvesters do double duty (mine + deliver to spawn/extensions), wasting walking time.
A basehauler withdraws from containers/storage and keeps extensions topped up continuously.
**Impact:** Harvesters focus purely on mining → faster energy flow → spawn fills faster.

### Smarter spawn energy threshold
Pioneer body currently costs full 800 energy. In low-energy situations (like bootstrapping a new room)
the spawn starves waiting for 800. Pioneers should use a small fixed body — they just need to get
there and build, not be powerful.

### Scale remote rooms with RCL
Currently capped at 1 remote room (RCL 3) and 2 (RCL 4). Should scale to 6 by RCL 8:
```
RCL 3: 1 room
RCL 4: 2 rooms
RCL 5: 3 rooms
RCL 6: 4 rooms
RCL 7: 5 rooms
RCL 8: 6 rooms
```

---

## Medium Term (RCL 5-6)

### 7×7 core stamp layout
Replace the current spiral/checkerboard extension placement with a fixed 7×7 base stamp.
- Spawn, storage, terminal, labs placed in a tight core
- Extensions radiate out in wings
- Much more compact, better pathing, consistent across all rooms
- KasamiBot uses this — it's the standard high-end layout

### basecourier role
Separate creep for non-energy resource transport inside the home room:
- Minerals → labs
- Ghodium → nuker (RCL 8)
- Lab outputs → terminal/storage
Currently the labWorker handles some of this but it's inefficient.

### Rampart defenders
Creeps that physically stand on ramparts to block attacker pathing.
Combined with towers this makes the base nearly impenetrable.
Body: `[TOUGH×n, MOVE×1]` — cheap, just needs to block tiles.

### Scout re-evaluation every 20,000 ticks
Current scout only marks rooms as scouted once and moves on.
Rooms change ownership over time — stale intel leads to bad expansion decisions.
Re-scout any room where `lastScouted < Game.time - 20000`.

---

## Long Term (RCL 7-8)

### Multi-room awareness
When you own 3+ rooms:
- Logistics manager balances energy between all rooms via terminals
- Spawn manager can request creeps from any room with spare spawn capacity
- Lab reactions can be split across rooms (different mineral types in each)

### Power bank raiding (RCL 8)
Send `bankrobber + bankhealer` pairs to power bank rooms.
- bankrobber: heavy ATTACK body to break the bank
- bankhealer: HEAL body to keep bankrobber alive (power banks hit back)
- Power is used to activate Power Creeps for permanent buffs
Requires boosted creeps and careful timing.

### Power Creeps
Once power is farmed, activate Power Creeps for permanent room buffs:
- `Operator` class boosts lab output, tower range, spawn speed
- Long-term investment that pays off for the lifetime of the room

### Nuke capability (RCL 8)
Nuker structure fires missiles at enemy rooms.
Mostly a late-game PvP/prestige feature.
Requires Ghodium (G) to load.

---

## Known Issues / Tech Debt
- Expansion memory is shared across rooms — if 2 rooms both run `updateRemoteRooms`,
  the last one wins and can overwrite the other's data. Needs per-room remote room tracking.
- `Memory.username` was not being auto-set — fixed in recent push.
- Claiming a room that was the only remote mine source stalls energy economy —
  fixed in recent push (owned rooms without spawns stay mineable).
