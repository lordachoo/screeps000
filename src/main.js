// Home economy roles
const roleHarvester = require('role.harvester');
const roleMiner = require('role.miner');
const roleBasehauler = require('role.basehauler');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleRepairer = require('role.repairer');
const roleDefender = require('role.defender');

// Expansion roles
const roleScout = require('role.scout');
const roleRemoteMiner = require('role.remoteMiner');
const roleHauler = require('role.hauler');
const roleReserver = require('role.reserver');
const roleClaimer = require('role.claimer');
const rolePioneer = require('role.pioneer');

// Phase 2 roles
const roleRangedDefender = require('role.rangedDefender');
const roleMineralMiner = require('role.mineralMiner');
const roleLabWorker = require('role.labWorker');

// Managers
const spawnManager = require('manager.spawn');
const towerManager = require('manager.tower');
const roomPlanner = require('manager.room');
const expansionManager = require('manager.expansion');
const linkManager = require('manager.link');
const marketManager = require('manager.market');
const labManager = require('manager.lab');
const logisticsManager = require('manager.logistics');

module.exports.loop = function () {
    // Cache username from owned room controller
    if (!Memory.username) {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller && room.controller.my && room.controller.owner) {
                Memory.username = room.controller.owner.username;
                break;
            }
        }
    }

    // Clean up memory of dead creeps
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }

    // Stats dashboard — log every 100 ticks (~3 min)
    if (Game.time % 100 === 0) {
        reportStats();
    }

    // Run each owned room
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my) continue;

        // Spawn management
        spawnManager.run(room);

        // Tower management
        towerManager.run(room);

        // Auto-build construction sites when we level up
        roomPlanner.run(room);

        // Expansion management (remote mining, claiming)
        expansionManager.run(room);

        // Link energy transfers (runs every tick)
        linkManager.run(room);

        // Market buy/sell (throttled)
        marketManager.run(room);

        // Lab reactions (throttled)
        labManager.run(room);
    }

    // Multi-room logistics (runs once, not per room)
    logisticsManager.run();

    // Run creep roles
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];

        switch (creep.memory.role) {
            case 'harvester':
                roleHarvester.run(creep);
                break;
            case 'miner':
                roleMiner.run(creep);
                break;
            case 'basehauler':
                roleBasehauler.run(creep);
                break;
            case 'upgrader':
                roleUpgrader.run(creep);
                break;
            case 'builder':
                roleBuilder.run(creep);
                break;
            case 'repairer':
                roleRepairer.run(creep);
                break;
            case 'defender':
                roleDefender.run(creep);
                break;
            case 'scout':
                roleScout.run(creep);
                break;
            case 'remoteMiner':
                roleRemoteMiner.run(creep);
                break;
            case 'hauler':
                roleHauler.run(creep);
                break;
            case 'reserver':
                roleReserver.run(creep);
                break;
            case 'claimer':
                roleClaimer.run(creep);
                break;
            case 'pioneer':
                rolePioneer.run(creep);
                break;
            case 'rangedDefender':
                roleRangedDefender.run(creep);
                break;
            case 'mineralMiner':
                roleMineralMiner.run(creep);
                break;
            case 'labWorker':
                roleLabWorker.run(creep);
                break;
        }
    }
};

function reportStats() {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my) continue;

        const ctrl = room.controller;
        const progress = ctrl.progress;
        const total = ctrl.progressTotal;
        const pct = total ? (progress / total * 100).toFixed(1) : 0;

        // Track progress/hour
        if (!Memory.stats) Memory.stats = {};
        if (!Memory.stats[roomName]) Memory.stats[roomName] = { lastProgress: 0, lastTick: 0 };

        const stats = Memory.stats[roomName];
        const tickDelta = Game.time - stats.lastTick;
        const progressDelta = progress - stats.lastProgress;

        // Calculate per-hour rate (1 tick ≈ 2-3 seconds, ~1200-1800 ticks/hour)
        let perHour = 0;
        if (tickDelta > 0 && stats.lastTick > 0) {
            const perTick = progressDelta / tickDelta;
            perHour = Math.round(perTick * 1500); // ~1500 ticks/hour average
        }

        // Estimate time to next level
        let eta = '';
        if (perHour > 0) {
            const remaining = total - progress;
            const hoursLeft = remaining / perHour;
            if (hoursLeft < 1) {
                eta = Math.round(hoursLeft * 60) + 'min';
            } else {
                eta = hoursLeft.toFixed(1) + 'hrs';
            }
        }

        // Count creeps by role
        const roles = {};
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const home = creep.memory.homeRoom || creep.room.name;
            if (home === roomName) {
                roles[creep.memory.role] = (roles[creep.memory.role] || 0) + 1;
            }
        }
        const creepSummary = Object.entries(roles).map(([r, c]) => `${r}:${c}`).join(' ');

        // Energy stats
        const stored = room.storage ? room.storage.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
        const energyStr = stored > 0 ? ` | Stored: ${(stored / 1000).toFixed(1)}k` : '';

        console.log(`📊 ${roomName} | RCL ${ctrl.level} ${pct}% (${progress}/${total}) | ${perHour}/hr | ETA: ${eta || '---'} | CPU: ${Game.cpu.getUsed().toFixed(1)}${energyStr}`);
        console.log(`   Creeps: ${creepSummary}`);

        // Update tracking
        stats.lastProgress = progress;
        stats.lastTick = Game.time;
    }
}
