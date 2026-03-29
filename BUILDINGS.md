# Buildings Reference

Detailed breakdown of every structure in the bot, what it does, when it unlocks, and how to verify it's working.

---

## Spawn

**Unlocks:** RCL 1 (you start with one)
**Max:** RCL 1-6: 1 | RCL 7: 2 | RCL 8: 3
**Energy storage:** 300

The most critical structure in your room. If your spawn dies, you can't make new creeps. Everything else exists to protect and feed it.

### What it does
- Produces creeps from a body part list + energy
- Renews creeps (extends TTL) when they walk up to it
- Stores 300 energy that creeps can withdraw from

### Strategy
- Harvesters prioritize filling the spawn first before anything else
- Ramparts are auto-placed on top of spawns for protection
- Safe mode auto-activates if spawn drops below 50% HP or 3+ hostiles are nearby
- At RCL 7+, 2nd spawn means you can queue two creeps simultaneously — huge boost during rebuilds

### Console
```js
// Spawn status
Game.rooms['E13N53'].find(FIND_MY_SPAWNS)

// What's currently spawning
Game.rooms['E13N53'].find(FIND_MY_SPAWNS).map(s => s.spawning)

// Spawn energy
Game.rooms['E13N53'].find(FIND_MY_SPAWNS)[0].store.getUsedCapacity(RESOURCE_ENERGY)
```

---

## Extension

**Unlocks:** RCL 2
**Max:** RCL2: 5 | RCL3: 10 | RCL4: 20 | RCL5: 30 | RCL6: 40 | RCL7: 50 | RCL8: 60
**Energy storage:** RCL 1-6: 50 each | RCL 7-8: 200 each

Extensions are the single biggest lever for creep size. Every extension adds to your `energyCapacityAvailable`, which is what the spawn uses to build the largest body it can afford.

### What it does
- Stores energy that counts toward spawning capacity
- A creep spawn drains spawn + all extensions simultaneously to pay for the body

### Strategy
- Placed in a checkerboard pattern so creeps can always path through
- Harvesters fill spawn first, then extensions, then towers, then storage
- Going from RCL 2 (550 cap) to RCL 3 (800 cap) to RCL 4 (1300 cap) unlocks dramatically bigger creep bodies
- At RCL 7-8 each extension holds 200 instead of 50 — capacity jumps from 1800 to 5600

### Console
```js
// Count extensions
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'extension'}).length

// Total energy capacity (spawn + all extensions)
Game.rooms['E13N53'].energyCapacityAvailable

// Energy currently available to spawn
Game.rooms['E13N53'].energyAvailable
```

---

## Tower

**Unlocks:** RCL 3
**Max:** RCL3-4: 1 | RCL5-6: 2 | RCL7: 3 | RCL8: 6
**Energy storage:** 1000
**Range:** Entire room (50×50), damage falls off with distance

Towers are your automated defense. They attack, heal, and repair without any creep action. At full energy and point-blank range a tower deals 600 damage/tick — enough to shred most solo attackers.

### What it does
- **Attack:** Damages hostile creeps (600 dmg at close range, 150 at max range)
- **Heal:** Heals friendly creeps (400 HP at close range, 100 at max range)
- **Repair:** Repairs any structure in the room (800 HP at close range, 200 at max range)

### Strategy
- All towers **focus-fire the same target** — healers die first (scored: heal×3 + ranged×2 + attack×1)
- Auto safe mode triggers if spawn is at <50% HP or 3+ hostiles near spawn
- Towers only repair structures when they have >70% energy — defense always comes first
- Repair priority: non-wall structures first, then walls/ramparts up to RCL-scaled HP threshold
- Keep towers fed — harvesters deliver to towers after filling spawn/extensions

