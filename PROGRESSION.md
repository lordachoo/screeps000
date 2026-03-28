# Screeps Bot Progression Checklist

Use this to verify each RCL upgrade is working correctly. After each level-up, check the console stats and visually confirm these items in-game.

---

## RCL 1 (Starting)
**Energy Capacity:** 300

### What should be happening:
- [ ] Spawn1 is active
- [ ] 2 harvesters spawning with body `[work,carry,move]` (200 energy)
- [ ] 2 upgraders spawning with body `[work,carry,move]` (200 energy)
- [ ] 2 builders spawning with body `[work,carry,move]` (200 energy)
- [ ] Harvesters delivering energy to spawn
- [ ] Upgraders carrying energy to the controller
- [ ] Controller progress ticking up in stats

### Console verification:
```
Game.rooms['E13N53'].controller.level
// Should return: 1
```

### Red flags:
- 0 harvesters = emergency mode, tiny creep should spawn at 200 energy
- Upgraders idle = no energy flow, check harvesters
- No creeps at all = check for code errors in console

---

## RCL 2 (5,000 points)
**Energy Capacity:** 550 (spawn 300 + 5 extensions × 50)

### What should be happening:
- [ ] **5 extensions** auto-placed near spawn (checkerboard pattern)
- [ ] Extensions being built by builders
- [ ] Extensions filling up with energy (harvesters deliver to them)
- [ ] **Bigger creep bodies** — should see 5-7 part creeps, NOT 3-part `[work,carry,move]`
- [ ] **Scout spawned** — cheap `[move]` creep exploring adjacent rooms
- [ ] Containers being placed near energy sources
- [ ] Upgrade rate should be **3000-6000/hr** with full extensions

### Console verification:
```
// Check extensions exist and are filled
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'extension'}).length
// Should return: 5

// Check energy capacity is 550
Game.rooms['E13N53'].energyCapacityAvailable
// Should return: 550

// Check creep body sizes (should be 5-7 parts, NOT 3)
Object.values(Game.creeps).map(c => c.name + ': ' + c.body.length + ' parts')

// Check scout intel
Object.keys(Memory.roomIntel).length
// Should return: 1+ (rooms scouted)
```

### Red flags:
- **Creeps still 3 parts** = spawn manager using energyAvailable instead of energyCapacity. Check `getBody()` is called with `energyCapacity`.
- **Extensions not building** = room planner not running. Check for errors. Run `Game.time % 100` — planner runs when this equals 0.
- **Extensions empty** = harvesters not delivering to them. They should fill spawn + extensions.
- **No scout** = check desired counts in spawn manager for RCL 2+.

---

## RCL 3 (45,000 points)
**Energy Capacity:** 800 (spawn 300 + 10 extensions × 50)

### What should be happening:
- [ ] **5 more extensions** (10 total) auto-placed and being built
- [ ] **First tower** placed and built
- [ ] **Roads** being placed from spawn to sources and controller
- [ ] **1 repairer** spawned
- [ ] **Remote mining started** — remoteMiner + hauler going to best adjacent room
- [ ] **Claim target evaluated** — check console for `🎯 Claim target set to...`
- [ ] Bigger creep bodies (800 energy = 10+ part upgraders)
- [ ] Tower auto-attacking any hostiles
- [ ] Ramparts placed on spawn and tower
- [ ] Upgrade rate should be **8000-15000/hr**

### Console verification:
```
// Check tower exists
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'tower'}).length
// Should return: 1

// Check remote mining is active
Memory.expansion.remoteRooms
// Should return: array with 1 room

// Check claim target
Memory.expansion.claimTarget
// Should return: a room name or null (if still evaluating)

// Check for remote creeps
Object.values(Game.creeps).filter(c => c.memory.role === 'remoteMiner').length
// Should return: 1+
Object.values(Game.creeps).filter(c => c.memory.role === 'hauler').length
// Should return: 1+

// Check roads exist or are being built
Game.rooms['E13N53'].find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === 'road'}).length
// Should return: 1+ (if roads are being placed)
```

### Red flags:
- **No tower** = room planner buildTowers not triggering. Check RCL gate.
- **No remote miners** = expansion manager not assigning remote rooms. Check `Memory.expansion`.
- **No roads** = roads only place every 500 ticks. Wait or check `Game.time % 500`.
- **No repairer** = check desired counts, repairer activates at RCL 3.
- **Claimer spawning but failing** = need 650+ energy for claimer body.

