/**
 * Tower manager handles automated tower behavior.
 * Priority: attack hostiles > heal friendlies > repair structures.
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

        for (const tower of towers) {
            // Priority 1: Attack hostiles
            if (hostiles.length > 0) {
                // Target closest hostile for maximum damage
                const target = tower.pos.findClosestByRange(hostiles);
                tower.attack(target);
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
