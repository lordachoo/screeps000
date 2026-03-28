/**
 * Lab manager handles mineral reactions and compound production.
 * Runs every 50 ticks. Activates when 3+ labs exist (RCL 6).
 */

// Reaction recipes: input1 + input2 = output
const RECIPES = {
    // Tier 1 compounds
    OH: [RESOURCE_OXYGEN, RESOURCE_HYDROGEN],
    ZK: [RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM],
    UL: [RESOURCE_UTRIUM, RESOURCE_LEMERGIUM],
    G: [RESOURCE_ZYNTHIUM_KEANITE, RESOURCE_UTRIUM_LEMERGITE],

    // Upgrade boost line (GH → GH2O → XGH2O)
    GH: [RESOURCE_GHODIUM, RESOURCE_HYDROGEN],
    GH2O: [RESOURCE_GHODIUM_HYDRIDE, RESOURCE_HYDROXIDE],
    XGH2O: [RESOURCE_GHODIUM_ACID, RESOURCE_CATALYZED_GHODIUM_ACID],

    // Tough boost line (GO → GHO2 → XGHO2)
    GO: [RESOURCE_GHODIUM, RESOURCE_OXYGEN],
    GHO2: [RESOURCE_GHODIUM_OXIDE, RESOURCE_HYDROXIDE],
    XGHO2: [RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYST],

    // Ranged attack boost (KO → KHO2 → XKHO2)
    KO: [RESOURCE_KEANIUM, RESOURCE_OXYGEN],
    KHO2: [RESOURCE_KEANIUM_OXIDE, RESOURCE_HYDROXIDE],
    XKHO2: [RESOURCE_KEANIUM_ALKALIDE, RESOURCE_CATALYST],

    // Heal boost (LO → LHO2 → XLHO2)
    LO: [RESOURCE_LEMERGIUM, RESOURCE_OXYGEN],
    LHO2: [RESOURCE_LEMERGIUM_OXIDE, RESOURCE_HYDROXIDE],
    XLHO2: [RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYST],

    // Harvest boost (UO → UHO2 → XUHO2)
    UO: [RESOURCE_UTRIUM, RESOURCE_OXYGEN],
    UHO2: [RESOURCE_UTRIUM_OXIDE, RESOURCE_HYDROXIDE],
    XUHO2: [RESOURCE_UTRIUM_ALKALIDE, RESOURCE_CATALYST],
};

// Priority order for production
const PRODUCTION_PRIORITY = [
    'XGH2O',  // +100% upgradeController
    'XLHO2',  // +300% heal
    'XKHO2',  // +300% rangedAttack
    'XGHO2',  // +300% tough
    'XUHO2',  // +600% harvest
];

module.exports = {
    run(room) {
        if (Game.time % 50 !== 0) return;

        const labs = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LAB
        });

        if (labs.length < 3) return;

        // Assign labs if not done
        if (!room.memory.labs || Game.time % 1000 === 0) {
            this.assignLabs(room, labs);
        }

        // Plan what to produce
        const target = this.planProduction(room);
        if (target) {
            room.memory.labTarget = target;
        }

        // Run reactions
        this.runReactions(room);
    },

    assignLabs(room, labs) {
        // Pick 2 input labs closest to each other, rest are output
        let bestPair = null;
        let bestDist = Infinity;

        for (let i = 0; i < labs.length; i++) {
            for (let j = i + 1; j < labs.length; j++) {
                const dist = labs[i].pos.getRangeTo(labs[j].pos);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestPair = [labs[i].id, labs[j].id];
                }
            }
        }

        if (!bestPair) return;

        const outputs = labs
            .filter(l => !bestPair.includes(l.id))
            .filter(l => {
                // Output labs must be in range 2 of BOTH input labs
                const input1 = Game.getObjectById(bestPair[0]);
                const input2 = Game.getObjectById(bestPair[1]);
                return l.pos.getRangeTo(input1) <= 2 && l.pos.getRangeTo(input2) <= 2;
            })
            .map(l => l.id);

        room.memory.labs = {
            inputs: bestPair,
            outputs
        };
    },

    planProduction(room) {
        const storage = room.storage;
        const terminal = room.terminal;
        if (!storage && !terminal) return null;

        // Check what we can produce based on available resources
        const available = {};
        if (storage) {
            for (const res in storage.store) {
                available[res] = (available[res] || 0) + storage.store.getUsedCapacity(res);
            }
        }
        if (terminal) {
            for (const res in terminal.store) {
                available[res] = (available[res] || 0) + terminal.store.getUsedCapacity(res);
            }
        }

        // Try each priority compound
        for (const compound of PRODUCTION_PRIORITY) {
            const recipe = RECIPES[compound];
            if (!recipe) continue;

            // Check if we have at least some of both ingredients
            if ((available[recipe[0]] || 0) >= 5 && (available[recipe[1]] || 0) >= 5) {
                return { compound, reagent1: recipe[0], reagent2: recipe[1] };
            }
        }

        // Try intermediate compounds
        for (const compound in RECIPES) {
            if (PRODUCTION_PRIORITY.includes(compound)) continue;
            const recipe = RECIPES[compound];
            if ((available[recipe[0]] || 0) >= 5 && (available[recipe[1]] || 0) >= 5) {
                return { compound, reagent1: recipe[0], reagent2: recipe[1] };
            }
        }

        return null;
    },

    runReactions(room) {
        const labData = room.memory.labs;
        const target = room.memory.labTarget;
        if (!labData || !target) return;

        const input1 = Game.getObjectById(labData.inputs[0]);
        const input2 = Game.getObjectById(labData.inputs[1]);
        if (!input1 || !input2) return;

        // Check inputs have the right reagents
        if (input1.mineralType && input1.mineralType !== target.reagent1) return;
        if (input2.mineralType && input2.mineralType !== target.reagent2) return;

        // Run reaction on each output lab
        for (const outputId of labData.outputs) {
            const output = Game.getObjectById(outputId);
            if (!output) continue;
            if (output.cooldown > 0) continue;

            output.runReaction(input1, input2);
        }
    }
};
