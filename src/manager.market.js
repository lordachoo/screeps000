/**
 * Market manager handles terminal buy/sell operations.
 * Runs every 100 ticks. Activates when terminal exists (RCL 6).
 */
module.exports = {
    run(room) {
        if (Game.time % 100 !== 0) return;
        if (!room.terminal) return;
        if (room.terminal.cooldown > 0) return;

        this.manageSellOrders(room);
        this.evaluateDeals(room);
    },

    manageSellOrders(room) {
        const terminal = room.terminal;

        // Sell excess minerals (keep 5000, sell the rest)
        for (const resourceType in terminal.store) {
            if (resourceType === RESOURCE_ENERGY) continue;

            const amount = terminal.store.getUsedCapacity(resourceType);
            if (amount <= 5000) continue;

            const sellAmount = amount - 5000;

            // Check if we already have a sell order for this resource
            const existingOrder = _.find(Game.market.orders, o =>
                o.roomName === room.name &&
                o.type === ORDER_SELL &&
                o.resourceType === resourceType &&
                o.active
            );

            if (existingOrder) continue;

            // Get market price history
            const history = Game.market.getHistory(resourceType);
            if (history.length === 0) continue;

            const avgPrice = history[history.length - 1].avgPrice;
            const price = Math.max(avgPrice * 0.9, 0.01); // Slightly below average

            const result = Game.market.createOrder({
                type: ORDER_SELL,
                resourceType,
                price,
                totalAmount: Math.min(sellAmount, 10000),
                roomName: room.name
            });

            if (result === OK) {
                console.log(`💰 ${room.name}: Created sell order for ${sellAmount} ${resourceType} at ${price}`);
            }
        }
    },

    evaluateDeals(room) {
        const terminal = room.terminal;
        const storage = room.storage;
        if (!storage) return;

        // Only buy if we have plenty of energy
        const energyReserve = storage.store.getUsedCapacity(RESOURCE_ENERGY);
        if (energyReserve < 100000) return;

        // Look for cheap energy deals if we're low
        if (energyReserve < 50000) {
            const orders = Game.market.getAllOrders({
                type: ORDER_SELL,
                resourceType: RESOURCE_ENERGY
            });

            const cheapOrders = orders.filter(o => o.price <= 0.05 && o.amount >= 1000);
            if (cheapOrders.length > 0) {
                const best = _.min(cheapOrders, 'price');
                const amount = Math.min(best.amount, 10000);
                const cost = Game.market.calcTransactionCost(amount, room.name, best.roomName);

                if (terminal.store.getUsedCapacity(RESOURCE_ENERGY) > cost) {
                    Game.market.deal(best.id, amount, room.name);
                }
            }
        }
    }
};
