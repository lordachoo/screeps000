/**
 * Claimer is a one-shot creep that claims a new room's controller.
 * Body: [CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE] — 850 energy.
 * Only spawned when GCL allows owning more rooms.
 */
module.exports = {
    run(creep) {
        const targetRoom = creep.memory.targetRoom;

        // Travel to target room
        if (creep.room.name !== targetRoom) {
            const exitDir = creep.room.findExitTo(targetRoom);
            const exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: '#ff00ff' } });
            }
            return;
        }

        // Claim the controller
        const controller = creep.room.controller;
        if (!controller) return;

        if (controller.my) {
            // Already claimed — nothing to do, creep will expire naturally
            return;
        }

        const result = creep.claimController(controller);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { reusePath: 5, visualizePathStyle: { stroke: '#ff00ff' } });
        } else if (result === OK) {
            console.log(`🏰 Claimed room ${targetRoom}!`);
            // Clear claim target
            if (Memory.expansion) {
                Memory.expansion.claimTarget = null;
            }
        } else if (result === ERR_GCL_NOT_ENOUGH) {
            console.log(`❌ GCL too low to claim ${targetRoom}`);
        }
    }
};
