const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleRepairer = require('role.repairer');
const roleDefender = require('role.defender');
const roleScout = require('role.scout');
const roleRemoteMiner = require('role.remoteMiner');
const roleHauler = require('role.hauler');
const roleReserver = require('role.reserver');
const roleClaimer = require('role.claimer');
const rolePioneer = require('role.pioneer');
const spawnManager = require('manager.spawn');
const towerManager = require('manager.tower');
const roomPlanner = require('manager.room');
const expansionManager = require('manager.expansion');

module.exports.loop = function () {
    // Clean up memory of dead creeps
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
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
    }

    // Run creep roles
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];

        switch (creep.memory.role) {
            case 'harvester':
                roleHarvester.run(creep);
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
        }
    }
};
