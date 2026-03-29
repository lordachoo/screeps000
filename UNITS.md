# Units Reference

Detailed breakdown of every creep role in the bot — what they do, their body composition, spawn priority, and strategy.

---

## Body Part Costs & Effects

| Part | Cost | Effect |
|------|------|--------|
| WORK | 100 | Harvest 2/tick, build 5/tick, repair 100/tick, upgrade 1/tick |
| CARRY | 50 | Carry 50 energy/resources |
| MOVE | 50 | Move 1 tile/tick on roads; reduces fatigue |
| ATTACK | 80 | Melee 30 dmg/tick |
| RANGED_ATTACK | 150 | Ranged 10 dmg/tick (mass: scales with range) |
| HEAL | 250 | Heal self/others 12 HP/tick (ranged: 4/tick) |
| TOUGH | 10 | No ability — just cheap HP, good at front of body |
| CLAIM | 600 | Claim/reserve/attack controllers |

Creep max size: **50 parts**. Bodies are ordered — damaged parts at the front stop working first.

---

## Harvester

**Priority:** 1 (emergency fallback only — no longer the primary energy role)
**Role:** Emergency energy producer — only spawns if both miner AND basehauler are dead

Harvesters have been replaced by the miner + basehauler combo for normal operation. A single tiny `[WORK, CARRY, MOVE]` harvester spawns automatically if the room has zero energy producers, keeping the room alive until miners and basehaulers respawn.

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'harvester').length
// Should normally be 0 — if >0, miner/basehauler died and emergency kicked in
```

---

## Miner

**Priority:** 2
**Unlocks:** RCL 1 (replaces harvesters)
**Role:** Static miner for home room sources — no CARRY, mines continuously into container

Parks on the container next to its assigned source and mines every tick. Energy drops directly into the container below it. Never moves after arrival. Identical pattern to remoteMiner but for home room.

### Body
```
800+ energy:  [WORK×5, MOVE×3]   — 10 energy/tick, exactly saturates a source
400+ energy:  [WORK×3, MOVE×2]   — partial rate
```

### Strategy
- 1 miner per home source (1 for E13N53, more as rooms are added)
- 5 WORK = 10 energy/tick = 100% source efficiency, never idles
- Parks on container so energy goes directly in rather than dropping to ground
- Basehauler collects from the container and delivers to spawn/extensions

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'miner').map(c => ({
  name: c.name, source: c.memory.sourceId, pos: c.pos.x+','+c.pos.y
}))
```

---

## Basehauler

**Priority:** 3
**Unlocks:** RCL 1 (replaces harvesters)
**Role:** Collects energy from home containers and delivers to spawn/extensions/towers/storage

The delivery half of the miner+basehauler combo. Withdraws from home containers and keeps spawn, extensions, towers, and storage topped up. Has 1 WORK part for container repair.

### Body
```
Same scaling as hauler — [WORK×1, CARRY×n, MOVE×n]
At 800 cap: [WORK, CARRY×4, MOVE×3] — 350 carry capacity
```

### Delivery priority
1. Source link (RCL 5+ — dumps into link instead of walking to spawn)
2. Spawn / Extensions
3. Tower (if under 80%)
4. Storage
5. Upgrade controller (fallback when nothing needs energy)

### Strategy
- 1 basehauler per home source — enough throughput for 10 energy/tick from one source
- Has 1 WORK part to repair containers when they decay below 50% HP
- Picks up dropped energy and tombstones as fallback if container is empty
- Falls back to upgrading when spawn/extensions are all full

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'basehauler').map(c => ({
  name: c.name, carry: c.store.getUsedCapacity(RESOURCE_ENERGY), harvesting: c.memory.harvesting
}))
```

---

## Upgrader

**Priority:** 3
**Role:** Upgrade the room controller

Upgraders pump progress into the controller constantly. Losing all upgraders will eventually cause the controller to downgrade and you lose the room.

### Body scaling
```
Base:  [WORK, CARRY, MOVE]                    — 200 energy
Extra: [WORK, WORK, CARRY, MOVE] per chunk    — WORK-heavy for max upgrade output
```

More WORK parts = more upgrade progress per tick.

### Energy priority
1. Controller link (RCL 5+ — park and withdraw, never walk)
2. Storage
3. Containers
4. Dropped energy
5. Tombstones
6. Direct harvest from source

### Strategy
- With links active (RCL 5+), upgraders park next to the controller link and never leave — massive efficiency gain
- Count: 2 at RCL 1-3, bumps to 3 at RCL 4, drops to 2 at RCL 6 (energy is more valuable elsewhere)
- Auto-bumps by +2 (up to 5) when storage has >100k energy — spends the surplus on controller progress
- At RCL 8 controller is maxed — upgraders still run to generate GCL progress

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'upgrader').length

// Are they using the link?
Object.values(Game.creeps).filter(c => c.memory.role === 'upgrader').map(c => ({name: c.name, room: c.room.name, carry: c.store.getUsedCapacity(RESOURCE_ENERGY), harvesting: c.memory.harvesting}))
```

