/**
 * Scout explores rooms and stores intel in Memory.roomIntel.
 * Cheap [MOVE] body (50 energy). Only 1 needed.
 * Simple approach: pick an unscouted room, go there, repeat.
 */
module.exports = {
    run(creep) {
        // Record intel in every non-home room we pass through
        if (creep.room.name !== creep.memory.homeRoom) {
            this.recordIntel(creep.room);
        }

        // If no target or arrived at target, pick new one
        if (!creep.memory.target || creep.room.name === creep.memory.target) {
            creep.memory.target = this.pickTarget(creep);
            creep.memory.stuckTicks = 0;
            if (creep.memory.target) {
                console.log(`🔭 Scout: heading to ${creep.memory.target}`);
            }
        }

        if (!creep.memory.target) return;

        // Stuck detection — if same position for 5+ ticks, skip target
        const posKey = creep.pos.x + ',' + creep.pos.y;
        if (creep.memory.lastPos === posKey) {
            creep.memory.stuckTicks = (creep.memory.stuckTicks || 0) + 1;
        } else {
            creep.memory.stuckTicks = 0;
        }
        creep.memory.lastPos = posKey;

        if (creep.memory.stuckTicks > 50) {
            console.log(`🔭 Scout: stuck, blacklisting ${creep.memory.target}`);
            // Store blacklist in global Memory so it survives respawns
            if (!Memory.scoutBlacklist) Memory.scoutBlacklist = [];
            if (!Memory.scoutBlacklist.includes(creep.memory.target)) {
                Memory.scoutBlacklist.push(creep.memory.target);
            }
            creep.memory.target = null;
            creep.memory.stuckTicks = 0;
            return;
        }

        // Move — just walk toward the target room center
        const exitDir = creep.room.findExitTo(creep.memory.target);
        if (exitDir > 0) {
            const exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 5 });
            }
        } else {
            // Not directly adjacent — find which adjacent room is on the path
            const nextRoom = this.getNextRoomOnPath(creep.room.name, creep.memory.target);
            if (nextRoom) {
                const nextExitDir = creep.room.findExitTo(nextRoom);
                if (nextExitDir > 0) {
                    const exit = creep.pos.findClosestByRange(nextExitDir);
                    if (exit) {
                        creep.moveTo(exit, { reusePath: 5 });
                    }
                }
            } else {
                // Can't path, skip
                creep.memory.target = null;
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
     * BFS to find next room to walk into on the way to target.
     */
    getNextRoomOnPath(fromRoom, toRoom) {
        const visited = new Set([fromRoom]);
        const queue = [{ name: fromRoom, firstStep: null }];

        while (queue.length > 0) {
            const current = queue.shift();

            const exits = Game.map.describeExits(current.name);
            if (!exits) continue;

            for (const nextRoom of Object.values(exits)) {
                if (visited.has(nextRoom)) continue;
                visited.add(nextRoom);

                const step = current.firstStep || nextRoom;

                if (nextRoom === toRoom) return step;

                // Don't path through hostile rooms
                const intel = Memory.roomIntel[nextRoom];
                if (intel && intel.controller && intel.controller.owner &&
                    intel.controller.owner !== Memory.username) continue;

                queue.push({ name: nextRoom, firstStep: step });
            }
        }
        return null;
    },

    pickTarget(creep) {
        if (!Memory.roomIntel) Memory.roomIntel = {};
        const blacklist = Memory.scoutBlacklist || [];

        // BFS from home to find all reachable rooms up to 10 away
        const homeRoom = creep.memory.homeRoom;
        const visited = new Set([homeRoom]);
        const queue = [{ name: homeRoom, depth: 0 }];
        const unscouted = [];
        const stale = [];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.depth >= 10) continue;

            const exits = Game.map.describeExits(current.name);
            if (!exits) continue;

            for (const nextRoom of Object.values(exits)) {
                if (visited.has(nextRoom)) continue;
                visited.add(nextRoom);

                // Skip hostile-owned rooms
                const intel = Memory.roomIntel[nextRoom];
                if (intel && intel.controller && intel.controller.owner &&
                    intel.controller.owner !== Memory.username) continue;

                // Skip blacklisted rooms
                if (blacklist.includes(nextRoom)) {
                    queue.push({ name: nextRoom, depth: current.depth + 1 });
                    continue;
                }

                if (!intel) {
                    unscouted.push({ name: nextRoom, depth: current.depth + 1 });
                } else {
                    const age = Game.time - intel.lastScouted;
                    if (age > 10000) {
                        stale.push({ name: nextRoom, depth: current.depth + 1, age });
                    }
                }

                queue.push({ name: nextRoom, depth: current.depth + 1 });
            }
        }

        // Prefer unscouted rooms, closest first
        if (unscouted.length > 0) {
            unscouted.sort((a, b) => a.depth - b.depth);
            return unscouted[0].name;
        }

        // Then stale rooms, oldest first
        if (stale.length > 0) {
            stale.sort((a, b) => b.age - a.age);
            return stale[0].name;
        }

        // Everything explored and fresh — clear blacklist and start over
        if (blacklist.length > 0) {
            Memory.scoutBlacklist = [];
        }

        return null;
    }
};