### Console
```js
// Tower count and energy levels
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'tower'}).map(t => ({id: t.id, energy: t.store.getUsedCapacity(RESOURCE_ENERGY)}))

// Current hostiles in room
Game.rooms['E13N53'].find(FIND_HOSTILE_CREEPS).length

// Safe mode status
Game.rooms['E13N53'].controller.safeMode          // ticks remaining
Game.rooms['E13N53'].controller.safeModeAvailable  // charges left
Game.rooms['E13N53'].controller.safeModeCooldown   // cooldown ticks

// Manually activate safe mode
Game.rooms['E13N53'].controller.activateSafeMode()
```

---

## Container

**Unlocks:** RCL 1 (no RCL requirement, just energy)
**Max:** 5
**Energy storage:** 2000
**Decay:** Loses 5000 hits every ~100 ticks without repair

Containers are the energy highway before storage exists. They sit next to sources and collect energy that drops from mining creeps.

### What it does
- Stores any resource (energy, minerals)
- Decays over time — haulers use their 1 WORK part to repair them
- When a creep mines on top of a container, dropped energy lands directly in it

### Strategy
- Placed adjacent to each energy source at RCL 2
- Remote miners park on top of the container — energy drops straight in
- Haulers shuttle from remote containers back to home storage
- Also placed near the mineral at RCL 6 for the mineral miner
- Containers in home room become less important once storage exists (RCL 4)

### Console
```js
// All containers and their energy levels
Game.rooms['E13N53'].find(FIND_STRUCTURES, {filter: s => s.structureType === 'container'}).map(c => ({pos: c.pos, energy: c.store.getUsedCapacity(RESOURCE_ENERGY), hits: c.hits}))

// Remote room containers
Game.rooms['E12N53'] && Game.rooms['E12N53'].find(FIND_STRUCTURES, {filter: s => s.structureType === 'container'})
```

---

## Road

**Unlocks:** RCL 3 (auto-placed every 500 ticks)
**Decay:** Loses hits over time on plains/swamp

Roads cut movement cost in half — a creep on a road only needs 1 MOVE part to move every tick on any terrain.

### What it does
- Reduces movement energy cost from 2:1 to 1:1 (half as many MOVE parts needed)
- Roads on swamps are even more valuable (swamp normally costs 5× move)

### Strategy
- Auto-placed along paths: spawn → sources, spawn → controller
- Low build priority — extensions/towers/storage come first
- Biggest payoff for haulers making constant long-distance trips
- Don't worry about roads early — they're nice-to-have, not critical

### Console
```js
// Road construction sites pending
Game.rooms['E13N53'].find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === 'road'}).length

// Built roads
Game.rooms['E13N53'].find(FIND_STRUCTURES, {filter: s => s.structureType === 'road'}).length
```

---

## Storage

**Unlocks:** RCL 4
**Max:** 1
**Energy storage:** 1,000,000

Storage is a game changer. Before storage, energy is consumed the moment it's produced. After storage, you can bank hundreds of thousands of energy and spend it efficiently.

### What it does
- Stores up to 1 million of any resource
- Harvesters deliver here once spawn/extensions/towers are full
- Acts as the main energy bank for upgraders, builders, repairers

### Strategy
- Once storage has >100k energy, upgrader count auto-bumps by 2 (up to 5 total)
- Remote haulers deliver to storage
- Terminal draws from storage for market and cross-room sends (RCL 6)
- Keep storage above 50k — below that the bot considers the room "in deficit" for logistics balancing

### Console
```js
// Storage energy
Game.rooms['E13N53'].storage.store.getUsedCapacity(RESOURCE_ENERGY)

// All resources in storage
JSON.stringify(Game.rooms['E13N53'].storage.store)

// Storage free capacity
Game.rooms['E13N53'].storage.store.getFreeCapacity()
```

---

## Rampart

**Unlocks:** RCL 3 (auto-placed on critical structures)
**Max:** Unlimited
**HP:** Scales with RCL — starts at 300k max, caps at 300M at RCL 8

Ramparts sit on top of other structures or walkable tiles and absorb all incoming damage before the structure underneath takes any.

