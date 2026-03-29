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

        // Handle newly claimed rooms with no spawn — pioneers will build it
        if (!spawn) return;

        // Build remote mining infrastructure
        if (rcl >= 3) this.buildRemoteInfrastructure(room);

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

        // Build ramparts on critical structures at RCL 3+
        if (rcl >= 3) this.buildRamparts(room, spawn, rcl);

        // Build links at RCL 5+
        if (rcl >= 5) this.buildLinks(room, spawn, rcl);

        // Build extractor + mineral container at RCL 6+
        if (rcl >= 6) this.buildExtractor(room);
        if (rcl >= 6) this.buildMineralContainer(room);

        // Build terminal at RCL 6+
        if (rcl >= 6) this.buildTerminal(room, spawn);

        // Build labs at RCL 6+
        if (rcl >= 6) this.buildLabs(room, spawn, rcl);
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
        // Skip if this room is already handled by buildRemoteInfrastructure
        const isRemote = Memory.expansion && Memory.expansion.remoteRooms &&
            Memory.expansion.remoteRooms.some(r => r.name === room.name);
        if (isRemote) return;

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
    /**
     * Build containers at remote mining sources.
     * Only runs every 500 ticks. Requires visibility (creep in the room).
     */
    buildRemoteInfrastructure(room) {
        if (Game.time % 500 !== 0) return;
        if (!Memory.expansion || !Memory.expansion.remoteRooms) return;

        for (const remote of Memory.expansion.remoteRooms) {
            const remoteRoom = Game.rooms[remote.name];
            if (!remoteRoom) continue; // No visibility

            // Build containers near sources
            const sources = remoteRoom.find(FIND_SOURCES);
            for (const source of sources) {
                const nearbyContainers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                });
                const nearbySites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                });

                if (nearbyContainers.length === 0 && nearbySites.length === 0) {
                    const terrain = remoteRoom.getTerrain();
                    let placed = false;
                    for (let dx = -1; dx <= 1 && !placed; dx++) {
                        for (let dy = -1; dy <= 1 && !placed; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            const x = source.pos.x + dx;
                            const y = source.pos.y + dy;
                            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                                if (remoteRoom.createConstructionSite(x, y, STRUCTURE_CONTAINER) === OK) {
                                    console.log(`📦 ${remote.name}: Placed remote container at ${x},${y}`);
                                    placed = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    buildRamparts(room, spawn, rcl) {
        // Only every 500 ticks
        if (Game.time % 500 !== 0) return;

        // Place ramparts on critical structures
        const criticalTypes = [STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TERMINAL,
                               STRUCTURE_TOWER, STRUCTURE_LINK];
        const structures = room.find(FIND_MY_STRUCTURES, {
            filter: s => criticalTypes.includes(s.structureType)
        });

        for (const structure of structures) {
            const hasRampart = structure.pos.lookFor(LOOK_STRUCTURES).some(
                s => s.structureType === STRUCTURE_RAMPART
            );
            const hasSite = structure.pos.lookFor(LOOK_CONSTRUCTION_SITES).some(
                s => s.structureType === STRUCTURE_RAMPART
            );
            if (!hasRampart && !hasSite) {
                room.createConstructionSite(structure.pos.x, structure.pos.y, STRUCTURE_RAMPART);
            }
        }
    },

    buildLinks(room, spawn, rcl) {
        const maxLinks = { 5: 2, 6: 3, 7: 4, 8: 6 };
        const existing = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LINK
        }).length;
        const sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_LINK
        }).length;

        const allowed = maxLinks[rcl] || 0;
        if (existing + sites >= allowed) return;

        const sources = room.find(FIND_SOURCES);
        const terrain = room.getTerrain();

        // Place source links first (near each source)
        for (const source of sources) {
            const hasLink = source.pos.findInRange(FIND_MY_STRUCTURES, 2, {
                filter: s => s.structureType === STRUCTURE_LINK
            }).length > 0;
            const hasSite = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
                filter: s => s.structureType === STRUCTURE_LINK
            }).length > 0;

            if (!hasLink && !hasSite && existing + sites < allowed) {
                if (this.placeNear(room, source.pos, STRUCTURE_LINK, 2)) return;
            }
        }

        // Place controller link (within range 3-4 of controller)
        const controller = room.controller;
        const hasControllerLink = controller.pos.findInRange(FIND_MY_STRUCTURES, 4, {
            filter: s => s.structureType === STRUCTURE_LINK
        }).length > 0;
        const hasControllerSite = controller.pos.findInRange(FIND_CONSTRUCTION_SITES, 4, {
            filter: s => s.structureType === STRUCTURE_LINK
        }).length > 0;

        if (!hasControllerLink && !hasControllerSite && existing + sites < allowed) {
            this.placeNear(room, controller.pos, STRUCTURE_LINK, 3);
        }
    },

    buildExtractor(room) {
        const mineral = room.find(FIND_MINERALS)[0];
        if (!mineral) return;

        const hasExtractor = mineral.pos.lookFor(LOOK_STRUCTURES).some(
            s => s.structureType === STRUCTURE_EXTRACTOR
        );
        const hasSite = mineral.pos.lookFor(LOOK_CONSTRUCTION_SITES).some(
            s => s.structureType === STRUCTURE_EXTRACTOR
        );

        if (!hasExtractor && !hasSite) {
            room.createConstructionSite(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR);
            console.log(`⛏️ ${room.name}: Placed extractor on mineral`);
        }
    },

    buildMineralContainer(room) {
        const mineral = room.find(FIND_MINERALS)[0];
        if (!mineral) return;

        const nearbyContainers = mineral.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
        const nearbySites = mineral.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });

        if (nearbyContainers.length === 0 && nearbySites.length === 0) {
            const terrain = room.getTerrain();
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const x = mineral.pos.x + dx;
                    const y = mineral.pos.y + dy;
                    if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                        if (room.createConstructionSite(x, y, STRUCTURE_CONTAINER) === OK) return;
                    }
                }
            }
        }
    },

    buildTerminal(room, spawn) {
        if (room.terminal) return;
        const sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_TERMINAL
        });
        if (sites.length > 0) return;

        this.placeNearSpawn(room, spawn, STRUCTURE_TERMINAL, 1);
    },

    buildLabs(room, spawn, rcl) {
        const maxLabs = { 6: 3, 7: 6, 8: 10 };
        const existing = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LAB
        }).length;
        const sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_LAB
        }).length;

        const allowed = maxLabs[rcl] || 0;
        const needed = allowed - existing - sites;
        if (needed <= 0) return;

        // Place labs in a cluster near storage or spawn
        const center = room.storage ? room.storage.pos : spawn.pos;
        this.placeNear(room, center, STRUCTURE_LAB, 4, Math.min(needed, 2));
    },

    /**
     * Place a structure near a target position.
     * Returns true if placed successfully.
     */
    placeNear(room, pos, structureType, maxRange, count) {
        count = count || 1;
        const terrain = room.getTerrain();
        let placed = 0;

        for (let radius = 1; radius <= maxRange && placed < count; radius++) {
            for (let dx = -radius; dx <= radius && placed < count; dx++) {
                for (let dy = -radius; dy <= radius && placed < count; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    const x = pos.x + dx;
                    const y = pos.y + dy;
                    if (x < 2 || x > 47 || y < 2 || y > 47) continue;
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                    const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                    const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                    if (structures.length > 0 || sites.length > 0) continue;

                    if (room.createConstructionSite(x, y, structureType) === OK) {
                        placed++;
                    }
                }
            }
        }
        return placed > 0;
    },

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
