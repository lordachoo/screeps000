/**
 * Scout explores rooms up to 10 rooms away and stores intel in Memory.roomIntel.
 * Cheap [MOVE] body (50 energy). Only 1 needed.
 * Uses a waypoint system to navigate through rooms one at a time.
 */
module.exports = {
    run(creep) {
        const homeRoom = creep.memory.homeRoom;

        // If we're in a non-home room, record intel
        if (creep.room.name !== homeRoom) {
            this.recordIntel(creep.room);
        }

        // Pick next final target if we don't have one, or we've arrived at it
        if (!creep.memory.target || creep.room.name === creep.memory.target) {
            const newTarget = this.pickTarget(creep);
            creep.memory.target = newTarget;
            creep.memory.waypoints = null; // Clear waypoints to recalculate
            if (newTarget) {
                console.log(`🔭 Scout targeting ${newTarget}`);
            }
        }

        if (!creep.memory.target) return;

        // Build waypoint path if we don't have one
        if (!creep.memory.waypoints || creep.memory.waypoints.length === 0) {
            const path = this.findRoomPath(creep.room.name, creep.memory.target);
            if (path && path.length > 0) {
                creep.memory.waypoints = path;
            } else {
                // Can't path there, pick a new target next tick
                creep.memory.target = null;
                return;
            }
        }

        // Move toward current waypoint (next room in the path)
        const nextRoom = creep.memory.waypoints[0];

        if (creep.room.name === nextRoom) {
            // Arrived at this waypoint, advance to next
            creep.memory.waypoints.shift();
            if (creep.memory.waypoints.length === 0) {
                // Arrived at final target
                return;
            }
        }

        // Move to next waypoint
        const waypoint = creep.memory.waypoints[0];
        if (waypoint) {
            const exitDir = creep.room.findExitTo(waypoint);
            if (exitDir > 0) {
                const exit = creep.pos.findClosestByPath(exitDir);
                if (exit) {
                    creep.moveTo(exit, { reusePath: 10 });
                } else {
                    // Can't find path to exit, try range-based
                    const exitRange = creep.pos.findClosestByRange(exitDir);
                    if (exitRange) {
                        creep.moveTo(exitRange, { reusePath: 10 });
                    }
                }
            } else {
                // Invalid exit, clear and re-target
                creep.memory.target = null;
                creep.memory.waypoints = null;
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

    /**
     * Find a room-level path from start to target using BFS.
     * Returns array of room names to traverse (excluding start room).
     */
    findRoomPath(startRoom, targetRoom) {
        if (startRoom === targetRoom) return [];

        const visited = new Set([startRoom]);
        const queue = [{ name: startRoom, path: [] }];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.path.length >= 12) continue;

            const exits = Game.map.describeExits(current.name);
            if (!exits) continue;

            for (const nextRoom of Object.values(exits)) {
                if (visited.has(nextRoom)) continue;
                visited.add(nextRoom);

                const newPath = [...current.path, nextRoom];
                if (nextRoom === targetRoom) return newPath;

                queue.push({ name: nextRoom, path: newPath });
            }
        }

        return null; // No path found
    },

    pickTarget(creep) {
        if (!Memory.roomIntel) Memory.roomIntel = {};

        // Build a map of all rooms up to 10 away using BFS
        const homeRoom = creep.memory.homeRoom;
        const visited = new Set([homeRoom]);
        const queue = [{ name: homeRoom, depth: 0 }];
        const rooms = [];

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

        // Pick rooms that need scouting: never scouted or older than 10000 ticks
        const needsScouting = rooms.filter(r => r.age > 10000);

        if (needsScouting.length > 0) {
            // Prefer unscouted first, then closer, then oldest
            needsScouting.sort((a, b) => {
                const aUnscouted = a.age === Infinity ? 1 : 0;
                const bUnscouted = b.age === Infinity ? 1 : 0;
                if (aUnscouted !== bUnscouted) return bUnscouted - aUnscouted;
                if (a.depth !== b.depth) return a.depth - b.depth;
                return b.age - a.age;
            });
            return needsScouting[0].name;
        }

        // Everything is fresh — cycle through rooms by depth
        rooms.sort((a, b) => b.age - a.age);
        return rooms.length > 0 ? rooms[0].name : null;
    }
};