---

## Builder

**Priority:** 4
**Role:** Build construction sites, fallback to upgrading

Builders work through the construction queue and fall back to upgrading when there's nothing left to build.

### Body scaling
```
Base:  [WORK, CARRY, MOVE]                        — 200 energy
Extra: [WORK, CARRY, CARRY, MOVE] per chunk       — extra CARRY for fewer refill trips
```

### Build priority order
1. Spawn
2. Tower
3. Extension
4. Storage
5. Container
6. Road
7. Wall
8. Rampart

### Strategy
- When no construction sites exist, builders act as extra upgraders — no wasted CPU
- Spawn manager reduces desired count to 1 when no construction sites exist
- Can be bottlenecked waiting for energy — having storage and containers helps a lot

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'builder').length

// Current construction sites
Game.rooms['E13N53'].find(FIND_CONSTRUCTION_SITES).map(s => s.structureType)
```

---

## Repairer

**Priority:** 5
**Unlocks:** RCL 3
**Role:** Keep structures healthy, fallback to building/upgrading

Repairers focus on damaged structures and walls/ramparts, preventing decay from degrading your defenses.

### Body scaling
```
Base:  [WORK, CARRY, MOVE]           — 200 energy (same as harvester)
Extra: [WORK, CARRY, MOVE] per chunk — max 12 parts
```

### Repair priority
1. Damaged non-wall structures (roads, containers, towers, etc.) — most damaged first
2. Walls/ramparts below RCL-scaled HP target
3. Construction sites (acts as builder)
4. Controller upgrade (acts as upgrader — nothing else to do)

### Wall HP targets
```
{ 1: 1000, 2: 5000, 3: 25000, 4: 50000, 5: 100000, 6: 500000, 7: 1000000, 8: 10000000 }
```

### Strategy
- One repairer is usually enough — towers handle most emergency repairs
- Most valuable for keeping roads and containers alive (they decay without upkeep)
- Falls back to upgrading when nothing needs repair — never idle

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'repairer').length

// Damaged structures (potential repair targets)
Game.rooms['E13N53'].find(FIND_STRUCTURES, {filter: s => s.hits < s.hitsMax && s.structureType !== 'constructedWall' && s.structureType !== 'rampart'}).map(s => ({type: s.structureType, hits: s.hits, max: s.hitsMax, pct: (s.hits/s.hitsMax*100).toFixed(0)+'%'}))
```

---

## Defender

**Priority:** 6
**Role:** Melee combat, spawns when hostiles are detected

Basic melee defender. Spawns reactively when hostiles are in the room.

### Body scaling
```
Base:  [TOUGH, ATTACK, MOVE, MOVE]
Extra: [TOUGH, ATTACK, MOVE, MOVE] per chunk — max 20 parts
```

TOUGH parts at the front absorb damage cheaply before ATTACK parts take hits.

### Strategy
- Patrols near the spawn when idle
- Runs straight at hostiles to melee attack
- Works well for lone invaders — for coordinated attacks, rely on towers + ranged defenders
- Desired count bumps to 2 when hostiles are present

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'defender').length
Game.rooms['E13N53'].find(FIND_HOSTILE_CREEPS).map(c => ({name: c.name, owner: c.owner.username, parts: c.body.map(b => b.type)}))
```

---

## Ranged Defender

**Priority:** 6 (same as defender)
**Unlocks:** RCL 4+, only spawns when hostiles present
**Role:** Kiting ranged combat with self-heal

More sophisticated than the melee defender — kites melee threats and self-heals for sustained combat.

### Body scaling
```
Base:  [TOUGH, TOUGH, RANGED_ATTACK, MOVE, MOVE, MOVE]   — 420 energy
Extra: [RANGED_ATTACK, MOVE] per chunk
End:   [HEAL, MOVE] appended when affordable              — sustain
```

### Strategy
- Maintains range 3 from melee hostiles (moves away if closer)
- Uses `rangedMassAttack()` when 3+ enemies in range 3 (hits all of them)
- Uses `rangedAttack()` for single targets
- Self-heals every tick if damaged and has HEAL parts
- Combines well with towers — tower softens, ranged defender finishes

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'rangedDefender').length
```

---

## Scout

**Priority:** 7
**Unlocks:** RCL 2
**Role:** Explore rooms up to 10 away, build intel for expansion decisions

The scout is a single `[MOVE]` creep — costs 50 energy, almost free. It maps rooms using BFS and stores intel for the expansion manager to use when choosing claim targets and remote mining rooms.

