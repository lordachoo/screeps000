/**
 * Mineral miner harvests the room's mineral deposit.
 * Requires an extractor (RCL 6). Similar to remoteMiner but for minerals.
 * Idles when mineral is depleted (regenerates after 50k ticks).
 */
module.exports = {
    run(creep) {
        // Find the mineral in the room
        if (!creep.memory.mineralId) {
            const mineral = creep.room.find(FIND_MINERALS)[0];
            if (mineral) {
                creep.memory.mineralId = mineral.id;
            } else {
                return;
            }
        }

        const mineral = Game.getObjectById(creep.memory.mineralId);
        if (!mineral) return;

        // If mineral is depleted, park near spawn and wait
        if (mineral.mineralAmount === 0) {
            const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
            if (spawn && creep.pos.getRangeTo(spawn) > 3) {
                creep.moveTo(spawn, { reusePath: 10 });
            }
            return;
        }

        // Find or cache container near mineral
        if (!creep.memory.containerId) {
            const container = mineral.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0];
            if (container) {
                creep.memory.containerId = container.id;
            }
        }

        // Move to container position or mineral
        const container = Game.getObjectById(creep.memory.containerId);
        if (container && !creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container, { reusePath: 5 });
        } else if (!container && creep.pos.getRangeTo(mineral) > 1) {
            creep.moveTo(mineral, { reusePath: 5, visualizePathStyle: { stroke: '#44aaff' } });
        }

        // Harvest mineral
        creep.harvest(mineral);
    }
};
