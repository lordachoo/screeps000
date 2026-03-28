/**
 * Repairers keep structures healthy. Prioritize critical structures first.
 * When nothing needs repair, they act as builders/upgraders.
 */
module.exports = {
    run(creep) {
        if (creep.store.getFreeCapacity() === 0) {
            creep.memory.harvesting = false;
        }
        if (creep.store.getUsedCapacity() === 0) {
            creep.memory.harvesting = true;
        }

        if (creep.memory.harvesting) {
            this.getEnergy(creep);
        } else {
            this.repair(creep);
        }
    },

    getEnergy(creep) {
        const storage = creep.room.storage;
        if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { reusePath: 5 });
            }
            return;
        }

        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         s.store.getUsedCapacity(RESOURCE_ENERGY) > 50
        });
        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 5 });
            }
            return;
        }

        // Pick up dropped energy or tombstones
        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 20
        });
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { reusePath: 5 });
            }
            return;
        }

        const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
        if (tombstone) {
            if (creep.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(tombstone, { reusePath: 5 });
            }
            return;
        }

        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 5 });
        }
    },

    repair(creep) {
        // Find damaged structures, excluding walls/ramparts (they have huge max HP)
        const damaged = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.hits < s.hitsMax &&
                         s.structureType !== STRUCTURE_WALL &&
                         s.structureType !== STRUCTURE_RAMPART
        });

        if (damaged.length > 0) {
            // Repair the most damaged first
            const target = _.min(damaged, s => s.hits / s.hitsMax);
            if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { reusePath: 5, visualizePathStyle: { stroke: '#ff8800' } });
            }
            return;
        }

        // Repair walls/ramparts up to a reasonable threshold
        const wallTarget = this.getWallTarget(creep);
        if (wallTarget) {
            if (creep.repair(wallTarget) === ERR_NOT_IN_RANGE) {
                creep.moveTo(wallTarget, { reusePath: 5, visualizePathStyle: { stroke: '#884400' } });
            }
            return;
        }

        // Nothing to repair — act as builder/upgrader
        const site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (site) {
            if (creep.build(site) === ERR_NOT_IN_RANGE) {
                creep.moveTo(site, { reusePath: 5 });
            }
        } else {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { reusePath: 5 });
            }
        }
    },

    getWallTarget(creep) {
        // Scale wall HP target with RCL
        const rcl = creep.room.controller.level;
        const wallHpTargets = {
            1: 1000, 2: 5000, 3: 25000, 4: 50000,
            5: 100000, 6: 500000, 7: 1000000, 8: 10000000
        };
        const targetHp = wallHpTargets[rcl] || 1000;

        const walls = creep.room.find(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_WALL ||
                          s.structureType === STRUCTURE_RAMPART) &&
                         s.hits < targetHp
        });

        return walls.length > 0 ? _.min(walls, 'hits') : null;
    }
};