### What it does
- Shields anything underneath it — hostile creeps attack the rampart, not the structure
- Friendly creeps can walk through ramparts (enemies cannot enter your ramparts)
- Decays 300 HP/tick — repairers keep them topped up

### Strategy
- Auto-placed on: spawns, storage, terminal, towers, links
- HP targets scale with RCL: `{ 1: 1000, 2: 5000, 3: 25000, 4: 50000, 5: 100000, 6: 500000, 7: 1000000, 8: 5000000 }`
- Tower repairs ramparts when above 70% energy
- Repairers focus on ramparts/walls after other structures are healthy

### Console
```js
// All ramparts and their HP
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'rampart'}).map(r => ({pos: r.pos, hits: r.hits}))

// Lowest HP rampart
_.min(Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'rampart'}), 'hits')
```

---

## Link

**Unlocks:** RCL 5
**Max:** RCL5: 2 | RCL6: 3 | RCL7: 4 | RCL8: 6
**Energy storage:** 800
**Transfer loss:** 3% energy lost per transfer

Links teleport energy instantly across the room. This eliminates walking entirely for the home energy loop.

### What it does
- `transferEnergy(targetLink)` sends energy to another link instantly (no travel time)
- Cooldown based on linear distance between links
- 3% energy is lost on every transfer

### Strategy
- **Source links:** Placed within range 2 of each energy source. Harvesters dump energy here instead of walking to spawn.
- **Controller link:** Placed within range 4 of controller. Upgraders park here permanently and withdraw — never walk for energy again.
- **Storage link (RCL 6+):** Placed near storage. Overflow energy routes here.
- Transfer priority: source → controller link first, then storage link
- Massive efficiency gain — upgraders go from spending 50% of time walking to 0%

### Console
```js
// Link assignments
Game.rooms['E13N53'].memory.links

// Energy in controller link (should be > 0 if working)
Game.getObjectById(Game.rooms['E13N53'].memory.links.controller).store.energy

// All links
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'link'}).map(l => ({id: l.id, energy: l.store.getUsedCapacity(RESOURCE_ENERGY), cooldown: l.cooldown}))

// Force link reassignment
delete Game.rooms['E13N53'].memory.links
```

---

## Extractor

