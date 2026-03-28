/**
 * Spawn manager handles creep population and body composition.
 * Scales creep bodies with available energy capacity.
 */
const ROLES = {
    harvester:  { min: 2, priority: 1 },
    upgrader:   { min: 2, priority: 3 },
    builder:    { min: 2, priority: 4 },
    repairer:   { min: 1, priority: 5 },
    defender:   { min: 0, priority: 6 },
};

module.exports = {
    run(room) {
        const spawns = room.find(FIND_MY_SPAWNS).filter(s => !s.spawning);
        if (spawns.length === 0) return;

        const spawn = spawns[0];
        const energyAvailable = room.energyAvailable;
        const energyCapacity = room.energyCapacityAvailable;

        // Count creeps by role in this room
        const counts = {};
        for (const role in ROLES) counts[role] = 0;
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.room.name === room.name && counts[creep.memory.role] !== undefined) {
                counts[creep.memory.role]++;
            }
        }

        // Emergency mode: if we have 0 harvesters, spawn a tiny one immediately
        if (counts.harvester === 0) {
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

        // Reduce builders when no construction sites
        const sites = room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length === 0) {
            desired.builder = 1;
        }

        // Sort by priority, spawn the first role that's under count
        const sorted = Object.keys(ROLES).sort((a, b) => ROLES[a].priority - ROLES[b].priority);
        for (const role of sorted) {
            if (counts[role] < desired[role]) {
                // Only spawn if we have at least 80% energy capacity (unless emergency)
                if (energyAvailable >= Math.min(energyCapacity * 0.8, 300)) {
                    const body = this.getBody(role, energyAvailable);
                    this.spawnCreep(spawn, role, body);
                }
                return;
            }
        }
    },

    getDesiredCounts(room, counts) {
        const rcl = room.controller.level;
        const desired = {};

        desired.harvester = rcl >= 4 ? 3 : 2;
        desired.upgrader = rcl >= 6 ? 2 : (rcl >= 4 ? 3 : 2);
        desired.builder = 2;
        desired.repairer = rcl >= 3 ? 1 : 0;
        desired.defender = 0;

        // If we have storage and lots of energy, boost upgraders
        if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 100000) {
            desired.upgrader = Math.min(desired.upgrader + 2, 5);
        }

        return desired;
    },

    getBody(role, energy) {
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
            default:
                return [WORK, CARRY, MOVE];
        }
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

        // Sort: TOUGH first, WORK, CARRY, MOVE, ATTACK last (move last gets hit first = bad)
        // Actually keep MOVE spread throughout for fatigue management
        return body;
    },

    bodyCost(parts) {
        const costs = {
            [MOVE]: 50, [WORK]: 100, [CARRY]: 50, [ATTACK]: 80,
            [RANGED_ATTACK]: 150, [HEAL]: 250, [CLAIM]: 600, [TOUGH]: 10
        };
        return parts.reduce((sum, p) => sum + (costs[p] || 0), 0);
    },

    spawnCreep(spawn, role, body) {
        const name = role.charAt(0).toUpperCase() + role.slice(1) + '_' + Game.time;
        const result = spawn.spawnCreep(body, name, { memory: { role, harvesting: true } });
        if (result === OK) {
            console.log(`🟢 ${spawn.room.name}: Spawning ${name} [${body}]`);
        }
    }
};
