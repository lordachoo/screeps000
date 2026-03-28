/**
 * Remote miner travels to an adjacent room and sits on a source, harvesting every tick.
 * Pure WORK+MOVE body (no CARRY) — harvest() deposits into container the creep stands on.
 * 1 per remote source.
 */
module.exports = {
    run(creep) {
        const targetRoom = creep.memory.targetRoom;
        const sourceId = creep.memory.sourceId;

        // Travel to target room
        if (creep.room.name !== targetRoom) {
            const exitDir = creep.room.findExitTo(targetRoom);
            const exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: '#ff8800' } });
            }
            return;
        }

        // We're in the target room — mine
        const source = Game.getObjectById(sourceId);
        if (!source) return;

        // Try to stand on container if one exists near the source
        if (!creep.memory.containerId) {
            const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0];
            if (container) {
                creep.memory.containerId = container.id;
            }
        }

        // Move to container position if we have one, otherwise move to source
        const container = Game.getObjectById(creep.memory.containerId);
        if (container && !creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container, { reusePath: 5 });
        } else if (!container && creep.pos.getRangeTo(source) > 1) {
            creep.moveTo(source, { reusePath: 5, visualizePathStyle: { stroke: '#ff8800' } });
        }

        // Harvest
        creep.harvest(source);
    }
};
