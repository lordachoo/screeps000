/**
 * Expansion manager coordinates scouting, remote mining, reservation, and claiming.
 * Runs every 100 ticks to save CPU.
 */
module.exports = {
    run(room) {
        if (Game.time % 100 !== 0) return;
        if (!Memory.roomIntel) Memory.roomIntel = {};
        if (!Memory.expansion) Memory.expansion = { remoteRooms: [], claimTarget: null };

        const rcl = room.controller.level;

        // At RCL 3+, evaluate and assign remote mining rooms
        if (rcl >= 3) {
            this.updateRemoteRooms(room);
        }

        // At RCL 3+ with GCL 2+, evaluate claim targets
        if (rcl >= 3 && Game.gcl.level >= 2 && !Memory.expansion.claimTarget) {
            this.evaluateClaimTargets(room);
        }
    },

    updateRemoteRooms(room) {
        const rcl = room.controller.level;
        const maxRemoteRooms = rcl >= 4 ? 2 : 1;

        // Get scored adjacent rooms
        const candidates = this.scoreRemoteRooms(room);

        // Assign best rooms up to the limit
        const assigned = [];
        for (const candidate of candidates) {
            if (assigned.length >= maxRemoteRooms) break;
            assigned.push({
                name: candidate.name,
                sources: candidate.sources,
                reserved: rcl >= 4 && candidate.sources.length >= 2
            });
        }

        Memory.expansion.remoteRooms = assigned;
    },

    scoreRemoteRooms(room) {
        const exits = Game.map.describeExits(room.name);
        const adjacentRooms = Object.values(exits);
        const scored = [];

        for (const roomName of adjacentRooms) {
            const intel = Memory.roomIntel[roomName];
            if (!intel) continue;
            if (!intel.sources || intel.sources.length === 0) continue;
            if (intel.hostiles > 0) continue;

            // Skip owned or reserved rooms (unless owned/reserved by us)
            if (intel.controller) {
                if (intel.controller.owner) {
                    // Skip rooms owned by other players
                    if (intel.controller.owner !== Memory.username) continue;
                    // Skip our own rooms that already have a completed spawn (self-sustaining)
                    const liveRoom = Game.rooms[roomName];
                    if (liveRoom && liveRoom.find(FIND_MY_SPAWNS).length > 0) continue;
                }
                if (intel.controller.reservedBy && intel.controller.reservedBy !== (Memory.username || '')) continue;
            }

            // Score: more sources = better, penalize if scouting is stale
            const score = intel.sources.length * 10;
            scored.push({ name: roomName, sources: intel.sources.map(s => s.id), score });
        }

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        return scored;
    },

    evaluateClaimTargets(room) {
        // Check if we already own enough rooms for our GCL
        const ownedRooms = Object.values(Game.rooms).filter(r => r.controller && r.controller.my);
        if (ownedRooms.length >= Game.gcl.level) return;

        // Search all scouted rooms using BFS up to 4 rooms away
        const visited = new Set([room.name]);
        const queue = [{ name: room.name, depth: 0 }];
        const candidates = [];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.depth >= 4) continue;

            const exits = Game.map.describeExits(current.name);
            if (!exits) continue;

            for (const nextRoom of Object.values(exits)) {
                if (visited.has(nextRoom)) continue;
                visited.add(nextRoom);
                queue.push({ name: nextRoom, depth: current.depth + 1 });

                const intel = Memory.roomIntel[nextRoom];
                if (!intel) continue;
                if (!intel.controller) continue;
                if (intel.controller.owner) continue;
                if (intel.sources.length === 0) continue;
                if (intel.hostiles > 0) continue;

                candidates.push({ name: nextRoom, intel, depth: current.depth + 1 });
            }
        }

        if (candidates.length === 0) return;

        // Score candidates: prefer 2-source rooms, then closer distance
        let bestRoom = null;
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            const score = candidate.intel.sources.length * 10 - candidate.depth * 3;
            if (score > bestScore) {
                bestScore = score;
                bestRoom = candidate.name;
            }
        }

        if (bestRoom) {
            const sources = Memory.roomIntel[bestRoom].sources.length;
            Memory.expansion.claimTarget = bestRoom;
            console.log(`🎯 ${room.name}: Claim target set to ${bestRoom} (${sources} source${sources > 1 ? 's' : ''})`);
        }
    },

    /**
     * Returns desired creep counts for expansion roles.
     * Called by manager.spawn.js
     */
    getDesiredExpansionCreeps(room) {
        const rcl = room.controller.level;
        const counts = {
            scout: 0,
            remoteMiner: 0,
            hauler: 0,
            reserver: 0,
            claimer: 0,
            pioneer: 0
        };

        // Scout at RCL 2+
        if (rcl >= 2) {
            counts.scout = 1;
        }

        // Remote mining at RCL 3+
        if (rcl >= 3 && Memory.expansion && Memory.expansion.remoteRooms) {
            for (const remote of Memory.expansion.remoteRooms) {
                counts.remoteMiner += remote.sources.length;
                counts.hauler += this.haulersNeeded(room, remote);

                // Reservation at RCL 4+
                if (rcl >= 4 && remote.reserved) {
                    counts.reserver += 1;
                }
            }
        }

        // Claiming at RCL 3+
        if (rcl >= 3 && Memory.expansion && Memory.expansion.claimTarget) {
            const targetRoom = Game.rooms[Memory.expansion.claimTarget];
            const alreadyClaimed = targetRoom && targetRoom.controller && targetRoom.controller.my;

            if (!alreadyClaimed) {
                // Check if a claimer is already alive
                const existingClaimer = _.filter(Game.creeps, c =>
                    c.memory.role === 'claimer' && c.memory.homeRoom === room.name
                );
                if (existingClaimer.length === 0) {
                    counts.claimer = 1;
                }
            } else {
                // Room is claimed — send pioneers if it has no spawn
                const hasSpawn = targetRoom.find(FIND_MY_SPAWNS).length > 0;
                if (!hasSpawn) {
                    counts.pioneer = 4;
                }
            }
        }

        return counts;
    },

    haulersNeeded(room, remote) {
        const distance = Game.map.getRoomLinearDistance(room.name, remote.name) * 50;
        const sourceCount = remote.sources.length;
        const energyPerTick = remote.reserved ? 13.3 : 10;

        // Estimate hauler capacity based on room energy
        const energyCap = room.energyCapacityAvailable;
        // Rough hauler body: [WORK, CARRY*N, MOVE*ceil(N/2)] - estimate carry capacity
        const haulerCarry = Math.min(Math.floor((energyCap - 100) / 75) * 50, 1000);

        const roundTrip = distance * 2;
        const needed = Math.ceil((energyPerTick * roundTrip * sourceCount) / Math.max(haulerCarry, 100));
        return Math.max(needed, sourceCount); // At least 1 hauler per source
    }
};
