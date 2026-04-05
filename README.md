# screeps000

Fully automated Screeps AI bot for the official server. Handles everything from RCL 1 through RCL 8 — economy, expansion, combat, minerals, labs, market trading, and multi-room logistics. All features activate automatically at the appropriate RCL level.

**Player:** Lordachoo | **Shard:** 3 | **Starting Room:** E13N53

## Quick Start

1. Fork/clone this repo
2. Connect to Screeps via **GitHub Integration** (Settings > GitHub)
3. Set sync path to `src`
4. Click Sync — all modules load automatically
5. Claim a room and watch it go

## Guides

- **[PROGRESSION.md](PROGRESSION.md)** — RCL-by-RCL checklist with console commands to verify each upgrade is working correctly
- **[COMMAND-CHEATSHEET.md](COMMAND-CHEATSHEET.md)** — Quick reference for all in-game console commands (status, creeps, structures, expansion, labs, emergency fixes)
- **[BUILDINGS.md](BUILDINGS.md)** — Every structure explained: what it does, when it unlocks, strategy, and console verification commands
- **[UNITS.md](UNITS.md)** — Every creep role explained: body composition, behavior, spawn priority, and strategy
- **[ROADMAP.md](ROADMAP.md)** — Planned features and improvements (basehauler, rampart defenders, 7×7 layout, power raiding, etc.)
- **[WHITELIST.md](WHITELIST.md)** — Non-aggression pact system: how to whitelist friendly players so towers/defenders ignore their creeps

## Architecture

```
src/
├── main.js                 # Game loop — orchestrates everything
│
├── Managers
│   ├── manager.spawn.js    # Creep population, body scaling, role priorities
│   ├── manager.tower.js    # Tower defense: focus-fire, auto safe mode
│   ├── manager.room.js     # Auto construction: extensions, towers, roads, links, labs...
│   ├── manager.expansion.js# Remote mining, room claiming, scout coordination
│   ├── manager.link.js     # Link energy transfers (source → controller/storage)
│   ├── manager.market.js   # Terminal buy/sell orders
│   ├── manager.lab.js      # Lab reactions and compound production
│   └── manager.logistics.js# Cross-room energy/mineral balancing via terminals
│
├── Home Economy Roles
│   ├── role.harvester.js   # Mine energy, deliver to spawn/extensions/towers/storage/links
│   ├── role.upgrader.js    # Upgrade controller (uses links/storage/containers)
│   ├── role.builder.js     # Build construction sites, fallback to upgrading
│   ├── role.repairer.js    # Repair structures, walls scale with RCL
│   └── role.defender.js    # Melee combat, patrol near spawn
│
├── Expansion Roles
│   ├── role.scout.js       # Explore rooms up to 10 away, store intel
│   ├── role.remoteMiner.js # Static miner at remote sources (5 WORK, no CARRY)
│   ├── role.hauler.js      # Shuttle energy from remote rooms + repair containers
│   ├── role.reserver.js    # Reserve remote controllers (doubles source output)
│   ├── role.claimer.js     # One-shot room claiming
│   └── role.pioneer.js     # Bootstrap new rooms (build first spawn)
│
└── Advanced Roles
    ├── role.rangedDefender.js # Kiting ranged combat with self-heal
    ├── role.mineralMiner.js   # Harvest room mineral deposit
    └── role.labWorker.js      # Shuttle reagents between storage/terminal and labs
```

## Features

### Home Economy (RCL 1+)
- **Auto-scaling creep bodies** — creeps get bigger as energy capacity grows
- **Emergency spawning** — if all harvesters die, spawns a tiny one with 200 energy
- **Smart energy delivery** — harvesters fill spawn/extensions first, then towers, then storage
- **Source balancing** — harvesters spread across sources evenly
- **Idle fallback** — builders/repairers upgrade the controller when nothing else to do
- **Stats dashboard** — console readout every ~3 min showing RCL progress, rate/hr, ETA, CPU, creep counts

### Auto Construction (RCL 2+)
- Extensions, containers, towers, roads, storage, links, ramparts, extractor, terminal, labs
- All placed automatically at the right RCL with smart positioning
- Checkerboard extension pattern for creep movement
- Spiral placement from spawn outward
- Ramparts on critical structures (spawn, storage, towers, terminal, links)
- Max 5 construction sites at a time to prevent builder overwhelm

### Remote Mining (RCL 3+)
- Scout explores adjacent rooms and stores intel in `Memory.roomIntel`
- Scores rooms by source count, picks best adjacent room for mining
- Static remote miners (5 WORK) drain sources completely
- Haulers with 1 WORK part shuttle energy home and repair decaying containers
- Auto-places containers at remote sources
- Scales to 2 remote rooms at RCL 4+

### Room Reservation (RCL 4+)
- Reserves remote room controllers with CLAIM parts
- Doubles remote source output (3000 → 4000 energy per cycle)
- Only reserves rooms with 2+ sources (cost/benefit gating)