### Body
```
[MOVE]    — always, 50 energy. Cheapest possible creep.
```

### What it records per room
- Source count and IDs
- Controller presence and ownership
- Hostile creep count
- Mineral type

### Strategy
- Uses BFS to find the nearest unexplored room and travels there via waypoints
- Skips rooms owned by others (hostile or player-owned)
- Stuck detection at 50 ticks — blacklists rooms it can't reach
- Blacklist persists in `Memory.scoutBlacklist` across scout deaths
- Only 1 scout runs at a time — cheap enough to always have one alive

### Console
```js
// Scouted rooms
Object.keys(Memory.roomIntel).length

// Intel on a specific room
Memory.roomIntel['E12N53']

// Rooms with 2+ sources (best claim candidates)
Object.entries(Memory.roomIntel).filter(([n, i]) => i.sources && i.sources.length >= 2).map(([n]) => n)

// Scout blacklist
Memory.scoutBlacklist

// Clear blacklist
Memory.scoutBlacklist = {}
```

---

## Remote Miner

**Priority:** 8
**Unlocks:** RCL 3 (via expansion manager)
**Role:** Static miner at remote sources — no CARRY, pure output

Remote miners have zero carry capacity. They walk to the remote room once, park on a container next to the source, and mine every single tick until they die.

### Body
```
800+ energy:  [WORK×5, MOVE×3]   — 650 energy, drains 10 energy/tick = exactly matches source regen
400+ energy:  [WORK×3, MOVE×2]   — 400 energy, partial drain
```

5 WORK parts = 10 energy/tick harvested, which exactly matches a source's 10 energy/tick regeneration rate. 100% efficient.

### Strategy
- Parks on the container — dropped energy lands in container automatically
- One miner per source, assigned via `memory.sourceId`
- Never moves after arrival — MOVE parts only needed for the initial trip
- Hauler handles all the energy transport
- At RCL 4+ with reservation, source output doubles (3000 → 4000 per ~300 tick cycle)

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'remoteMiner').map(c => ({name: c.name, room: c.room.name, target: c.memory.targetRoom, source: c.memory.sourceId}))
```

---

## Hauler

**Priority:** 9
**Unlocks:** RCL 3
**Role:** Shuttle energy from remote containers to home storage

Haulers are the cargo trucks of the operation. They pick up energy from remote containers and deliver it home. The 1 WORK part lets them repair the container they're draining.

### Body scaling
```
Base:  [WORK, CARRY, MOVE, MOVE]          — 250 energy
Extra: [CARRY, CARRY, MOVE] per chunk     — 2:1 CARRY:MOVE ratio (roads halve move cost)
```

### Delivery priority
- Energy → home storage
- Non-energy minerals → terminal first, then storage

### Strategy
- 2:1 CARRY:MOVE ratio works because roads are built along the route
- Uses 1 WORK part to repair the remote container when picking up (prevents decay)
- Count scales with distance — longer routes need more haulers to maintain throughput
- When carrying minerals, delivers to terminal first (feeds the market/lab pipeline)

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'hauler').map(c => ({name: c.name, room: c.room.name, carry: c.store.getUsedCapacity(RESOURCE_ENERGY), target: c.memory.targetRoom}))
```

---

## Reserver

**Priority:** 10
**Unlocks:** RCL 4
**Role:** Reserve remote controllers to double source output

Reserving a remote room's controller doubles its source energy output from 3000 → 4000 per cycle. Worth doing for any room you're actively mining.

### Body
```
[CLAIM, CLAIM, MOVE, MOVE]   — exactly 1300 energy (requires RCL 4 energy cap)
```

2 CLAIM parts = +2 reservation ticks per tick. A controller needs 5000 ticks of reservation to cap — 2 CLAIM parts maintain it with room to spare.

### Strategy
- Only assigned to remote rooms with 2+ sources (cost/benefit)
- One reserver per remote room
- Sits at the controller and reserves every tick
- Walks home and respawns before TTL runs out (if close enough) — otherwise just respawns fresh

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'reserver').map(c => ({name: c.name, target: c.memory.targetRoom, ttl: c.ticksToLive}))

// Check reservation status of remote room (if visible)
Game.rooms['E12N53'] && Game.rooms['E12N53'].controller.reservation
```

---

## Claimer

**Priority:** 11
**Unlocks:** RCL 3 + GCL 2
**Role:** One-shot room claiming

The claimer travels to the claim target and claims the controller. This is a one-way trip — CLAIM parts have 600 tick TTL and claiming is instant if it arrives in time.

### Body
```
850+ energy:  [CLAIM, MOVE×5]   — fast travel, 5 MOVE for speed
650+ energy:  [CLAIM, MOVE]     — minimum viable, slower travel
```

### Strategy
- Spawns once and travels directly to `Memory.expansion.claimTarget`
- After claiming, 4 pioneers spawn to bootstrap the new room
- Doesn't respawn after claiming — once the room is claimed, pioneer work begins
- If target room is too far (>6-7 rooms), claimer may expire before arriving — pick closer targets

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'claimer').map(c => ({name: c.name, target: c.memory.targetRoom, ttl: c.ticksToLive}))

// Manually set claim target
Memory.expansion.claimTarget = 'E12N53'

// Clear claim target (stop trying to claim)
Memory.expansion.claimTarget = null
```