---

## RCL 4 (135,000 points)
**Energy Capacity:** 1,300 (spawn 300 + 20 extensions × 50)

### What should be happening:
- [ ] **10 more extensions** (20 total)
- [ ] **Storage** placed near spawn and being built
- [ ] **3rd harvester** spawned (up from 2)
- [ ] **3 upgraders** (up from 2)
- [ ] **2nd remote mining room** assigned (if available)
- [ ] **Reserver** spawned — `[claim,claim,move,move]` going to remote room (1300 energy exactly)
- [ ] **Claimer** spawned if claim target is set — heading to target room
- [ ] **Pioneers** spawned after room is claimed (4 pioneers)
- [ ] Much bigger creep bodies (1300 energy = massive upgraders)
- [ ] Upgrade rate should be **20000-40000/hr**

### Console verification:
```
// Check storage
Game.rooms['E13N53'].storage
// Should return: a storage object (not undefined)

// Check extension count
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'extension'}).length
// Should return: 20

// Check reserver
Object.values(Game.creeps).filter(c => c.memory.role === 'reserver').length
// Should return: 1 per reserved remote room

// Check claimer/pioneers
Object.values(Game.creeps).filter(c => c.memory.role === 'claimer').length
Object.values(Game.creeps).filter(c => c.memory.role === 'pioneer').length

// Check if 2nd room is claimed
Object.values(Game.rooms).filter(r => r.controller && r.controller.my).length
// Should return: 2 (if claimed)
```

### Red flags:
- **No storage** = room planner not placing at RCL 4. Check buildStorage gate.
- **No reserver** = needs exactly 1300 energy. Verify energyCapacity is 1300.
- **Claimer dying en route** = CLAIM parts have 600 tick TTL. If target room is too far, claimer expires before arriving.
- **Pioneers not building spawn** = check pioneer code places spawn construction site near controller.
- **Upgraders/harvesters still small** = verify getBody uses energyCapacity not energyAvailable.

---

## RCL 5 (405,000 points)
**Energy Capacity:** 1,800 (spawn 300 + 30 extensions × 50)

### What should be happening:
- [ ] **10 more extensions** (30 total)
- [ ] **2nd tower** placed
- [ ] **2 links** placed — 1 near a source, 1 near the controller
- [ ] **Link manager** transferring energy source → controller
- [ ] **Harvesters** dumping energy into source link (not walking to spawn)
- [ ] **Upgraders** withdrawing from controller link (staying near controller)
- [ ] Upgrade rate should **jump significantly** once links are active

### Console verification:
```
// Check links
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'link'}).length
// Should return: 2

// Check link assignments
Game.rooms['E13N53'].memory.links
// Should return: { sources: [id], controller: id, storage: null }

// Check link has energy flowing
Game.getObjectById(Game.rooms['E13N53'].memory.links.controller).store.energy
// Should return: > 0 if links are transferring
```

### Red flags:
- **No links** = room planner buildLinks not triggering. Check RCL 5 gate.
- **Links placed but empty** = link manager not running. Check main.js has `linkManager.run(room)`.
- **Harvesters not using link** = harvester deliver() link check requires RCL 5 AND `room.memory.links` to exist.
- **Upgraders still walking to storage** = upgrader getEnergy() link withdrawal not triggering. Check `room.memory.links.controller` is set.

---

## RCL 6 (1,215,000 points)
**Energy Capacity:** 2,300 (spawn 300 + 40 extensions × 200)

### What should be happening:
- [ ] **10 more extensions** (40 total) — **extensions now hold 200 energy each** (up from 50)
- [ ] **3rd link** placed (storage link)
- [ ] **Extractor** placed on mineral deposit
- [ ] **Container** placed near mineral
- [ ] **Terminal** placed near storage
- [ ] **3 labs** placed in a cluster
- [ ] **Mineral miner** spawned — harvesting the mineral
- [ ] **Lab worker** spawned — shuttling reagents
- [ ] **Market manager** active — creating sell orders for excess minerals
- [ ] Upgraders scale back to 2 (from 3)

