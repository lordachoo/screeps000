/**
 * Scout explores rooms up to 4 rooms away and stores intel in Memory.roomIntel.
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

        // Build a map of all rooms up to 4 away using BFS
        const homeRoom = creep.memory.homeRoom;
        const visited = new Set([homeRoom]);
        const queue = [{ name: homeRoom, depth: 0 }];
        const rooms = []; // { name, depth, age }

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.depth >= 10) continue;

            const exits = Game.map.describeExits(current.name);
            if (!exits) continue;

            for (const nextRoom of Object.values(exits)) {
                if (visited.has(nextRoom)) continue;
                visited.add(nextRoom);

                const intel = Memory.roomIntel[nextRoom];
                const age = intel ? Game.time - intel.lastScouted : Infinity;

                rooms.push({ name: nextRoom, depth: current.depth + 1, age });
                queue.push({ name: nextRoom, depth: current.depth + 1 });
            }
        }

        // Pick rooms that need scouting: never scouted or older than 5000 ticks
        const needsScouting = rooms.filter(r => r.age > 5000);

        if (needsScouting.length > 0) {
            // Prefer closer unscouted rooms first, then oldest
            needsScouting.sort((a, b) => {
                if (a.age === Infinity && b.age !== Infinity) return -1;
                if (b.age === Infinity && a.age !== Infinity) return 1;
                if (a.depth !== b.depth) return a.depth - b.depth;
                return b.age - a.age;
            });
            return needsScouting[0].name;
        }

        // Everything is fresh — re-scout the closest room with oldest intel
        rooms.sort((a, b) => {
            if (a.depth !== b.depth) return a.depth - b.depth;
            return b.age - a.age;
        });

        return rooms.length > 0 ? rooms[0].name : null;
    }
};
