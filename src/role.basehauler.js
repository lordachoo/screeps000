/**
 * Basehauler — collects energy from home containers and delivers to spawn/extensions/towers/storage.
 * Has 1 WORK part to repair containers. Replaces harvesters for home energy delivery.
 */
module.exports = {
    run(creep) {
        if (creep.store.getFreeCapacity() === 0) creep.memory.harvesting = false;
        if (creep.store.getUsedCapacity() === 0) creep.memory.harvesting = true;

        if (creep.memory.harvesting) {
            this.collect(creep);
        } else {
            this.deliver(creep);
        }
    },

    collect(creep) {
        // Withdraw from home containers
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });

        if (container) {
            // Repair container if it's getting low
            if (container.hits < container.hitsMax * 0.5 &&
                creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                if (creep.repair(container) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, { reusePath: 5 });
                }
                return;
            }

            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 5, visualizePathStyle: { stroke: '#ffff00' } });
            }
            return;
        }

        // Fallback: pick up dropped energy or tombstones
        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
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
        }
    },

    deliver(creep) {
        // At RCL 5+, dump into source link if available
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

        // Spawn/extensions first
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

        if (!target) {
            // Nothing needs energy — help build construction sites first (we have 1 WORK part)
            const site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            if (site) {
                if (creep.build(site) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(site, { reusePath: 5, visualizePathStyle: { stroke: '#33ff33' } });
                }
                return;
            }
            // Nothing to build either — upgrade controller
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
