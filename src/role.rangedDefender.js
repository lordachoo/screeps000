/**
 * Ranged defender kites hostile creeps at range 3.
 * Uses rangedAttack/rangedMassAttack + self-heal.
 * Body: TOUGH + RANGED_ATTACK + MOVE + HEAL at end.
 */
module.exports = {
    run(creep) {
        const whitelist = Memory.whitelist || [];
        const hostiles = creep.room.find(FIND_HOSTILE_CREEPS, {
            filter: c => !whitelist.includes(c.owner.username)
        });

        if (hostiles.length > 0) {
            this.fight(creep, hostiles);
        } else {
            this.patrol(creep);
        }

        // Always self-heal if damaged and have HEAL parts
        if (creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL) > 0) {
            creep.heal(creep);
        }
    },

    fight(creep, hostiles) {
        // Score hostiles: prioritize healers
        const target = _.max(hostiles, h => {
            return h.getActiveBodyparts(HEAL) * 3 +
                   h.getActiveBodyparts(RANGED_ATTACK) * 2 +
                   h.getActiveBodyparts(ATTACK) * 1;
        });

        const range = creep.pos.getRangeTo(target);

        // Kite: maintain range 3 from melee threats
        const hasMelee = target.getActiveBodyparts(ATTACK) > 0;

        if (hasMelee && range < 3) {
            // Move away from target
            const direction = target.pos.getDirectionTo(creep.pos);
            creep.move(direction);
        } else if (range > 3) {
            // Move closer to get in range
            creep.moveTo(target, { reusePath: 1, visualizePathStyle: { stroke: '#ff4444' } });
        }

        // Attack
        const inRange = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
        if (inRange.length >= 3) {
            creep.rangedMassAttack();
        } else if (inRange.length > 0) {
            creep.rangedAttack(inRange[0]);
        }
    },

    patrol(creep) {
        const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
        if (spawn && creep.pos.getRangeTo(spawn) > 5) {
            creep.moveTo(spawn, { reusePath: 10 });
        }
    }
};
