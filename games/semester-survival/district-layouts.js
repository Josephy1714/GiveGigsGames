/* Semester Survival — authored district geometry and interaction layout contracts.
 * Geometry is production layout metadata, not artwork. The referenced local art assets
 * must be supplied, dimension-checked and credited before the adventure can start.
 */
(function (root) {
  'use strict';

  const VIEW_WIDTH = 960;
  const VIEW_HEIGHT = 540;
  const WORLD_WIDTH = 2880;
  const WORLD_HEIGHT = 1080;
  const GROUND = 850;
  const DEPTH = Object.freeze({ min: -120, max: 120 });
  const PLAYER = Object.freeze({ minX: 120, maxX: 2760 });
  const CAMERA = Object.freeze({ minX: 0, minY: 0, maxX: WORLD_WIDTH - VIEW_WIDTH, maxY: WORLD_HEIGHT - VIEW_HEIGHT });

  const definitions = {
    residence: {
      sceneId: 'residence-courtyard-v1',
      assetPrefix: 'residence',
      spawn: { x: 300, depth: 0 },
      incoming: { township: { x: 2500, depth: 0 }, campus: { x: 2680, depth: 0 } },
      places: {
        room:  { x: 360, y: 610, width: 230, height: 230 },
        courtyard: { x: 1120, y: 590, width: 260, height: 250 },
        laundry: { x: 1960, y: 610, width: 230, height: 230 }
      },
      npcs: [{ characterId: 'brian', anchor: 'npc-brian', x: 1240, y: 600, radius: 190 }],
      routes: { township: 'courtyard-east', campus: 'courtyard-west' }
    },
    township: {
      sceneId: 'township-main-street-v1',
      assetPrefix: 'township',
      spawn: { x: 320, depth: 0 },
      incoming: {
        residence: { x: 2500, depth: 0 }, campus: { x: 2680, depth: 0 },
        city: { x: 2360, depth: 0 }
      },
      places: {
        'mama-njeri-kiosk': { x: 320, y: 610, width: 240, height: 230 },
        'print-hub': { x: 760, y: 610, width: 240, height: 230 },
        barber: { x: 1200, y: 610, width: 230, height: 230 },
        'mini-mart': { x: 1630, y: 610, width: 230, height: 230 },
        'matatu-stage': { x: 2070, y: 590, width: 270, height: 250 },
        'study-cafe': { x: 2500, y: 610, width: 230, height: 230 }
      },
      npcs: [{ characterId: 'njeri', anchor: 'npc-njeri', x: 430, y: 585, radius: 200 }],
      routes: { residence: 'residential-road', campus: 'university-road', city: 'city-bound-stage' }
    },
    campus: {
      sceneId: 'campus-academic-quad-v1',
      assetPrefix: 'campus',
      spawn: { x: 300, depth: 0 },
      incoming: {
        residence: { x: 2520, depth: 0 }, township: { x: 2700, depth: 0 },
        city: { x: 2320, depth: 0 }
      },
      places: {
        'main-gate': { x: 220, y: 610, width: 230, height: 230 },
        'lecture-hall': { x: 620, y: 590, width: 270, height: 250 },
        library: { x: 1040, y: 590, width: 250, height: 250 },
        'data-lab': { x: 1460, y: 590, width: 250, height: 250 },
        'student-commons': { x: 1860, y: 610, width: 250, height: 230 },
        administration: { x: 2260, y: 610, width: 250, height: 230 },
        'lecturer-office': { x: 2640, y: 590, width: 220, height: 250 }
      },
      npcs: [
        { characterId: 'amina', anchor: 'npc-amina', x: 790, y: 570, radius: 190 },
        { characterId: 'wanjiku', anchor: 'npc-wanjiku', x: 1900, y: 580, radius: 190 },
        { characterId: 'mwangi', anchor: 'npc-mwangi', x: 2710, y: 570, radius: 190 }
      ],
      routes: { residence: 'residence-walkway', township: 'township-road', city: 'city-shuttle-stop' }
    },
    city: {
      sceneId: 'nairobi-opportunity-district-v1',
      assetPrefix: 'city',
      spawn: { x: 300, depth: 0 },
      incoming: { township: { x: 2580, depth: 0 }, campus: { x: 2700, depth: 0 } },
      places: {
        'career-centre': { x: 350, y: 590, width: 260, height: 250 },
        'interview-suite': { x: 980, y: 590, width: 260, height: 250 },
        bookshop: { x: 1640, y: 610, width: 250, height: 230 },
        'innovation-hub': { x: 2350, y: 590, width: 280, height: 250 }
      },
      npcs: [{ characterId: 'wanjiku', anchor: 'npc-wanjiku-city', x: 1110, y: 565, radius: 190 }],
      routes: { township: 'township-coach-stop', campus: 'campus-shuttle-stop' }
    }
  };

  function assetId(district, layer) { return district + '-' + layer + '-art'; }
  function buildScene(districtId, definition, world) {
    const district = world.districts[districtId];
    if (!district) throw new Error('Unknown district layout: ' + districtId);
    const placeIds = new Set(district.places.map(function (place) { return place.id; }));
    const layoutIds = Object.keys(definition.places);
    if (placeIds.size !== layoutIds.length || layoutIds.some(function (id) { return !placeIds.has(id); })) {
      throw new Error('District layout must define exactly one hotspot for every world place in "' + districtId + '".');
    }
    const hotspots = Object.create(null);
    const interactables = Object.create(null);
    Object.keys(definition.places).forEach(function (placeId) {
      const bounds = definition.places[placeId];
      const anchor = 'place-' + placeId;
      hotspots[anchor] = bounds;
      interactables[placeId] = { anchor: anchor, radius: 180 };
    });
    const npcAnchors = definition.npcs.map(function (npc) {
      if (!world.characters[npc.characterId]) throw new Error('Unknown NPC in district layout: ' + npc.characterId);
      hotspots[npc.anchor] = { x: npc.x, y: npc.y, width: 150, height: 220 };
      return { characterId: npc.characterId, anchor: npc.anchor, radius: npc.radius };
    });
    const layers = ['background', 'midground', 'foreground'].map(function (layer, index) {
      return {
        id: districtId + '-' + layer,
        assetId: assetId(districtId, layer),
        x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT,
        zIndex: index, parallax: [0.18, 0.58, 1][index], fit: 'stretch'
      };
    });
    const spawnPoints = { default: definition.spawn };
    Object.keys(definition.incoming).forEach(function (origin) {
      spawnPoints['from-' + origin] = definition.incoming[origin];
    });
    return {
      sceneId: definition.sceneId,
      requiredAssetIds: ['background', 'midground', 'foreground'].map(function (layer) { return assetId(districtId, layer); }),
      spawnPoints: spawnPoints,
      interactables: interactables,
      npcAnchors: npcAnchors,
      routes: Object.keys(definition.routes).map(function (destination) {
        return { destination: destination, gate: definition.routes[destination], spawn: 'from-' + destination };
      }),
      render: {
        width: VIEW_WIDTH, height: VIEW_HEIGHT, worldBounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
        groundY: GROUND, depthScale: 0.72,
        depthBounds: DEPTH, playerBounds: PLAYER, cameraBounds: CAMERA,
        layers: layers, hotspots: hotspots
      }
    };
  }

  function createSceneManifest(world) {
    world = world || root.SemesterWorldContent;
    if (!world || !world.districts) throw new Error('World content is required to build district layouts.');
    const result = Object.create(null);
    Object.keys(definitions).forEach(function (districtId) {
      result[districtId] = buildScene(districtId, definitions[districtId], world);
    });
    return result;
  }

  function validate(world) {
    world = world || root.SemesterWorldContent;
    if (!world || typeof world.validate !== 'function') throw new Error('Valid world content is required.');
    world.validate();
    const manifest = createSceneManifest(world);
    Object.keys(manifest).forEach(function (districtId) {
      const scene = manifest[districtId];
      const render = scene.render;
      Object.keys(scene.spawnPoints).forEach(function (id) {
        const point = scene.spawnPoints[id];
        if (point.x < render.playerBounds.minX || point.x > render.playerBounds.maxX ||
            point.depth < render.depthBounds.min || point.depth > render.depthBounds.max) {
          throw new Error('Spawn "' + id + '" is outside district bounds: ' + districtId);
        }
      });
      Object.keys(scene.interactables).forEach(function (placeId) {
        if (!render.hotspots[scene.interactables[placeId].anchor]) throw new Error('Missing place hotspot: ' + districtId + '/' + placeId);
      });
      scene.npcAnchors.forEach(function (npc) {
        if (!world.characters[npc.characterId] || !render.hotspots[npc.anchor]) throw new Error('Missing NPC hotspot: ' + districtId + '/' + npc.characterId);
      });
      scene.routes.forEach(function (route) {
        if (!world.districts[districtId].exits.includes(route.destination) ||
            !world.districts[route.destination].exits.includes(districtId) ||
            !scene.spawnPoints[route.spawn]) throw new Error('Invalid reciprocal route layout: ' + districtId + ' -> ' + route.destination);
      });
      if (scene.requiredAssetIds.length !== scene.render.layers.length ||
          scene.requiredAssetIds.some(function (id) { return !scene.render.layers.some(function (layer) { return layer.assetId === id; }); })) {
        throw new Error('Scene layers and required artwork do not match: ' + districtId);
      }
    });
    return true;
  }

  root.SemesterDistrictLayouts = Object.freeze({
    definitions: definitions,
    createSceneManifest: createSceneManifest,
    validate: validate
  });
})(typeof window !== 'undefined' ? window : globalThis);
