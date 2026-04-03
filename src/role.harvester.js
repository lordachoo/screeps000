/**
 * Harvesters mine energy and deliver it to spawn/extensions/towers/storage.
 * They use a simple state machine: harvesting or delivering.
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
            this.harvest(creep);
        } else {
            this.deliver(creep);
        }
    },

    harvest(creep) {
        // Tombstones first — hold the most energy and decay fast
        const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 20
        });
        if (tombstone) {
            if (creep.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(tombstone, { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // Then dropped energy on the ground
        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 20
        });
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // Pull from links (fastest fill)
        const link = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LINK &&
                         s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
        if (link) {
            if (creep.withdraw(link, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(link, { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // Pull from containers
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         s.store.getUsedCapacity(RESOURCE_ENERGY) > 50
        });
        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // Prefer assigned source to spread miners across sources
        let source;
        if (creep.memory.sourceId) {
            source = Game.getObjectById(creep.memory.sourceId);
        }
        if (!source) {
            const sources = creep.room.find(FIND_SOURCES_ACTIVE);
            // Pick least-targeted source
            source = _.min(sources, s => {
                return _.filter(Game.creeps, c =>
                    c.memory.sourceId === s.id && c.id !== creep.id
                ).length;
            });
            if (source) creep.memory.sourceId = source.id;
        }

        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
        }
    },

    deliver(creep) {
        // Priority: spawn/extensions > towers (below 80%) > storage
        let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                          s.structureType === STRUCTURE_EXTENSION) &&
                         s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (!target) {
            target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER &&
                             s.store.getFreeCapacity(RESOURCE_ENERGY) > 200
            });
        }

        if (!target) {
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_STORAGE &&
                             s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
        }

        // If nothing needs energy, act as upgrader
        if (!target) {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { reusePath: 5 });
            }
            return;
        }

        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { reusePath: 5, visualizePathStyle: { stroke: '#ffffff' } });
        }
    }
};
