/**
 * Pioneer bootstraps a newly claimed room with no infrastructure.
 * Self-sufficient: harvests, builds spawn (top priority), extensions, upgrades.
 * Sent 3-4 at a time. Once the new room gets its own spawn, pioneers are no longer needed.
 */
module.exports = {
    run(creep) {
        const targetRoom = creep.memory.targetRoom;

        // Travel to target room
        if (creep.room.name !== targetRoom) {
            const exitDir = creep.room.findExitTo(targetRoom);
            const exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: '#00ffff' } });
            }
            return;
        }

        // State machine
        if (creep.store.getFreeCapacity() === 0) {
            creep.memory.harvesting = false;
        }
        if (creep.store.getUsedCapacity() === 0) {
            creep.memory.harvesting = true;
        }

        if (creep.memory.harvesting) {
            this.harvest(creep);
        } else {
            this.work(creep);
        }
    },

    harvest(creep) {
        // Pick least-targeted source in the room
        const sources = creep.room.find(FIND_SOURCES_ACTIVE);
        const source = _.min(sources, s => {
            return _.filter(Game.creeps, c =>
                c.memory.sourceId === s.id && c.id !== creep.id
            ).length;
        });

        if (source) {
            creep.memory.sourceId = source.id;
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    },

    work(creep) {
        // Priority 1: Fill spawn with energy so it can start spawning its own harvesters
        const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
        if (spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn, { reusePath: 5, visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        // Priority 2: Build spawn site (critical — room can't function without it)
        const spawnSite = creep.room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_SPAWN
        })[0];

        if (spawnSite) {
            if (creep.build(spawnSite) === ERR_NOT_IN_RANGE) {
                creep.moveTo(spawnSite, { reusePath: 5, visualizePathStyle: { stroke: '#33ff33' } });
            }
            return;
        }

        // If no spawn exists and no spawn site, place one near the controller
        if (!spawn) {
            const sites = creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: s => s.structureType === STRUCTURE_SPAWN
            });
            if (sites.length === 0) {
                this.placeSpawn(creep.room);
            }
        }

        // Priority 3: Build other construction sites
        const site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (site) {
            if (creep.build(site) === ERR_NOT_IN_RANGE) {
                creep.moveTo(site, { reusePath: 5, visualizePathStyle: { stroke: '#33ff33' } });
            }
            return;
        }

        // Priority 4: Upgrade controller
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, { reusePath: 5, visualizePathStyle: { stroke: '#8844ff' } });
        }
    },

    placeSpawn(room) {
        if (!room.controller) return;

        // Place spawn near controller on open terrain
        const terrain = room.getTerrain();
        const cx = room.controller.pos.x;
        const cy = room.controller.pos.y;

        for (let radius = 2; radius <= 6; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    const x = cx + dx;
                    const y = cy + dy;
                    if (x < 3 || x > 46 || y < 3 || y > 46) continue;
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                    const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                    const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                    if (structures.length === 0 && sites.length === 0) {
                        if (room.createConstructionSite(x, y, STRUCTURE_SPAWN) === OK) {
                            console.log(`📍 ${room.name}: Placed spawn site at ${x},${y}`);
                            return;
                        }
                    }
                }
            }
        }
    }
};
