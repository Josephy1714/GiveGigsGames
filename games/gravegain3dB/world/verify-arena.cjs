const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: {}, Math: Object.create(Math) };
for (const file of ['dungeon-generator.js', 'collision.js', '../entities/player.js', '../entities/enemy.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context);
}
const { GraveGainDungeonGenerator, GraveGainPhysicsController, GraveGainPlayerEntity, GraveGainEnemyEntity } = context.window;
const generator = new GraveGainDungeonGenerator();
const physics = new GraveGainPhysicsController();

for (let seed = 1; seed <= 32; seed++) {
    let state = seed;
    context.Math.random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
    const dungeon = generator.generate(seed);
    assert(dungeon.arena, `Seed ${seed} needs an arena`);
    const { room } = dungeon.arena;
    const x = (room.x + room.w / 2) * 48;
    const z = (room.y + room.h / 2) * 48;
    const player = new GraveGainPlayerEntity('human', 'warrior');
    const move = (dx, dz) => physics.moveEntityWithCollision(player, dx, dz, dungeon, [], 26);
    const tick = () => player.update(1 / 60, { keys: {} }, physics, dungeon);

    player.x = x - 88;
    player.y = z - 118;
    move(0, 118);
    assert(Math.abs(player.y - z) < 0.001);
    assert.equal(player.yElevation, 42);
    move(178, 0);
    assert(Math.abs(player.x - (x + 90)) < 0.001);
    assert.equal(player.yElevation, 84);
    move(0, 65);
    assert(Math.abs(player.y - (z + 65)) < 0.001);
    assert.equal(player.yElevation, 84);

    move(30, 0);
    for (let frame = 0; frame < 60; frame++) tick();
    assert.equal(player.yElevation, 0);
    assert(player.grounded);

    player.x = x - 60;
    player.y = z;
    player.grounded = false;
    player.platVy = 280;
    for (let frame = 0; frame < 30; frame++) {
        tick();
        assert(player.yElevation <= 10, 'Jump passed through the underside of the bridge');
    }

    const warden = Object.assign(Object.create(GraveGainEnemyEntity.prototype), {
        x: x - 88, y: z - 118, yElevation: 0, grounded: true, arenaPursuer: true, arenaWaypoint: 0,
        hp: 100, state: 'idle', speed: 145, radius: 12, kx: 0, ky: 0, attackTimer: 100,
        skull: { position: {} }, group3d: { position: { set() {} }, rotation: {} }
    });
    player.x = x + 35;
    player.y = z + 55;
    player.yElevation = 84;
    for (let frame = 0; frame < 360; frame++) warden.update(1 / 60, player, physics, dungeon, {});
    assert.equal(warden.yElevation, 84, 'Warden must reach the balcony');
    assert.equal(warden.arenaWaypoint, 3, 'Warden must follow both stairs');
    player.x = x - 126;
    player.y = z - 124;
    player.yElevation = 0;
    for (let frame = 0; frame < 360; frame++) warden.update(1 / 60, player, physics, dungeon, {});
    assert.equal(warden.yElevation, 0, `Warden must return to ground level (${warden.x - x}, ${warden.y - z})`);

    const pad = dungeon.arena.launchPad;
    for (const rate of [30, 60, 120]) {
        for (const offset of [-10, 0, 10]) {
            const jumper = new GraveGainPlayerEntity('human', 'warrior');
            jumper.x = pad.x;
            jumper.y = pad.z + offset;
            jumper.update(1 / rate, { keys: {} }, physics, dungeon);
            assert(!jumper.grounded, 'Pad must launch a grounded player');
            for (let frame = 0; frame < rate * 2 && !jumper.grounded; frame++) {
                jumper.update(1 / rate, { keys: {} }, physics, dungeon);
            }
            assert(jumper.grounded, 'Launch must end on a floor');
            assert.equal(jumper.yElevation, pad.landingHeight, `Seed ${seed}, ${rate} Hz, offset ${offset}`);
        }
    }

    assert.equal(dungeon.arena.overlookRooms.length, 2);
    for (const overlook of dungeon.arena.overlookRooms) {
        const roomX = (overlook.x + overlook.w / 2) * 48;
        const roomZ = (overlook.y + overlook.h / 2) * 48;
        const jumper = new GraveGainPlayerEntity('elf', 'warrior');
        jumper.x = roomX - 132;
        jumper.y = roomZ;
        physics.moveEntityWithCollision(jumper, 103, 0, dungeon, [], 26);
        assert.equal(jumper.yElevation, 42, 'The overlook stairs must reach the takeoff ledge');
        jumper.update(1 / 60, { keys: { KeyD: true, Space: true } }, physics, dungeon);
        for (let frame = 0; frame < 90 && !jumper.grounded; frame++) {
            const keys = jumper.x < roomX + 87 ? { KeyD: true } : { KeyA: true };
            jumper.update(1 / 60, { keys }, physics, dungeon);
        }
        assert.equal(jumper.yElevation, 84, `Seed ${seed}: overlook gap must be jumpable`);
    }
}

const jumper = new GraveGainPlayerEntity('elf', 'warrior');
jumper.update(1 / 60, { keys: { Space: true } }, physics, null);
let apex = jumper.yElevation;
while (!jumper.grounded) {
    jumper.update(1 / 60, { keys: {} }, physics, null);
    apex = Math.max(apex, jumper.yElevation);
}
assert(apex >= 95, 'Ordinary dungeon ceilings must allow a jump near 100 units');

for (const theme of Object.keys(GraveGainDungeonGenerator.THEMES)) {
    for (let floor = 1; floor <= 48; floor++) {
        let state = floor * 601;
        context.Math.random = () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 2 ** 32;
        };
        const dungeon = generator.generate(floor, theme);
        const { spawnRoom, grid, gridSize } = dungeon;
        const reachable = new Set();
        const queue = [[spawnRoom.cx, spawnRoom.cy]];
        for (let index = 0; index < queue.length; index++) {
            const [x, y] = queue[index];
            const key = x * gridSize + y;
            if (reachable.has(key)) continue;
            reachable.add(key);
            for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
                const cell = grid[nx]?.[ny];
                if (cell !== undefined && ![1, 3, 4, 6].includes(cell) && !reachable.has(nx * gridSize + ny)) {
                    queue.push([nx, ny]);
                }
            }
        }
        assert(dungeon.rooms.some(room => room.type === 'boss' || room.type === 'safespace'));
        for (const room of dungeon.rooms) {
            assert(reachable.has(room.cx * gridSize + room.cy), `${theme} floor ${floor}: unreachable ${room.type}`);
        }
    }
}
context.Math.random = () => 0.5;
for (const [floor, type] of [[1, 'safespace'], [3, 'boss']]) {
    const dungeon = generator.generate(floor);
    assert.equal(dungeon.rooms.length, 2);
    const exit = dungeon.rooms.find(room => room.type === type);
    assert(exit, 'Even a one-room random draw must receive the correct exit');
    const reached = generator.safeTilesFrom(dungeon.grid, dungeon.spawnRoom.cx, dungeon.spawnRoom.cy);
    assert(reached[exit.cx * dungeon.gridSize + exit.cy]);
}
console.log('Verified vertical traversal on 32 layouts and ground routes across all themes and forced one-room draws.');
