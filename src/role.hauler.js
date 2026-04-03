/**
 * Hauler shuttles energy from remote mining containers back to the home room.
 * CARRY-heavy body with 1 WORK part for repairing remote containers.
 */
module.exports = {
    run(creep) {
        if (creep.store.getFreeCapacity() === 0) {
            creep.memory.harvesting = false;
        }
        if (creep.store.getUsedCapacity() === 0) {
            creep.memory.harvesting = true;
        }

        if (creep.memory.harvesting) {
            this.collect(creep);
        } else {
            this.deliver(creep);
        }
    },

    collect(creep) {
        const targetRoom = creep.memory.targetRoom;

        // Travel to remote room
        if (creep.room.name !== targetRoom) {
            const exitDir = creep.room.findExitTo(targetRoom);
            const exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: '#00ff88' } });
            }
            return;
        }

        // In remote room — find energy to collect
        // Priority: containers > dropped energy > tombstones
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         s.store.getUsedCapacity(RESOURCE_ENERGY) > 50
        });

        if (container) {
            // Repair container if it's damaged (they decay fast in unowned rooms)
            if (container.hits < container.hitsMax * 0.8 && creep.pos.getRangeTo(container) <= 3) {
                creep.repair(container);
            }

            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { reusePath: 10, visualizePathStyle: { stroke: '#00ff88' } });
            }
            return;
        }

        // Pick up dropped energy
        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 20
        });
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { reusePath: 5 });
            }
            return;
        }

        // Pick up from tombstones
        const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
        if (tombstone) {
            if (creep.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(tombstone, { reusePath: 5 });
            }
            return;
        }

        // Nothing to collect — wait near source
        const source = Game.getObjectById(creep.memory.sourceId);
        if (source && creep.pos.getRangeTo(source) > 3) {
            creep.moveTo(source, { reusePath: 10 });
        }
    },

    deliver(creep) {
        // Deliver to nearest owned room, not necessarily spawn room
        const homeRoom = this.getNearestOwnedRoom(creep);

        // Travel home
        if (creep.room.name !== homeRoom) {
            const exitDir = creep.room.findExitTo(homeRoom);
            const exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        // If carrying non-energy resources (minerals), deliver to terminal or storage
        for (const resourceType in creep.store) {
            if (resourceType !== RESOURCE_ENERGY && creep.store.getUsedCapacity(resourceType) > 0) {
                const dest = creep.room.terminal || creep.room.storage;
                if (dest) {
                    if (creep.transfer(dest, resourceType) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(dest, { reusePath: 5 });
                    }
                    return;
                }
            }
        }

        // In home room — deliver energy (same priority as harvester)
        let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                          s.structureType === STRUCTURE_EXTENSION) &&
                         s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (!target) {
            target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER &&
                             s.store.getFreeCapacity(RESOURCE_ENERGY) > 200
            });
        }

        if (!target) {
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_STORAGE &&
                             s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
        }

        if (!target) {
            // Dump into upgrading if nothing else
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { reusePath: 5 });
            }
            return;
        }

        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { reusePath: 5, visualizePathStyle: { stroke: '#ffffff' } });
        }
    },

    getNearestOwnedRoom(creep) {
        // Cache the result so we don't recalculate every tick
        if (creep.memory.deliverRoom) {
            // Re-evaluate every 500 ticks in case rooms change
            if (Game.time % 500 !== 0) return creep.memory.deliverRoom;
        }

        const targetRoom = creep.memory.targetRoom;
        const ownedRooms = Object.values(Game.rooms).filter(r =>
            r.controller && r.controller.my && r.controller.level >= 2
        );

        if (ownedRooms.length === 0) return creep.memory.homeRoom;

        let nearest = creep.memory.homeRoom;
        let bestDist = Infinity;

        for (const room of ownedRooms) {
            const dist = Game.map.getRoomLinearDistance(targetRoom, room.name);
            if (dist < bestDist) {
                bestDist = dist;
                nearest = room.name;
            }
        }

        creep.memory.deliverRoom = nearest;
        return nearest;
    }
};
