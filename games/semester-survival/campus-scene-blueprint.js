/* Campus scene blueprint — authored layout contract, not production artwork.
 * Coordinates are a first-pass design grid for artist/layout review. They do not
 * create a playable scene or imply that any referenced art files exist.
 */
(function (root) {
  'use strict';
  const blueprint = {
    version: 1, district: 'campus', sceneId: 'campus-main',
    approval: { status: 'layout-review-required', artworkSupplied: false, runtimeReady: false },
    design: {
      camera: '2.5D side-on exploration with independent depth movement',
      viewport: { width: 960, height: 540 }, world: { width: 3840, height: 1080 },
      groundY: 850, depthScale: 0.58, depthBounds: { min: -160, max: 160 },
      playerBounds: { minX: 80, maxX: 3760 },
      cameraBounds: { minX: 0, minY: 0, maxX: 2880, maxY: 540 },
      composition: [
        { id: 'far-campus-skyline', artSlot: 'background', parallax: 0.12, fullWorld: true },
        { id: 'academic-buildings-and-trees', artSlot: 'midground', parallax: 0.48, fullWorld: true },
        { id: 'walkways-gardens-and-nearby-props', artSlot: 'foreground', parallax: 1, fullWorld: true }
      ],
      lightingVariants: ['morning', 'midday', 'late-afternoon', 'night'],
      weatherTreatment: 'Preserve architecture and prop identity; atmosphere is layered over the same approved scene art.'
    },
    places: {
      'main-gate': { anchor: 'place-main-gate', x: 180, y: 560, width: 250, height: 250, focus: 'Campus entrance, security point and noticeboard.' },
      'lecture-hall': { anchor: 'place-lecture-hall', x: 720, y: 500, width: 280, height: 310, focus: 'Main lecture hall doors and exterior steps.' },
      'library': { anchor: 'place-library', x: 1390, y: 480, width: 300, height: 330, focus: 'Library entrance and book-return point.' },
      'data-lab': { anchor: 'place-data-lab', x: 2020, y: 500, width: 300, height: 310, focus: 'Computer and data laboratory entrance.' },
      'student-commons': { anchor: 'place-student-commons', x: 2600, y: 540, width: 300, height: 270, focus: 'Student gathering terrace and club noticeboard.' },
      'administration': { anchor: 'place-administration', x: 3220, y: 500, width: 280, height: 310, focus: 'Student administration reception.' },
      'lecturer-office': { anchor: 'place-lecturer-office', x: 3560, y: 500, width: 240, height: 310, focus: 'Lecturer office corridor and consultation door.' }
    },
    npcs: [
      { characterId: 'amina', anchor: 'npc-amina', x: 1120, y: 610, radius: 96 },
      { characterId: 'wanjiku', anchor: 'npc-wanjiku', x: 430, y: 620, radius: 92 },
      { characterId: 'mwangi', anchor: 'npc-mwangi', x: 3540, y: 630, radius: 90 }
    ],
    navigation: {
      nodes: [
        { id: 'gate', anchor: 'place-main-gate' }, { id: 'lecture', anchor: 'place-lecture-hall' },
        { id: 'library', anchor: 'place-library' }, { id: 'lab', anchor: 'place-data-lab' },
        { id: 'commons', anchor: 'place-student-commons' }, { id: 'admin', anchor: 'place-administration' },
        { id: 'offices', anchor: 'place-lecturer-office' }, { id: 'amina', anchor: 'npc-amina' },
        { id: 'wanjiku', anchor: 'npc-wanjiku' }, { id: 'mwangi', anchor: 'npc-mwangi' }
      ],
      edges: [
        ['gate','lecture'], ['lecture','library'], ['library','lab'], ['lab','commons'],
        ['commons','admin'], ['admin','offices'], ['lecture','wanjiku'],
        ['library','amina'], ['offices','mwangi']
      ].map(([from,to]) => ({ from, to, bidirectional: true }))
    },
    collision: [
      { id: 'north-building-wall', type: 'aabb', minX: 500, maxX: 3700, minDepth: -158, maxDepth: -132, material: 'concrete', effect: 'none' },
      { id: 'south-garden-edge', type: 'segment', x1: 520, depth1: 138, x2: 3650, depth2: 138, radius: 9, material: 'stone', effect: 'none' }
    ],
    gameplayZones: [
      { id: 'campus-central-walkway', shape: 'aabb', minX: 520, maxX: 3650, minDepth: -118, maxDepth: 118, effect: 'campus-track' },
      { id: 'library-steps-crowd', shape: 'circle', x: 1535, depth: 48, radius: 76, effect: 'crowded-corridor' },
      { id: 'rain-exposed-east-walk', shape: 'aabb', minX: 2700, maxX: 3160, minDepth: -118, maxDepth: 118, effect: 'wet-floor' }
    ],
    spawnPoints: {
      default: { x: 250, depth: 0 }, fromTownship: { x: 190, depth: 0 },
      fromResidence: { x: 360, depth: 0 }, fromCity: { x: 3670, depth: 0 }
    },
    artDelivery: {
      requiredLayers: ['background', 'midground', 'foreground'],
      interactiveProps: ['gate-signage', 'noticeboard', 'lecture-hall-signage', 'library-signage', 'lab-signage', 'commons-furniture', 'administration-signage', 'office-directory'],
      noInventedAssets: true, artistMustReviewWalkableDepthPlane: true, allHotspotsMustBeAlignedToFinalPaintover: true
    }
  };
  function validate(world) {
    if (!world || !world.districts || !world.districts.campus) throw new Error('Campus blueprint requires canonical world content.');
    const knownPlaces = new Set(world.districts.campus.places.map(place => place.id));
    Object.keys(blueprint.places).forEach(id => { if (!knownPlaces.has(id)) throw new Error('Campus blueprint references unknown place: ' + id); });
    const knownCharacters = world.characters || {};
    blueprint.npcs.forEach(npc => { if (!knownCharacters[npc.characterId]) throw new Error('Campus blueprint references unknown character: ' + npc.characterId); });
    const anchors = new Set();
    Object.values(blueprint.places).forEach(item => anchors.add(item.anchor));
    blueprint.npcs.forEach(item => anchors.add(item.anchor));
    const nodeIds = new Set();
    blueprint.navigation.nodes.forEach(node => {
      if (!anchors.has(node.anchor) || nodeIds.has(node.id)) throw new Error('Campus navigation contains an invalid or duplicate node.');
      nodeIds.add(node.id);
    });
    blueprint.navigation.edges.forEach(edge => {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to) || edge.from === edge.to) throw new Error('Campus navigation edge references an invalid node.');
    });
    return Object.freeze({ district: 'campus', placeCount: Object.keys(blueprint.places).length, npcCount: blueprint.npcs.length,
      navigationNodeCount: blueprint.navigation.nodes.length, artworkReady: false, runtimeReady: false });
  }
  root.SemesterCampusBlueprint = Object.freeze({ getBlueprint: () => blueprint, validate });
})(typeof window !== 'undefined' ? window : globalThis);
