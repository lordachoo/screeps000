/**
 * Builders construct new buildings from construction sites.
 * When no sites exist, they act as upgraders to not waste CPU.
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
            this.build(creep);
        }
    },

    getEnergy(creep) {
        // Prefer storage/containers, fall back to sources
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
            creep.moveTo(source, { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
        }
    },

    build(creep) {
        const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length === 0) {
            // Nothing to build — upgrade instead
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { reusePath: 5 });
            }
            return;
        }

        // Prioritize critical infrastructure
        const priority = [STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_EXTENSION,
                          STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART];
        let target;
        for (const type of priority) {
            target = _.find(sites, s => s.structureType === type);
            if (target) break;
        }
        if (!target) target = sites[0];

        if (creep.build(target) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { reusePath: 5, visualizePathStyle: { stroke: '#33ff33' } });
        }
    }
};
