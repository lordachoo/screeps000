# Screeps Console Command Cheatsheet

Quick reference for in-game console commands. All examples use room `E13N53` — swap for your current room.

---

## Room Status

```js
// Full health check — paste this anytime for a one-liner summary
var r = Game.rooms['E13N53']; var c = r.controller; var s = r.find(FIND_MY_STRUCTURES); 'RCL:' + c.level + ' Progress:' + c.progress + '/' + c.progressTotal + ' Extensions:' + s.filter(x=>x.structureType==='extension').length + ' Towers:' + s.filter(x=>x.structureType==='tower').length + ' Links:' + s.filter(x=>x.structureType==='link').length + ' Labs:' + s.filter(x=>x.structureType==='lab').length + ' Storage:' + (r.storage?'yes':'no') + ' Terminal:' + (r.terminal?'yes':'no') + ' Creeps:' + Object.keys(Game.creeps).length + ' EnergyCap:' + r.energyCapacityAvailable

// RCL level and progress
Game.rooms['E13N53'].controller.level
Game.rooms['E13N53'].controller.progress
Game.rooms['E13N53'].controller.progressTotal

// Energy available right now vs max capacity
Game.rooms['E13N53'].energyAvailable
Game.rooms['E13N53'].energyCapacityAvailable

// Storage energy
Game.rooms['E13N53'].storage.store.getUsedCapacity(RESOURCE_ENERGY)

// GCL (how many rooms you can own)
Game.gcl.level
Game.gcl.progress
Game.gcl.progressTotal
```

---

## Creep Counts & Roles

```js
// All creeps with their roles
Object.values(Game.creeps).map(c => c.name + ': ' + c.memory.role)

// Count by role
_.countBy(Game.creeps, c => c.memory.role)

// Creep body sizes (number of parts)
Object.values(Game.creeps).map(c => c.name + ': ' + c.body.length + ' parts')

// Specific role counts
Object.values(Game.creeps).filter(c => c.memory.role === 'harvester').length
Object.values(Game.creeps).filter(c => c.memory.role === 'upgrader').length
Object.values(Game.creeps).filter(c => c.memory.role === 'builder').length
Object.values(Game.creeps).filter(c => c.memory.role === 'repairer').length
Object.values(Game.creeps).filter(c => c.memory.role === 'remoteMiner').length
Object.values(Game.creeps).filter(c => c.memory.role === 'hauler').length
Object.values(Game.creeps).filter(c => c.memory.role === 'reserver').length
Object.values(Game.creeps).filter(c => c.memory.role === 'claimer').length
Object.values(Game.creeps).filter(c => c.memory.role === 'pioneer').length
Object.values(Game.creeps).filter(c => c.memory.role === 'scout').length

// Hauler status (room + carry amount)
Object.values(Game.creeps).filter(c => c.memory.role === 'hauler').map(c => ({
  name: c.name,
  room: c.room.name,
  carry: c.store.getUsedCapacity(RESOURCE_ENERGY)
}))
```

---

## Structures

```js
// Extension count
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'extension'}).length

// Tower count
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'tower'}).length

// Link count
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'link'}).length

// Lab count
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'lab'}).length

// Spawn count (useful at RCL 7+)
Game.rooms['E13N53'].find(FIND_MY_SPAWNS).length

// Extractor
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'extractor'}).length

// Storage object
Game.rooms['E13N53'].storage

// Terminal object
Game.rooms['E13N53'].terminal

// All construction sites and their types
Game.rooms['E13N53'].find(FIND_CONSTRUCTION_SITES).map(s => s.structureType)

// Road construction sites specifically
Game.rooms['E13N53'].find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === 'road'}).length
```

---

## Expansion & Remote Mining

