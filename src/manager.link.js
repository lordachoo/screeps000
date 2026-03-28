/**
 * Link manager handles energy transfers between links.
 * Source links → controller link (priority) or storage link.
 * Runs every tick for responsive transfers. Activates at RCL 5.
 */
module.exports = {
    run(room) {
        if (room.controller.level < 5) return;

        // Cache link assignments, refresh every 500 ticks
        if (!room.memory.links || Game.time % 500 === 0) {
            this.assignLinks(room);
        }

        this.transferEnergy(room);
    },

    assignLinks(room) {
        const links = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LINK
        });

        if (links.length === 0) {
            room.memory.links = null;
            return;
        }

        const sources = room.find(FIND_SOURCES);
        const controller = room.controller;
        const storage = room.storage;

        const assignment = { sources: [], controller: null, storage: null };

        // Assign source links (within range 2 of a source)
        for (const source of sources) {
            const sourceLink = source.pos.findInRange(links, 2)[0];
            if (sourceLink) {
                assignment.sources.push(sourceLink.id);
            }
        }

        // Assign controller link (within range 4 of controller)
        const controllerLink = controller.pos.findInRange(links, 4).find(
            l => !assignment.sources.includes(l.id)
        );
        if (controllerLink) {
            assignment.controller = controllerLink.id;
        }

        // Assign storage link (within range 3 of storage)
        if (storage) {
            const storageLink = storage.pos.findInRange(links, 3).find(
                l => !assignment.sources.includes(l.id) && l.id !== assignment.controller
            );
            if (storageLink) {
                assignment.storage = storageLink.id;
            }
        }

        room.memory.links = assignment;
    },

    transferEnergy(room) {
        const linkData = room.memory.links;
        if (!linkData || linkData.sources.length === 0) return;

        // Determine receiver: controller link first, then storage link
        let receiver = null;
        if (linkData.controller) {
            receiver = Game.getObjectById(linkData.controller);
            if (receiver && receiver.store.getFreeCapacity(RESOURCE_ENERGY) < 100) {
                receiver = null; // Controller link is full
            }
        }
        if (!receiver && linkData.storage) {
            receiver = Game.getObjectById(linkData.storage);
            if (receiver && receiver.store.getFreeCapacity(RESOURCE_ENERGY) < 100) {
                receiver = null;
            }
        }

        if (!receiver) return;

        // Transfer from each source link
        for (const sourceLinkId of linkData.sources) {
            const sourceLink = Game.getObjectById(sourceLinkId);
            if (!sourceLink) continue;
            if (sourceLink.cooldown > 0) continue;
            if (sourceLink.store.getUsedCapacity(RESOURCE_ENERGY) < 100) continue;

            sourceLink.transferEnergy(receiver);

            // After transfer, check if receiver is now full — switch to alternate
            if (receiver.id === linkData.controller && linkData.storage) {
                const storageLink = Game.getObjectById(linkData.storage);
                if (storageLink && storageLink.store.getFreeCapacity(RESOURCE_ENERGY) >= 100) {
                    receiver = storageLink;
                }
            }
        }
    }
};
