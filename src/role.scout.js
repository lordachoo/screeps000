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

        // Pick next target if we don't have one, or we've arrived at current target
        if (!creep.memory.target || creep.room.name === creep.memory.target) {
            creep.memory.target = this.pickTarget(creep);
            creep.memory.path = null; // Reset cached path
        }

        // Move to target room
        if (creep.memory.target && creep.room.name !== creep.memory.target) {
            const target = new RoomPosition(25, 25, creep.memory.target);
            creep.moveTo(target, { reusePath: 20 });
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

        // Build list: adjacent rooms first, then 2-away rooms
        const targets = [];

        // Add adjacent rooms (scout these first)
        for (const roomName of adjacentRooms) {
            const intel = Memory.roomIntel[roomName];
            const age = intel ? Game.time - intel.lastScouted : Infinity;
            targets.push({ name: roomName, age, adjacent: true });
        }

        // Add 2-away rooms (only after all adjacent are scouted)
        const allAdjacentScouted = adjacentRooms.every(r => Memory.roomIntel[r]);
        if (allAdjacentScouted) {
            for (const adjRoom of adjacentRooms) {
                const adjExits = Game.map.describeExits(adjRoom);
                for (const farRoom of Object.values(adjExits)) {
                    if (farRoom === creep.memory.homeRoom) continue;
                    if (adjacentRooms.includes(farRoom)) continue;
                    if (targets.some(t => t.name === farRoom)) continue;

                    const intel = Memory.roomIntel[farRoom];
                    const age = intel ? Game.time - intel.lastScouted : Infinity;
                    targets.push({ name: farRoom, age, adjacent: false, via: adjRoom });
                }
            }
        }

        // Pick the oldest/unscouted room
        // Prefer unscouted rooms, then oldest intel
        targets.sort((a, b) => b.age - a.age);

        // Filter to rooms that need scouting (never scouted or older than 5000 ticks)
        const needsScouting = targets.filter(t => t.age > 5000);

        if (needsScouting.length > 0) {
            return needsScouting[0].name;
        }

        // All rooms are fresh — cycle through adjacent rooms sequentially
        if (!creep.memory.cycleIndex) creep.memory.cycleIndex = 0;
        creep.memory.cycleIndex = (creep.memory.cycleIndex + 1) % adjacentRooms.length;
        return adjacentRooms[creep.memory.cycleIndex];
    }
};