---

## Pioneer

**Priority:** 12
**Unlocks:** After a room is claimed (no spawn yet)
**Role:** Bootstrap a newly claimed room by building its first spawn

4 pioneers spawn from the home room after the claimer succeeds. They travel to the new room, place a spawn construction site, and build it.

### Body scaling
```
Same as harvester — [WORK, CARRY, MOVE] base, scales with energy cap
```

### Strategy
- Carries energy from home to build the new spawn
- Places spawn construction site if it doesn't exist yet
- Once spawn is built, the new room runs fully autonomously
- All 4 pioneers share the task — more WORK parts = faster construction
- Pioneers harvest from local sources if they run out of carried energy

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'pioneer').map(c => ({name: c.name, target: c.memory.targetRoom, carry: c.store.getUsedCapacity(RESOURCE_ENERGY)}))

// Check if new room has a spawn yet
Game.rooms['E12N53'] && Game.rooms['E12N53'].find(FIND_MY_SPAWNS).length
```

---

## Mineral Miner

**Priority:** 13
**Unlocks:** RCL 6 (extractor built + mineral has resources)
**Role:** Harvest room mineral deposit

Same concept as the remote miner but for the home room's mineral. Parks on the mineral container and extracts every tick.

### Body
```
650+ energy:  [WORK×5, MOVE×3]   — matches mineral harvest rate
400+ energy:  [WORK×3, MOVE×2]   — partial rate
```

### Strategy
- Idles automatically when `mineral.mineralAmount === 0` (regenerates after ~50k ticks)
- Haulers pick up the mineral and deliver to terminal/storage
- Minerals feed the lab reaction chain — stock up before trying to react

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'mineralMiner').length

// Mineral deposit status
var m = Game.rooms['E13N53'].find(FIND_MINERALS)[0]
m.mineralType + ': ' + m.mineralAmount + ' (regen in ' + (m.ticksToRegeneration || 'N/A') + ' ticks)'
```

---

## Lab Worker

**Priority:** 14
**Unlocks:** RCL 6 (3+ labs built)
**Role:** Shuttle reagents between storage/terminal and labs

The lab worker keeps the reaction pipeline fed. It loads input labs with the right minerals and empties output labs back to storage.

### Body
```
[CARRY×4, MOVE×2]   — 300 energy, pure cargo shuttle
```

### State machine
1. Check if input labs need reagents loaded → fetch from storage/terminal → load
2. Check if output labs are full → empty to storage/terminal
3. Idle near storage when nothing to do

### Strategy
- Only 1 lab worker needed per room
- Labs run reactions every 10 ticks — lab worker doesn't need to be fast, just consistent
- Delivers output minerals to terminal first (for market selling and cross-room distribution)

### Console
```js
Object.values(Game.creeps).filter(c => c.memory.role === 'labWorker').length

// Lab worker state
Object.values(Game.creeps).filter(c => c.memory.role === 'labWorker').map(c => ({name: c.name, harvesting: c.memory.harvesting, carry: JSON.stringify(c.store)}))

// Current reaction target
Game.rooms['E13N53'].memory.labTarget
```

---

## Spawn Priority Summary

| Priority | Role | Count | Activates |
|----------|------|-------|-----------|
| 1 | Harvester | 0 (emergency only) | Only if miner+basehauler both dead |
| 2 | Miner | 1 per home source | RCL 1 |
| 3 | Basehauler | 1 per home source | RCL 1 |
| 4 | Upgrader | 2-5 | RCL 1 |
| 5 | Builder | 1-2 | RCL 1 |
| 6 | Repairer | 0-1 | RCL 3 |
| 7 | Defender | 0-2 | When hostiles present |
| 7 | Ranged Defender | 0-1 | RCL 4 + hostiles |
| 8 | Scout | 0-1 | RCL 2 |
| 9 | Remote Miner | 0-4 | RCL 3 |
| 10 | Hauler | 0-6 | RCL 3 |
| 11 | Reserver | 0-2 | RCL 4 |
| 12 | Claimer | 0-1 | RCL 3 + GCL 2 |
| 13 | Pioneer | 0-4 | After room claimed |
| 14 | Mineral Miner | 0-1 | RCL 6 + extractor |
| 15 | Lab Worker | 0-1 | RCL 6 + 3 labs |
