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
        // At RCL 5+, dump into nearby source link if available
        if (creep.room.controller.level >= 5 && creep.room.memory.links) {
            const linkIds = creep.room.memory.links.sources || [];
            for (const linkId of linkIds) {
                const link = Game.getObjectById(linkId);
                if (link && creep.pos.getRangeTo(link) <= 1 &&
                    link.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    creep.transfer(link, RESOURCE_ENERGY);
                    return;
                }
            }
        }

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
