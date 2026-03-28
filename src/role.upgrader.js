/**
 * Upgraders harvest energy and upgrade the room controller.
 * Keeping the controller upgrading is critical — if it hits 0 you lose the room.
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
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#8844ff' }
                });
            }
        }
    },

    getEnergy(creep) {
        // First priority: controller link (instant energy, no walking)
        if (creep.room.memory.links && creep.room.memory.links.controller) {
            const link = Game.getObjectById(creep.room.memory.links.controller);
            if (link && link.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                if (creep.withdraw(link, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(link, { reusePath: 5 });
                }
                return;
            }
        }

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

        // Fall back to harvesting directly
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
};
