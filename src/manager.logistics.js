/**
 * Multi-room logistics manager.
 * Balances energy and minerals between rooms via terminals.
 * Runs every 200 ticks. Called ONCE (not per room).
 */
module.exports = {
    run() {
        if (Game.time % 200 !== 0) return;

        const terminalRooms = this.getTerminalRooms();
        if (terminalRooms.length < 2) return;

        this.balanceEnergy(terminalRooms);
        this.distributeMinerals(terminalRooms);
    },

    getTerminalRooms() {
        const rooms = [];
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller && room.controller.my && room.terminal) {
                rooms.push(room);
            }
        }
        return rooms;
    },

    balanceEnergy(rooms) {
        const surplus = []; // rooms with >200k energy
        const deficit = []; // rooms with <50k energy

        for (const room of rooms) {
            const energy = (room.storage ? room.storage.store.getUsedCapacity(RESOURCE_ENERGY) : 0) +
                           room.terminal.store.getUsedCapacity(RESOURCE_ENERGY);

            if (energy > 200000) {
                surplus.push({ room, energy });
            } else if (energy < 50000) {
                deficit.push({ room, energy });
            }
        }

        if (surplus.length === 0 || deficit.length === 0) return;

        // Sort: most surplus first, most deficit first
        surplus.sort((a, b) => b.energy - a.energy);
        deficit.sort((a, b) => a.energy - b.energy);

        for (const def of deficit) {
            for (const sur of surplus) {
                if (sur.room.terminal.cooldown > 0) continue;

                const sendAmount = Math.min(25000, sur.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) - 10000);
                if (sendAmount <= 0) continue;

                const cost = Game.market.calcTransactionCost(sendAmount, sur.room.name, def.room.name);
                if (sur.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < sendAmount + cost) continue;

                const result = sur.room.terminal.send(RESOURCE_ENERGY, sendAmount, def.room.name);
                if (result === OK) {
                    console.log(`📦 Logistics: Sent ${sendAmount} energy from ${sur.room.name} to ${def.room.name}`);
                    break; // One send per deficit room per cycle
                }
            }
        }
    },

    distributeMinerals(rooms) {
        // Check if any room needs minerals for lab reactions that another room has
        for (const room of rooms) {
            const labTarget = room.memory.labTarget;
            if (!labTarget) continue;

            const needed = [labTarget.reagent1, labTarget.reagent2];
            for (const mineral of needed) {
                const have = (room.storage ? room.storage.store.getUsedCapacity(mineral) || 0 : 0) +
                             (room.terminal.store.getUsedCapacity(mineral) || 0);

                if (have >= 1000) continue; // Enough

                // Find a room that has excess of this mineral
                for (const donor of rooms) {
                    if (donor.name === room.name) continue;
                    if (donor.terminal.cooldown > 0) continue;

                    const donorHas = donor.terminal.store.getUsedCapacity(mineral) || 0;
                    if (donorHas < 2000) continue; // Keep some for themselves

                    const sendAmount = Math.min(1000, donorHas - 1000);
                    const result = donor.terminal.send(mineral, sendAmount, room.name);
                    if (result === OK) {
                        console.log(`📦 Logistics: Sent ${sendAmount} ${mineral} from ${donor.name} to ${room.name}`);
                        break;
                    }
                }
            }
        }
    }
};