### Console verification:
```
// Check extractor
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'extractor'}).length
// Should return: 1

// Check terminal
Game.rooms['E13N53'].terminal
// Should return: terminal object

// Check labs
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'lab'}).length
// Should return: 3

// Check lab assignments
Game.rooms['E13N53'].memory.labs
// Should return: { inputs: [id, id], outputs: [id] }

// Check mineral miner
Object.values(Game.creeps).filter(c => c.memory.role === 'mineralMiner').length
// Should return: 1

// Check market orders
Object.keys(Game.market.orders).length
// Should return: 1+ (if minerals are being sold)
```

### Red flags:
- **No extractor** = buildExtractor not running. Check RCL 6 gate.
- **No terminal** = buildTerminal not placing. Check placeNearSpawn has room.
- **Labs not reacting** = lab manager needs labTarget set. Check `Memory.roomIntel` for available minerals.
- **Mineral miner idle** = mineral might be depleted (regenerates after 50k ticks). Check `Game.rooms['E13N53'].find(FIND_MINERALS)[0].mineralAmount`.
- **No lab worker** = needs 3+ labs built first.

---

## RCL 7 (3,645,000 points)
**Energy Capacity:** 5,600 (spawn 300 + 50 extensions × 200 + spawn2 300)

### What should be happening:
- [ ] **10 more extensions** (50 total)
- [ ] **3rd tower**
- [ ] **4th link**
- [ ] **2nd spawn** unlocked — can place manually or auto-placed
- [ ] **3 more labs** (6 total)
- [ ] Massive creep bodies (5600 energy capacity)
- [ ] Wall/rampart HP target: 1,000,000

### Console verification:
```
// Check spawn count
Game.rooms['E13N53'].find(FIND_MY_SPAWNS).length
// Should return: 2 (if 2nd spawn placed and built)

// Check extension count
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'extension'}).length
// Should return: 50

// Check lab count
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'lab'}).length
// Should return: 6
```

### Red flags:
- **2nd spawn not placed** = room planner doesn't auto-place additional spawns. May need manual placement or code update.
- **Extensions maxing out placement area** = spiral pattern may run out of space at radius 8. Check if extensions are hitting walls.

---

## RCL 8 (10,935,000 points) — MAX LEVEL
**Energy Capacity:** 12,900

### What should be happening:
- [ ] **10 more extensions** (60 total)
- [ ] **6 towers** (max)
- [ ] **6 links** (max)
- [ ] **10 labs** (max)
- [ ] **Observer** unlocked (not auto-built by bot)
- [ ] **Nuker** unlocked (not auto-built by bot)
- [ ] **Power Spawn** unlocked (not auto-built by bot)
- [ ] Wall/rampart HP target: 5,000,000+
- [ ] Maximum size creep bodies

---

## Quick Health Check (run anytime)

Paste this in the console for a full status dump:

```
var r = Game.rooms['E13N53']; var c = r.controller; var s = r.find(FIND_MY_STRUCTURES); 'RCL:' + c.level + ' Progress:' + c.progress + '/' + c.progressTotal + ' Extensions:' + s.filter(x=>x.structureType==='extension').length + ' Towers:' + s.filter(x=>x.structureType==='tower').length + ' Links:' + s.filter(x=>x.structureType==='link').length + ' Labs:' + s.filter(x=>x.structureType==='lab').length + ' Storage:' + (r.storage?'yes':'no') + ' Terminal:' + (r.terminal?'yes':'no') + ' Creeps:' + Object.keys(Game.creeps).length + ' EnergyCap:' + r.energyCapacityAvailable
```

Expected output example:
```
RCL:3 Progress:12000/135000 Extensions:10 Towers:1 Links:0 Labs:0 Storage:no Terminal:no Creeps:8 EnergyCap:800
```

---

## Common Problems

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Tiny creeps at high RCL | getBody using energyAvailable not energyCapacity | Check manager.spawn.js getBody call |
| Extensions not building | Room planner throttled (every 100 ticks) or max 5 sites limit | Wait, or check for errors |
| Extensions empty | Harvesters not delivering | Check harvester deliver() priority |
| Upgraders slow | Walking too far for energy | Check containers/storage/links exist |
| No remote miners | expansion manager not assigning rooms | Check Memory.expansion.remoteRooms |
| Tower not attacking | No hostiles, or tower low energy | Check tower energy level |
| Links not transferring | link manager not running or links not assigned | Check room.memory.links |
| Labs not reacting | No labTarget or input labs empty | Check room.memory.labTarget |
| Progress going down | Normal — controller decay. Net should be positive | Check upgrade rate in stats |