```js
// Full expansion memory dump
JSON.stringify(Memory.expansion)

// Remote rooms assigned
Memory.expansion.remoteRooms

// Current claim target
Memory.expansion.claimTarget

// Manually set a claim target (if auto-eval didn't pick the right one)
Memory.expansion.claimTarget = 'E12N53'

// Clear claim target (stops claimer from spawning)
Memory.expansion.claimTarget = null

// All owned rooms
Object.values(Game.rooms).filter(r => r.controller && r.controller.my).map(r => r.name)

// How many rooms you own vs GCL
Object.values(Game.rooms).filter(r => r.controller && r.controller.my).length + ' / ' + Game.gcl.level
```

---

## Scout & Room Intel

```js
// All scouted rooms
Object.keys(Memory.roomIntel)

// Number of rooms scouted
Object.keys(Memory.roomIntel).length

// Intel on a specific room
Memory.roomIntel['E12N53']

// Scout blacklist (rooms the scout gave up on)
Memory.scoutBlacklist

// Clear the blacklist (lets scout retry blocked rooms)
Memory.scoutBlacklist = {}

// Rooms with 2+ sources (good claim candidates)
Object.entries(Memory.roomIntel).filter(([name, intel]) => intel.sources && intel.sources.length >= 2).map(([name]) => name)
```

---

## Links (RCL 5+)

```js
// Link assignments
Game.rooms['E13N53'].memory.links

// Energy in controller link (should be > 0 if links are working)
Game.getObjectById(Game.rooms['E13N53'].memory.links.controller).store.energy

// Force link reassignment (runs automatically every 500 ticks, but you can force it)
delete Game.rooms['E13N53'].memory.links
```

---

## Labs (RCL 6+)

```js
// Lab assignments (inputs/outputs)
Game.rooms['E13N53'].memory.labs

// Current production target
Game.rooms['E13N53'].memory.labTarget

// Lab contents
Game.rooms['E13N53'].find(FIND_MY_STRUCTURES, {filter: s => s.structureType === 'lab'}).map(l => ({id: l.id, mineral: l.mineralType, amount: l.store.getUsedCapacity(l.mineralType)}))

// Force lab reassignment
delete Game.rooms['E13N53'].memory.labs
```

---

## Minerals & Terminal

```js
// Mineral deposit info (type + amount remaining)
Game.rooms['E13N53'].find(FIND_MINERALS)[0]

// Terminal contents
Game.rooms['E13N53'].terminal.store

// Storage contents (all resources)
Game.rooms['E13N53'].storage.store

// Active market orders
Object.values(Game.market.orders)

// Market history for a resource
Game.market.getHistory(RESOURCE_HYDROGEN)
```

---

## Memory & Debug

```js
// Full memory dump (be careful — can be large)
JSON.stringify(Memory.expansion)

// Room stats (upgrade rate tracking)
Memory.stats

// CPU usage this tick
Game.cpu.getUsed()

// CPU bucket (how much banked CPU you have, max 10000)
Game.cpu.bucket

// Game time (current tick)
Game.time

// Your username (cached after first run)
Memory.username

// Force stats report now (normally runs every 100 ticks)
delete Memory.stats
```

---

## Emergency / Fixes

```js
// Kill a specific creep (if it's stuck or bugged)
Game.creeps['CreepName'].suicide()

// Manually activate safe mode
Game.rooms['E13N53'].controller.activateSafeMode()

// Check safe mode status
Game.rooms['E13N53'].controller.safeMode          // ticks remaining (undefined if inactive)
Game.rooms['E13N53'].controller.safeModeAvailable  // how many charges left
Game.rooms['E13N53'].controller.safeModeCooldown   // ticks until you can use it again

// Nuke all construction sites in a room (use carefully)
Game.rooms['E13N53'].find(FIND_CONSTRUCTION_SITES).forEach(s => s.remove())

// Check for hostile creeps
Game.rooms['E13N53'].find(FIND_HOSTILE_CREEPS).map(c => ({name: c.name, owner: c.owner.username, parts: c.body.map(b => b.type)}))

// Reset remote room assignments (forces re-evaluation next tick)
Memory.expansion.remoteRooms = []
```
