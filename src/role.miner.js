/**
 * Home miner — static miner for home room sources.
 * No CARRY parts. Parks on container next to source and mines continuously.
 * Energy drops directly into container for basehauler to collect.
 */
module.exports = {
    run(creep) {
        // Assign source if not already set
        if (!creep.memory.sourceId) {
            const sources = creep.room.find(FIND_SOURCES);
            const source = _.min(sources, s =>
                _.filter(Game.creeps, c =>
                    c.memory.role === 'miner' && c.memory.sourceId === s.id
                ).length
            );
            if (source) creep.memory.sourceId = source.id;
        }

        const source = Game.getObjectById(creep.memory.sourceId);
        if (!source) return;

        // Park on the container adjacent to source if one exists
        const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        if (container && !creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container.pos, { reusePath: 10, visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // Mine — if no container yet, park adjacent to source
        const result = creep.harvest(source);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { reusePath: 10, visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
};
