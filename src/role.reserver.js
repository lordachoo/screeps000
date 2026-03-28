/**
 * Reserver travels to a remote room and reserves the controller.
 * Reservation doubles source output (3000 -> 4000 per cycle).
 * Body: [CLAIM, CLAIM, MOVE, MOVE] — 1300 energy, 600 tick TTL.
 */
module.exports = {
    run(creep) {
        const targetRoom = creep.memory.targetRoom;

        // Travel to target room
        if (creep.room.name !== targetRoom) {
            const exitDir = creep.room.findExitTo(targetRoom);
            const exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: '#aa00ff' } });
            }
            return;
        }

        // Reserve the controller
        const controller = creep.room.controller;
        if (!controller) return;

        // Store our username for intel checks
        if (!Memory.username) {
            Memory.username = _.find(Game.structures, s => true).owner.username;
        }

        const result = creep.reserveController(controller);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { reusePath: 10, visualizePathStyle: { stroke: '#aa00ff' } });
        }
    }
};
