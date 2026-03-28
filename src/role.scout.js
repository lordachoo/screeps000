/**
 * Scout explores adjacent rooms and stores intel in Memory.roomIntel.
 * Cheap [MOVE] body (50 energy). Only 1 needed.
 */
module.exports = {
    run(creep) {
        const homeRoom = creep.memory.homeRoom;

        // If we're in a non-home room, record intel
        if (creep.room.name !== homeRoom) {
            this.recordIntel(creep.room);
        }

        // Pick next target to explore
        if (!creep.memory.target || creep.room.name === creep.memory.target) {
            creep.memory.target = this.pickTarget(creep);
        }

        // Move to target room
        if (creep.memory.target) {
            const exitDir = creep.room.findExitTo(creep.memory.target);
            const exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20 });
            }
        }
    },

    recordIntel(room) {
        if (!Memory.roomIntel) Memory.roomIntel = {};

        const sources = room.find(FIND_SOURCES).map(s => ({
            id: s.id, x: s.pos.x, y: s.pos.y
        }));

        const minerals = room.find(FIND_MINERALS);
        const controller = room.controller;

        Memory.roomIntel[room.name] = {
            sources,
            controller: controller ? {
                id: controller.id,
                x: controller.pos.x,
                y: controller.pos.y,
                owner: controller.owner ? controller.owner.username : null,
                reservedBy: controller.reservation ? controller.reservation.username : null,
                level: controller.level
            } : null,
            hostiles: room.find(FIND_HOSTILE_CREEPS).length,
            mineral: minerals.length > 0 ? minerals[0].mineralType : null,
            lastScouted: Game.time
        };
    },

    pickTarget(creep) {
        if (!Memory.roomIntel) Memory.roomIntel = {};

        // Get adjacent rooms
        const exits = Game.map.describeExits(creep.memory.homeRoom);
        const adjacentRooms = Object.values(exits);

        // Also get rooms 2 away for claiming intel
        const twoAway = [];
        for (const adjRoom of adjacentRooms) {
            const adjExits = Game.map.describeExits(adjRoom);
            for (const farRoom of Object.values(adjExits)) {
                if (farRoom !== creep.memory.homeRoom && !adjacentRooms.includes(farRoom) && !twoAway.includes(farRoom)) {
                    twoAway.push(farRoom);
                }
            }
        }

        const allTargets = [...adjacentRooms, ...twoAway];

        // Pick the room that was scouted longest ago (or never)
        let bestTarget = null;
        let oldestTime = Infinity;

        for (const roomName of allTargets) {
            const intel = Memory.roomIntel[roomName];
            const lastScouted = intel ? intel.lastScouted : 0;

            if (lastScouted < oldestTime) {
                oldestTime = lastScouted;
                bestTarget = roomName;
            }
        }

        // Re-scout if intel is older than 5000 ticks
        if (bestTarget && oldestTime > 0 && Game.time - oldestTime < 5000) {
            // All rooms are fresh, pick a random adjacent to cycle
            return adjacentRooms[Game.time % adjacentRooms.length];
        }

        return bestTarget;
    }
};
