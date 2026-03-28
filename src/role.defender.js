/**
 * Defenders attack hostile creeps and heal friendly ones.
 * They patrol near the spawn when idle and rush hostiles when detected.
 */
module.exports = {
    run(creep) {
        const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);

        if (hostiles.length > 0) {
            this.fight(creep, hostiles);
        } else {
            this.patrol(creep);
        }
    },

    fight(creep, hostiles) {
        // Target the most dangerous hostile (most ATTACK/RANGED parts)
        const target = _.max(hostiles, h => {
            return h.getActiveBodyparts(ATTACK) * 2 +
                   h.getActiveBodyparts(RANGED_ATTACK) * 2 +
                   h.getActiveBodyparts(HEAL);
        });

        if (creep.attack(target) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { reusePath: 1, visualizePathStyle: { stroke: '#ff0000' } });
        }

        // If we have RANGED_ATTACK parts, use them too
        if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
            const inRange = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
            if (inRange.length > 1) {
                creep.rangedMassAttack();
            } else if (inRange.length === 1) {
                creep.rangedAttack(inRange[0]);
            }
        }
    },

    patrol(creep) {
        // Rally near the spawn
        const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
        if (spawn && creep.pos.getRangeTo(spawn) > 5) {
            creep.moveTo(spawn, { reusePath: 10 });
        }
    }
};
