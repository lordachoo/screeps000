/**
 * Spawn manager handles creep population and body composition.
 * Scales creep bodies with available energy capacity.
 */
const expansionManager = require('manager.expansion');

const ROLES = {
    harvester:       { min: 0, priority: 1 },  // Emergency fallback only
    miner:           { min: 0, priority: 2 },
    basehauler:      { min: 0, priority: 3 },
    repairer:        { min: 1, priority: 4 },  // Roads/structures must stay healthy
    upgrader:        { min: 2, priority: 5 },
    builder:         { min: 2, priority: 6 },
    defender:        { min: 0, priority: 7 },
    rangedDefender:  { min: 0, priority: 7 },
    scout:           { min: 0, priority: 8 },
    remoteMiner:     { min: 0, priority: 9 },
    hauler:          { min: 0, priority: 10 },
    reserver:        { min: 0, priority: 11 },
    claimer:         { min: 0, priority: 12 },
    pioneer:         { min: 0, priority: 13 },
    mineralMiner:    { min: 0, priority: 14 },
    labWorker:       { min: 0, priority: 15 },
};

module.exports = {
    run(room) {
        const spawns = room.find(FIND_MY_SPAWNS).filter(s => !s.spawning);
        if (spawns.length === 0) return;

        const spawn = spawns[0];
        const energyAvailable = room.energyAvailable;
        const energyCapacity = room.energyCapacityAvailable;

        // Count creeps by role belonging to this room (using homeRoom memory)
        const counts = {};
        for (const role in ROLES) counts[role] = 0;
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const home = creep.memory.homeRoom || creep.room.name;
            if (home === room.name && counts[creep.memory.role] !== undefined) {
                counts[creep.memory.role]++;
            }
        }

        // Emergency mode: if we have no energy producers at all, spawn a tiny harvester
        if (counts.harvester === 0 && counts.miner === 0) {
            if (energyAvailable >= 200) {
                this.spawnCreep(spawn, 'harvester', [WORK, CARRY, MOVE]);
            }
            return;
        }

        // Adjust desired counts based on RCL and situation
        const desired = this.getDesiredCounts(room, counts);

        // Spawn hostiles check — bump defender count
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0) {
            desired.defender = Math.max(desired.defender, 2);
        }

        // Reduce builders when few/no construction sites
        const sites = room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length <= 1) {
            desired.builder = 1;
        }

        // Sort by priority, spawn the first role that's under count
        const sorted = Object.keys(ROLES).sort((a, b) => ROLES[a].priority - ROLES[b].priority);
        for (const role of sorted) {
            if (counts[role] < (desired[role] || 0)) {
                const body = this.getBody(role, energyCapacity, energyCapacity);
                if (!body) continue; // Can't afford this role yet

                // Wait until we have enough energy to spawn the full-size body
                const bodyCost = this.bodyCost(body);
                if (energyAvailable >= bodyCost) {
                    this.spawnCreep(spawn, role, body, room);
                }
                return;
            }
        }
    },

    getDesiredCounts(room, counts) {
        const rcl = room.controller.level;
        const desired = {};

        // Home economy — static miner + basehauler replaces harvesters
        const homeSources = room.find(FIND_SOURCES);
        desired.harvester = 0; // Emergency fallback only (handled above)
        desired.miner = homeSources.length;
        desired.basehauler = homeSources.length;
        desired.upgrader = rcl >= 6 ? 2 : (rcl >= 4 ? 3 : 2);
        desired.builder = 2;
        desired.repairer = rcl >= 3 ? 1 : 0;
        desired.defender = 0;
        desired.rangedDefender = 0;
        desired.mineralMiner = 0;
        desired.labWorker = 0;

        // Ranged defender at RCL 4+ when hostiles present
        if (rcl >= 4) {
            const hostiles = room.find(FIND_HOSTILE_CREEPS);
            if (hostiles.length > 0) {
                desired.rangedDefender = 1;
            }
        }

        // Mineral miner at RCL 6+ if extractor built and mineral has resources
        if (rcl >= 6) {
            const extractor = room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_EXTRACTOR
            });
            if (extractor.length > 0) {
                const mineral = room.find(FIND_MINERALS)[0];
                if (mineral && mineral.mineralAmount > 0) {
                    desired.mineralMiner = 1;
                }
            }
        }

        // Lab worker at RCL 6+ if 3+ labs built
        if (rcl >= 6) {
            const labs = room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_LAB
            });
            if (labs.length >= 3) {
                desired.labWorker = 1;
            }
        }

        // If we have storage and lots of energy, boost upgraders
        if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 100000) {
            desired.upgrader = Math.min(desired.upgrader + 2, 5);
        }

        // Expansion roles from expansion manager
        const expansionCounts = expansionManager.getDesiredExpansionCreeps(room);
        Object.assign(desired, expansionCounts);

        return desired;
    },

    getBody(role, energy, capacity) {
        switch (role) {
            case 'harvester':
                return this.scaledBody([WORK, CARRY, MOVE], [WORK, CARRY, MOVE], energy, 15);
            case 'upgrader':
                return this.scaledBody([WORK, CARRY, MOVE], [WORK, WORK, CARRY, MOVE], energy, 15);
            case 'builder':
                return this.scaledBody([WORK, CARRY, MOVE], [WORK, CARRY, CARRY, MOVE], energy, 15);
            case 'repairer':
                return this.scaledBody([WORK, CARRY, MOVE], [WORK, CARRY, MOVE], energy, 12);
            case 'defender':
                return this.scaledBody([TOUGH, ATTACK, MOVE, MOVE], [TOUGH, ATTACK, MOVE, MOVE], energy, 20);

            case 'miner':
                // 5 WORK saturates a source at 10 energy/tick
                if (energy >= 800) return [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE];
                if (energy >= 400) return [WORK, WORK, WORK, MOVE, MOVE];
                return null; // Below 400 use emergency harvester instead
            case 'basehauler':
                return this.buildHaulerBody(energy);

            // Expansion roles
            case 'scout':
                return energy >= 50 ? [MOVE] : null;
            case 'remoteMiner':
                // 5 WORK = 10 energy/tick, exactly drains a source. 3 MOVE for road speed.
                if (energy >= 650) return [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE];
                if (energy >= 400) return [WORK, WORK, WORK, MOVE, MOVE];
                return null;
            case 'hauler':
                // 1 WORK for container repair + CARRY/MOVE scaled. Min: WORK + CARRY*2 + MOVE*2 = 250
                if (energy < 250) return null;
                return this.buildHaulerBody(energy);
            case 'reserver':
                // Need exactly 1300 energy for 2 CLAIM + 2 MOVE
                if (energy >= 1300) return [CLAIM, CLAIM, MOVE, MOVE];
                return null;
            case 'claimer':
                // CLAIM + fast MOVE parts
                if (energy >= 850) return [CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE];
                if (energy >= 650) return [CLAIM, MOVE];
                return null;
            case 'pioneer':
                // Small body — just needs to reach the new room and build a spawn
                // Cap at 6 parts (400 energy) so it spawns fast even when energy-starved
                return this.scaledBody([WORK, CARRY, MOVE], [WORK, CARRY, MOVE], energy, 6);

            // Phase 2 roles
            case 'rangedDefender':
                // TOUGH + RANGED_ATTACK + MOVE, with 1 HEAL at end for sustain
                if (energy < 420) return null;
                return this.buildRangedDefenderBody(energy);
            case 'mineralMiner':
                // Same as remoteMiner — 5 WORK to drain mineral
                if (energy >= 650) return [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE];
                if (energy >= 400) return [WORK, WORK, WORK, MOVE, MOVE];
                return null;
            case 'labWorker':
                // Pure CARRY + MOVE shuttle
                if (energy >= 300) return [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
                return null;

            default:
                return [WORK, CARRY, MOVE];
        }
    },

    buildRangedDefenderBody(energy) {
        // Base: TOUGH, RANGED_ATTACK, MOVE, MOVE = 260 + 1 HEAL at end = 510 total min
        // Scale up with extra RANGED_ATTACK + MOVE blocks
        let body = [TOUGH, TOUGH, RANGED_ATTACK, MOVE, MOVE, MOVE];
        let remaining = energy - 420;

        // Add RANGED_ATTACK + MOVE pairs
        while (remaining >= 200 && body.length + 2 <= 18) { // leave room for HEAL
            body.push(RANGED_ATTACK, MOVE);
            remaining -= 200;
        }

        // Add HEAL at the end if affordable
        if (remaining >= 300 && body.length + 2 <= 20) {
            body.push(HEAL, MOVE);
        }

        return body;
    },

    buildHaulerBody(energy) {
        // Start with 1 WORK for repairs, then stack CARRY + MOVE (2:1 ratio for roads)
        let body = [WORK, CARRY, MOVE, MOVE]; // 250 base
        let remaining = energy - 250;
        const extraCost = 150; // CARRY, CARRY, MOVE

        while (remaining >= extraCost && body.length + 3 <= 20) {
            body.push(CARRY, CARRY, MOVE);
            remaining -= extraCost;
        }

        return body;
    },

    /**
     * Build the biggest body we can afford.
     * base: minimum parts. extra: repeated until we hit energy cap or maxParts.
     */
    scaledBody(base, extra, energy, maxParts) {
        const baseCost = this.bodyCost(base);
        if (energy < baseCost) return base;

        let body = [...base];
        let remaining = energy - baseCost;
        const extraCost = this.bodyCost(extra);

        while (remaining >= extraCost && body.length + extra.length <= maxParts) {
            body = body.concat(extra);
            remaining -= extraCost;
        }

        return body;
    },

    bodyCost(parts) {
        const costs = {
            [MOVE]: 50, [WORK]: 100, [CARRY]: 50, [ATTACK]: 80,
            [RANGED_ATTACK]: 150, [HEAL]: 250, [CLAIM]: 600, [TOUGH]: 10
        };
        return parts.reduce((sum, p) => sum + (costs[p] || 0), 0);
    },

    spawnCreep(spawn, role, body, room) {
        const name = role.charAt(0).toUpperCase() + role.slice(1) + '_' + Game.time;
        const memory = { role, harvesting: true, homeRoom: spawn.room.name };

        // Set target room for expansion roles
        if (Memory.expansion) {
            if ((role === 'remoteMiner' || role === 'hauler') && Memory.expansion.remoteRooms) {
                const assignment = this.assignRemoteTarget(role, spawn.room.name);
                if (assignment) {
                    memory.targetRoom = assignment.room;
                    memory.sourceId = assignment.sourceId;
                }
            }
            if (role === 'reserver' && Memory.expansion.remoteRooms) {
                const unassigned = this.findUnreservedRoom(spawn.room.name);
                if (unassigned) memory.targetRoom = unassigned;
            }
            if ((role === 'claimer' || role === 'pioneer') && Memory.expansion.claimTarget) {
                memory.targetRoom = Memory.expansion.claimTarget;
            }
        }

        const result = spawn.spawnCreep(body, name, { memory });
        if (result === OK) {
            console.log(`🟢 ${spawn.room.name}: Spawning ${name} [${body}]`);
        }
    },

    assignRemoteTarget(role, homeRoomName) {
        if (!Memory.expansion || !Memory.expansion.remoteRooms) return null;

        // Find which remote source has fewest assigned creeps of this role
        let bestRoom = null;
        let bestSource = null;
        let lowestCount = Infinity;

        for (const remote of Memory.expansion.remoteRooms) {
            for (const sourceId of remote.sources) {
                const count = _.filter(Game.creeps, c =>
                    c.memory.role === role &&
                    c.memory.homeRoom === homeRoomName &&
                    c.memory.sourceId === sourceId
                ).length;

                if (count < lowestCount) {
                    lowestCount = count;
                    bestRoom = remote.name;
                    bestSource = sourceId;
                }
            }
        }

        return bestRoom ? { room: bestRoom, sourceId: bestSource } : null;
    },

    findUnreservedRoom(homeRoomName) {
        if (!Memory.expansion || !Memory.expansion.remoteRooms) return null;

        for (const remote of Memory.expansion.remoteRooms) {
            if (!remote.reserved) continue;
            const existing = _.filter(Game.creeps, c =>
                c.memory.role === 'reserver' &&
                c.memory.homeRoom === homeRoomName &&
                c.memory.targetRoom === remote.name
            );
            if (existing.length === 0) return remote.name;
        }
        return null;
    }
};
