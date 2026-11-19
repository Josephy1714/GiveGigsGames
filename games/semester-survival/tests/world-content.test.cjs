'use strict';
const assert = require('node:assert/strict');
const world = require('../world-content.js');
assert.equal(world.validate(), true);
assert.deepEqual(Object.keys(world.districts).sort(), ['campus','city','residence','township']);
assert.equal(world.semesterArcs.length, 8);
assert.ok(world.semesterArcs.every((arc, i) => arc.semester === i + 1 && arc.chapters.length >= 3));
assert.equal(world.characters.amina.name, 'Amina');
assert.equal(world.characters.jay.role, 'Protagonist');
assert.equal(world.characters.einstein.name, 'Einstein');
assert.equal(world.characters.ernest.name, 'Ernest');
assert.equal(world.characters.sumeya.name, 'Sumeya');
assert.match(world.characters.amina.visualProfile.clothing, /hijab/);
assert.match(world.characters.sumeya.visualProfile.clothing, /hijab/);
assert.equal(world.characters.amina.visualProfile.status, 'model-sheet-required');
assert.equal(world.characters.sumeya.visualProfile.status, 'model-sheet-required');
assert.ok(['brian', 'wanjiku', 'njeri', 'mwangi'].every(id => world.characters[id]));
assert.ok(world.districts.township.places.some(place => place.id === 'mama-njeri-kiosk'));
console.log('world-content tests passed');

for (const id of ['brian','amina','sumeya','einstein','ernest','wanjiku','njeri','mwangi']) {
 const character = world.characters[id];
 assert.ok(Array.isArray(character.conversationChoices) && character.conversationChoices.length >= 2, id + ' needs authored social choices');
 assert.equal(new Set(character.conversationChoices.map(choice => choice.id)).size, character.conversationChoices.length);
}
