/**
 * Room planner automatically places construction sites as you level up.
 * Run infrequently (every 100 ticks) to save CPU.
 */
module.exports = {
    run(room) {
        // Only run every 100 ticks to save CPU
        if (Game.time % 100 !== 0) return;

        const rcl = room.controller.level;
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        // Don't place too many sites at once — builders get overwhelmed
        const existingSites = room.find(FIND_CONSTRUCTION_SITES);
        if (existingSites.length >= 5) return;

        // Build extensions (critical for energy capacity)
        this.buildExtensions(room, spawn, rcl);

        // Build towers at RCL 3+
        if (rcl >= 3) this.buildTowers(room, spawn, rcl);

        // Build roads from spawn to sources and controller at RCL 3+
        if (rcl >= 3) this.buildRoads(room, spawn);

        // Build storage at RCL 4+
        if (rcl >= 4) this.buildStorage(room, spawn);

        // Build containers near sources at RCL 2+
        if (rcl >= 2) this.buildContainers(room);
    },

    buildExtensions(room, spawn, rcl) {
        const maxExtensions = {
            0: 0, 1: 0, 2: 5, 3: 10, 4: 20, 5: 30, 6: 40, 7: 50, 8: 60
        };
        const existing = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        }).length;
        const sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        }).length;

        const needed = (maxExtensions[rcl] || 0) - existing - sites;
        if (needed <= 0) return;

        // Place extensions in a grid pattern near spawn
        const placed = this.placeNearSpawn(room, spawn, STRUCTURE_EXTENSION, Math.min(needed, 3));
        if (placed > 0) {
            console.log(`📐 ${room.name}: Placed ${placed} extension sites`);
        }
    },

    buildTowers(room, spawn, rcl) {
        const maxTowers = { 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 6 };
        const existing = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        }).length;
        const sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        }).length;

        const needed = (maxTowers[rcl] || 0) - existing - sites;
        if (needed <= 0) return;

        this.placeNearSpawn(room, spawn, STRUCTURE_TOWER, 1);
    },

    buildStorage(room, spawn) {
        if (room.storage) return;
        const sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_STORAGE
        });
        if (sites.length > 0) return;

        this.placeNearSpawn(room, spawn, STRUCTURE_STORAGE, 1);
    },

    buildContainers(room) {
        const sources = room.find(FIND_SOURCES);
        for (const source of sources) {
            const nearbyContainers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });
            const nearbySites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });

            if (nearbyContainers.length === 0 && nearbySites.length === 0) {
                // Find an open spot adjacent to the source
                const terrain = room.getTerrain();
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const x = source.pos.x + dx;
                        const y = source.pos.y + dy;
                        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                            if (room.createConstructionSite(x, y, STRUCTURE_CONTAINER) === OK) {
                                return;
                            }
                        }
                    }
                }
            }
        }
    },

    buildRoads(room, spawn) {
        // Only build roads every 500 ticks to not spam
        if (Game.time % 500 !== 0) return;

        const targets = [room.controller, ...room.find(FIND_SOURCES)];
        for (const target of targets) {
            const path = room.findPath(spawn.pos, target.pos, { ignoreCreeps: true });
            for (const step of path) {
                const structures = room.lookForAt(LOOK_STRUCTURES, step.x, step.y);
                const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, step.x, step.y);
                if (structures.length === 0 && sites.length === 0) {
                    room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
                }
            }
        }
    },

    /**
     * Place structures in a spiral pattern around the spawn.
     * Returns how many were successfully placed.
     */
    placeNearSpawn(room, spawn, structureType, count) {
        const terrain = room.getTerrain();
        let placed = 0;

        // Spiral outward from spawn, skip every other tile for extensions (checkerboard)
        for (let radius = 2; radius <= 8 && placed < count; radius++) {
            for (let dx = -radius; dx <= radius && placed < count; dx++) {
                for (let dy = -radius; dy <= radius && placed < count; dy++) {
                    // Only check the outer ring of this radius
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                    const x = spawn.pos.x + dx;
                    const y = spawn.pos.y + dy;

                    // Stay in bounds
                    if (x < 2 || x > 47 || y < 2 || y > 47) continue;

                    // Check terrain
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                    // Checkerboard for extensions to allow movement
                    if (structureType === STRUCTURE_EXTENSION && (x + y) % 2 !== 0) continue;

                    // Check if spot is free
                    const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                    const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                    if (structures.length > 0 || sites.length > 0) continue;

                    if (room.createConstructionSite(x, y, structureType) === OK) {
                        placed++;
                    }
                }
            }
        }
        return placed;
    }
};
