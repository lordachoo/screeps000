/**
 * Lab worker shuttles reagents between storage/terminal and labs.
 * Body: CARRY-heavy + MOVE. Only 1 per room.
 * Loads input labs with reagents, empties output labs to storage/terminal.
 */
module.exports = {
    run(creep) {
        const labData = creep.room.memory.labs;
        const target = creep.room.memory.labTarget;
        if (!labData || !target) return;

        // If carrying something, deliver it
        if (creep.store.getUsedCapacity() > 0) {
            this.deliver(creep, labData, target);
        } else {
            this.collect(creep, labData, target);
        }
    },

    collect(creep, labData, target) {
        // Priority 1: Empty output labs that have product
        for (const outputId of labData.outputs) {
            const lab = Game.getObjectById(outputId);
            if (!lab) continue;
            if (lab.store.getUsedCapacity(lab.mineralType) > 0 && lab.mineralType) {
                if (creep.withdraw(lab, lab.mineralType) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(lab, { reusePath: 5, visualizePathStyle: { stroke: '#ff88ff' } });
                }
                return;
            }
        }

        // Priority 2: Load input labs that need reagents
        const input1 = Game.getObjectById(labData.inputs[0]);
        const input2 = Game.getObjectById(labData.inputs[1]);

        // Check if input 1 needs reagent 1
        if (input1 && input1.store.getUsedCapacity(target.reagent1) < 1000) {
            const source = this.findResource(creep, target.reagent1);
            if (source) {
                if (creep.withdraw(source, target.reagent1, Math.min(
                    creep.store.getFreeCapacity(),
                    1000 - (input1.store.getUsedCapacity(target.reagent1) || 0)
                )) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { reusePath: 5 });
                }
                return;
            }
        }

        // Check if input 2 needs reagent 2
        if (input2 && input2.store.getUsedCapacity(target.reagent2) < 1000) {
            const source = this.findResource(creep, target.reagent2);
            if (source) {
                if (creep.withdraw(source, target.reagent2, Math.min(
                    creep.store.getFreeCapacity(),
                    1000 - (input2.store.getUsedCapacity(target.reagent2) || 0)
                )) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { reusePath: 5 });
                }
                return;
            }
        }

        // Nothing to do — idle near labs
        if (input1 && creep.pos.getRangeTo(input1) > 3) {
            creep.moveTo(input1, { reusePath: 10 });
        }
    },

    deliver(creep, labData, target) {
        // If carrying a reagent, deliver to the correct input lab
        if (creep.store.getUsedCapacity(target.reagent1) > 0) {
            const input1 = Game.getObjectById(labData.inputs[0]);
            if (input1) {
                if (creep.transfer(input1, target.reagent1) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(input1, { reusePath: 5 });
                }
                return;
            }
        }

        if (creep.store.getUsedCapacity(target.reagent2) > 0) {
            const input2 = Game.getObjectById(labData.inputs[1]);
            if (input2) {
                if (creep.transfer(input2, target.reagent2) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(input2, { reusePath: 5 });
                }
                return;
            }
        }

        // Carrying product or other stuff — dump to terminal (preferred) or storage
        for (const resourceType in creep.store) {
            const dest = creep.room.terminal || creep.room.storage;
            if (dest) {
                if (creep.transfer(dest, resourceType) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dest, { reusePath: 5 });
                }
                return;
            }
        }
    },

    findResource(creep, resourceType) {
        // Check terminal first, then storage
        const terminal = creep.room.terminal;
        if (terminal && terminal.store.getUsedCapacity(resourceType) > 0) {
            return terminal;
        }
        const storage = creep.room.storage;
        if (storage && storage.store.getUsedCapacity(resourceType) > 0) {
            return storage;
        }
        return null;
    }
};