**Unlocks:** RCL 6
**Max:** 1 (placed on the room's mineral deposit)

Extractors enable harvesting the room's mineral deposit. Every room has exactly one mineral of a random type (H, O, U, K, L, Z, X, or G).

### What it does
- Allows `harvest()` on the mineral deposit
- Mineral depletes and regenerates after ~50,000 ticks (about 1-2 days)

### Strategy
- Auto-placed on the mineral tile at RCL 6
- Mineral miner parks on the adjacent container and harvests
- Minerals feed the lab reaction chain — don't sell everything

### Console
```js
// Extractor exists?
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'extractor'}).length

// Mineral deposit info
Game.rooms['E13N53'].find(FIND_MINERALS)[0]

// Mineral type and amount
var m = Game.rooms['E13N53'].find(FIND_MINERALS)[0]; m.mineralType + ': ' + m.mineralAmount
```

---

## Terminal

**Unlocks:** RCL 6
**Max:** 1
**Storage:** 300,000 (any resources)

The terminal connects you to the global market and enables resource transfers between your own rooms.

### What it does
- **Send:** Transfer resources to another room's terminal instantly (costs energy proportional to distance)
- **Buy/Sell:** Create market orders or deal directly with other players
- Required for cross-room logistics balancing

### Strategy
- Auto-placed near storage at RCL 6
- Market manager auto-creates sell orders for minerals over 5000 in terminal
- Logistics manager uses terminal to balance energy between your rooms (>200k surplus → <50k deficit)
- Keep some energy in terminal to cover transfer costs

### Console
```js
// Terminal contents
JSON.stringify(Game.rooms['E13N53'].terminal.store)

// Terminal cooldown (1 tick after each send)
Game.rooms['E13N53'].terminal.cooldown

// Active market orders
Object.values(Game.market.orders)

// Market history for your mineral type
var m = Game.rooms['E13N53'].find(FIND_MINERALS)[0]; Game.market.getHistory(m.mineralType)

// Manually send resources to another room
Game.rooms['E13N53'].terminal.send(RESOURCE_ENERGY, 10000, 'E15N53')
```

---

## Lab

**Unlocks:** RCL 6
**Max:** RCL6: 3 | RCL7: 6 | RCL8: 10
**Storage:** 3000 minerals + 2000 energy each

Labs combine minerals into compounds that can boost creep body parts (e.g. 2× WORK output, 4× HEAL effectiveness).

### What it does
- **Input labs (2):** Hold the two reagents for a reaction
- **Output labs (N):** Call `runReaction(input1, input2)` every 10 ticks to produce compound
- Compounds stack into higher-tier boosts through multiple reaction steps

### Strategy
- Labs placed in a cluster — output labs must be within range 2 of both input labs
- Production priority: XGH2O (upgrade boost) → XLHO2 (heal) → XKHO2 (ranged) → XGHO2 (tough) → XUHO2 (harvest)
- Lab worker shuttles reagents from storage/terminal → input labs, empties output labs
- Boosted upgraders with XGH2O can upgrade the controller 2× faster — huge for RCL 7→8

### Console
```js
// Lab assignments
Game.rooms['E13N53'].memory.labs

// Current production target
Game.rooms['E13N53'].memory.labTarget

// Lab contents
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'lab'}).map(l => ({id: l.id, mineral: l.mineralType, amount: l.store.getUsedCapacity(l.mineralType)}))

// Force lab reassignment
delete Game.rooms['E13N53'].memory.labs
delete Game.rooms['E13N53'].memory.labTarget
```

---

## Wall

**Unlocks:** RCL 2 (via construction site)
**Max:** Unlimited
**Max HP:** 300,000,000

Walls are pure damage sponges. They block movement entirely for all creeps (including yours — plan placement carefully).

### What it does
- Impassable barrier — no creep can walk through
- Starts at 1 HP when built, must be repaired up to the target threshold
- Never decays (unlike ramparts)

### Strategy
- Not auto-placed by this bot (too room-specific to automate safely)
- Place manually to funnel attackers
- Repairer and tower maintain walls up to RCL-scaled HP targets
- Wall HP targets: `{ 3: 25000, 4: 50000, 5: 100000, 6: 500000, 7: 1000000, 8: 5000000 }`

### Console
```js
// All walls and their HP
Game.rooms['E13N53'].find(FIND_STRUCTURES, {filter: s => s.structureType === 'constructedWall'}).map(w => ({pos: w.pos, hits: w.hits}))

// Lowest HP wall
_.min(Game.rooms['E13N53'].find(FIND_STRUCTURES, {filter: s => s.structureType === 'constructedWall'}), 'hits')
```

---

## Controller

**Not buildable** — exists in every room naturally

The controller is what you own. If its downgrade timer hits 0, you lose the room. Upgrading it unlocks new structures and increases energy capacity.

### What it does
- Level 1-8 unlocks new structures and extension counts
- Downgrade timer: 20,000 ticks at RCL 1, up to 50,000 ticks at RCL 8
- Attacking enemy controllers (with a CLAIM part) degrades their progress

### Strategy
- Always keep upgraders running — the downgrade timer is brutal if ignored
- Links near the controller let upgraders park permanently (biggest efficiency gain in the game)
- At RCL 8 the controller is fully upgraded — upgrading still generates GCL progress

### Console
```js
// Controller level and progress
var c = Game.rooms['E13N53'].controller
c.level + ' | ' + c.progress + '/' + c.progressTotal + ' (' + (c.progress/c.progressTotal*100).toFixed(1) + '%)'

// Downgrade timer (ticks until you lose the room if no one upgrades)
Game.rooms['E13N53'].controller.ticksToDowngrade

// Safe mode info
Game.rooms['E13N53'].controller.safeModeAvailable
```