### Room Claiming (RCL 3+ / GCL 2+)
- Evaluates all scouted rooms up to 4 away for claiming
- Prefers 2-source rooms, scores by source count and distance
- Claimer creep travels to target and claims controller
- 4 pioneer creeps bootstrap the new room (build first spawn)
- New room inherits full bot automation once spawn is built

### Link Network (RCL 5+)
- Links placed near sources and controller
- Source harvesters dump energy into links instead of walking
- Upgraders withdraw from controller link — stay parked, no travel time
- Link manager transfers energy source → controller → storage
- Massive efficiency boost — eliminates hauler walking for home room

### Tower Defense (RCL 3+)
- **Focus fire** — all towers attack the same target
- **Target scoring** — healers die first (heal×3 + ranged×2 + attack×1 - distance×0.5)
- **Auto safe mode** — activates if spawn drops below 50% HP or 3+ hostiles near spawn
- **Repair priority** — structures first, then walls/ramparts up to RCL-scaled HP targets
- **Ranged defenders** — kiting combat creeps with self-heal (RCL 4+)

### Mineral Mining (RCL 6+)
- Extractor auto-placed on mineral deposit
- Mineral miner harvests into container
- Haulers deliver minerals to terminal/storage
- Miner idles when mineral is depleted (regenerates after 50k ticks)

### Labs (RCL 6+)
- 3+ labs placed in cluster (within range 2 for reactions)
- Auto-assigns input/output labs
- Plans production by priority: upgrade boost > heal boost > ranged boost > tough boost > harvest boost
- Lab worker shuttles reagents from storage/terminal to input labs and empties outputs
- Supports full compound reaction chains

### Market Trading (RCL 6+)
- Auto-creates sell orders for excess minerals (>5000 in terminal)
- Scans market for cheap energy deals when storage is low
- Prices based on market history (90% of average)

### Multi-Room Logistics (RCL 6+ / 2+ terminals)
- Balances energy between rooms — surplus (>200k) sends to deficit (<50k)
- Distributes minerals to rooms that need them for lab reactions
- Runs every 200 ticks, caps transfers at 25k to manage costs

## RCL Activation Timeline

| RCL | Energy Cap | Key Unlocks |
|-----|-----------|-------------|
| 1 | 300 | Harvesters, upgraders, builders |
| 2 | 550 | Extensions, containers, scout |
| 3 | 800 | Tower, roads, repairer, remote mining, claiming evaluation, ramparts |
| 4 | 1,300 | Storage, 3rd harvester, reservation, 2nd remote room, claimer |
| 5 | 1,800 | Links (source + controller), 2nd tower |
| 6 | 2,300 | Extractor, terminal, 3 labs, mineral miner, lab worker, market trading |
| 7 | 5,600 | 2nd spawn, 3rd tower, 6 labs, 4 links |
| 8 | 12,900 | Max everything — 6 towers, 6 links, 10 labs, 60 extensions |

## Spawn Priority

Creeps spawn in this priority order (lower number = spawns first):

| Priority | Role | Min Count |
|----------|------|-----------|
| 1 | Harvester | 2-3 |
| 4 | Repairer | 0-1 |
| 5 | Upgrader | 2-5 |
| 6 | Builder | 1-2 |
| 7 | Defender / Ranged Defender | 0-2 |
| 7 | Scout | 0-1 |
| 8 | Remote Miner | 0-4 |
| 9 | Hauler | 0-6 |
| 10 | Reserver | 0-2 |
| 11 | Claimer | 0-1 |
| 12 | Pioneer | 0-4 |
| 13 | Mineral Miner | 0-1 |
| 14 | Lab Worker | 0-1 |

## Memory Structure

```
Memory.creeps[name]     — Per-creep role, homeRoom, targetRoom, sourceId
Memory.roomIntel[room]  — Scout data: sources, controller, hostiles, mineral
Memory.expansion        — Remote room assignments + claim target
Memory.stats[room]      — Progress tracking for stats dashboard
Memory.scoutBlacklist   — Rooms the scout can't reach
Memory.username         — Cached player username
```

## Deployment

### GitHub Integration (recommended)
1. Go to Screeps > Settings > GitHub
2. Select repo `screeps000`, path `src`
3. Click Sync

### Manual
Copy each `src/*.js` file into the Screeps in-game code editor as a module with the matching name (without `.js` extension).

## Configuration

Key constants are in `manager.spawn.js`:
- `ROLES` — role priorities and minimum counts
- `getDesiredCounts()` — dynamic creep counts by RCL
- `getBody()` — body compositions per role
- `scaledBody()` — auto-scaling body builder

Wall/rampart HP targets are in both `manager.tower.js` and `role.repairer.js`:
```
{ 1: 1000, 2: 5000, 3: 25000, 4: 50000, 5: 100000, 6: 500000, 7: 1000000, 8: 5000000 }
```
