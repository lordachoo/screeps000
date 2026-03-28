/**
 * Tower manager handles automated tower behavior.
 * Priority: attack hostiles > heal friendlies > repair structures.
 * All towers focus-fire the same target (healers first).
 * Auto-triggers safe mode if spawn is critically threatened.
 */
module.exports = {
    run(room) {
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });

        if (towers.length === 0) return;

        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const damagedCreeps = room.find(FIND_MY_CREEPS, {
            filter: c => c.hits < c.hitsMax
        });

        // Auto safe mode check
        if (hostiles.length > 0) {
            this.checkSafeMode(room, hostiles);
        }

        // Focus fire: all towers attack the same best target
        const focusTarget = hostiles.length > 0 ? this.pickBestTarget(towers, hostiles) : null;

        for (const tower of towers) {
            // Priority 1: Attack hostiles (focus fire)
            if (focusTarget) {
                tower.attack(focusTarget);
                continue;
            }

            // Priority 2: Heal damaged friendly creeps
            if (damagedCreeps.length > 0) {
                tower.heal(damagedCreeps[0]);
                continue;
            }

            // Priority 3: Repair damaged structures (only if tower has good energy)
            if (tower.store.getUsedCapacity(RESOURCE_ENERGY) > tower.store.getCapacity(RESOURCE_ENERGY) * 0.7) {
                this.repairStructure(tower, room);
            }
        }
    },

    /**
     * Score hostiles and pick the best focus-fire target.
     * Healers die first — they sustain attacks.
     */
    pickBestTarget(towers, hostiles) {
        // Use the first tower's position for distance calculation
        const refPos = towers[0].pos;

        return _.max(hostiles, h => {
            const distance = refPos.getRangeTo(h);
            return h.getActiveBodyparts(HEAL) * 3 +
                   h.getActiveBodyparts(RANGED_ATTACK) * 2 +
                   h.getActiveBodyparts(ATTACK) * 1 -
                   distance * 0.5;
        });
    },

    /**
     * Auto-activate safe mode if spawn is critically threatened.
     */
    checkSafeMode(room, hostiles) {
        const controller = room.controller;
        if (!controller) return;
        if (controller.safeModeCooldown > 0) return;
        if (controller.safeModeAvailable <= 0) return;

        // Check if any spawn is under direct threat
        const spawns = room.find(FIND_MY_SPAWNS);
        for (const spawn of spawns) {
            // Spawn at less than 50% HP
            if (spawn.hits < spawn.hitsMax * 0.5) {
                controller.activateSafeMode();
                console.log(`🛡️ ${room.name}: SAFE MODE ACTIVATED — spawn under attack!`);
                return;
            }

            // 3+ hostiles within range 5 of spawn
            const nearbyHostiles = spawn.pos.findInRange(hostiles, 5);
            if (nearbyHostiles.length >= 3) {
                controller.activateSafeMode();
                console.log(`🛡️ ${room.name}: SAFE MODE ACTIVATED — ${nearbyHostiles.length} hostiles near spawn!`);
                return;
            }
        }
    },

    repairStructure(tower, room) {
        // Repair non-wall structures first
        const damaged = room.find(FIND_STRUCTURES, {
            filter: s => s.hits < s.hitsMax * 0.8 &&
                         s.structureType !== STRUCTURE_WALL &&
                         s.structureType !== STRUCTURE_RAMPART
        });

        if (damaged.length > 0) {
            const target = _.min(damaged, s => s.hits / s.hitsMax);
            tower.repair(target);
            return;
        }

        // Then repair walls/ramparts up to a threshold
        const rcl = room.controller.level;
        const wallHpTarget = { 1: 1000, 2: 5000, 3: 25000, 4: 50000, 5: 100000, 6: 500000, 7: 1000000, 8: 5000000 };
        const threshold = wallHpTarget[rcl] || 1000;

        const walls = room.find(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_WALL ||
                          s.structureType === STRUCTURE_RAMPART) &&
                         s.hits < threshold
        });

        if (walls.length > 0) {
            tower.repair(_.min(walls, 'hits'));
        }
    }
};
