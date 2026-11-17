// 4weird Games - Ship & Station Procedural Builder
// Assembles spaceships and space stations using modular parts definitions
// Optimized with a shared geometry cache for minimal GPU/memory overhead
// No em-dashes or en-dashes used in comments

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

import { hulls } from './parts/hulls.js';
import { cockpits } from './parts/cockpits.js';
import { wings } from './parts/wings.js';
import { thrusters } from './parts/thrusters.js';
import { weapons } from './parts/weapons.js';
import { details } from './parts/details.js';

// Import all 20 space station parts
import { part as stationCoreHub } from './parts/stations/core_hub.js';
import { part as stationHabitatRing } from './parts/stations/habitat_ring.js';
import { part as stationDockingBay } from './parts/stations/docking_bay.js';
import { part as stationSolarArray } from './parts/stations/solar_array.js';
import { part as stationSensorSpire } from './parts/stations/sensor_spire.js';
import { part as stationCargoRack } from './parts/stations/cargo_rack.js';
import { part as stationReactorCore } from './parts/stations/reactor_core.js';
import { part as stationShieldPylon } from './parts/stations/shield_pylon.js';
import { part as stationRadiatorWing } from './parts/stations/radiator_wing.js';
import { part as stationDefensePlatform } from './parts/stations/defense_platform.js';
import { part as stationBiodomePod } from './parts/stations/biodome_pod.js';
import { part as stationAntennaMast } from './parts/stations/antenna_mast.js';
import { part as stationFuelTank } from './parts/stations/fuel_tank.js';
import { part as stationObservationDeck } from './parts/stations/observation_deck.js';
import { part as stationConnectingStrut } from './parts/stations/connecting_strut.js';
import { part as stationRefinery } from './parts/stations/refining_refinery.js';
import { part as stationHangarDeck } from './parts/stations/hangar_deck.js';
import { part as stationGravityRing } from './parts/stations/gravity_ring.js';
import { part as stationCommandBridge } from './parts/stations/command_bridge.js';
import { part as stationTurretDefense } from './parts/stations/turret_defense.js';

const stationParts = [
  stationCoreHub, stationHabitatRing, stationDockingBay, stationSolarArray,
  stationSensorSpire, stationCargoRack, stationReactorCore, stationShieldPylon,
  stationRadiatorWing, stationDefensePlatform, stationBiodomePod, stationAntennaMast,
  stationFuelTank, stationObservationDeck, stationConnectingStrut, stationRefinery,
  stationHangarDeck, stationGravityRing, stationCommandBridge, stationTurretDefense
];

// Shared geometry cache to avoid duplicate allocations
const geometryCache = {};

function getSharedGeometry(type, sizeParams = [1, 1, 1, 8]) {
  // Generate a key based on geometry parameters to maximize cache reuse
  const key = `${type}_${sizeParams.join('_')}`;
  if (geometryCache[key]) {
    return geometryCache[key];
  }

  let geom;
  if (type === "box") {
    // sizeParams = [width, height, depth]
    geom = new THREE.BoxGeometry(sizeParams[0], sizeParams[1], sizeParams[2]);
  } else if (type === "sphere") {
    // sizeParams = [radius, widthSegments, heightSegments]
    geom = new THREE.SphereGeometry(sizeParams[0], Math.floor(sizeParams[1]), Math.floor(sizeParams[2]));
  } else if (type === "cylinder") {
    // sizeParams = [radiusTop, radiusBottom, height, radialSegments]
    geom = new THREE.CylinderGeometry(sizeParams[0], sizeParams[1], sizeParams[2], Math.floor(sizeParams[3]));
  } else if (type === "cone") {
    // sizeParams = [radius, height, radialSegments]
    geom = new THREE.ConeGeometry(sizeParams[0], sizeParams[1], Math.floor(sizeParams[2]));
  } else if (type === "torus") {
    // sizeParams = [radius, tube, radialSegments, tubularSegments]
    geom = new THREE.TorusGeometry(sizeParams[0], sizeParams[1], Math.floor(sizeParams[2]), Math.floor(sizeParams[3]));
  } else {
    geom = new THREE.BoxGeometry(1, 1, 1);
  }

  geometryCache[key] = geom;
  return geom;
}

export const ShipBuilder = {
  // The lead craft has a fixed silhouette so it remains recognizable from
  // every camera angle, while the rest of the fleet stays modular.
  buildHeroShip: function() {
    const ship = new THREE.Group();
    ship.name = 'hero_ship';
    const armor = new THREE.MeshStandardMaterial({ color: 0xdce8ed, metalness: 0.58, roughness: 0.31, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: 0x10273b, metalness: 0.72, roughness: 0.28 });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x54f5ee });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffb969 });
    const canopy = new THREE.MeshStandardMaterial({ color: 0x0b7c9d, emissive: 0x064257, emissiveIntensity: 0.8, metalness: 0.28, roughness: 0.12 });

    function deck(points, material, y, thickness = 0.32) {
      const shape = new THREE.Shape();
      shape.moveTo(points[0][0], -points[0][1]);
      points.slice(1).forEach(([x, z]) => shape.lineTo(x, -z));
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 });
      geometry.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = y;
      ship.add(mesh);
      return mesh;
    }

    // Swept wings and split tail give the craft a clear arrowhead profile.
    deck([[0,-7.8],[-1.2,-4.6],[-2.4,-2.5],[-7.6,2.1],[-8.6,4.4],[-3.1,3.1],[-2.4,6.1],[0,4.4],[2.4,6.1],[3.1,3.1],[8.6,4.4],[7.6,2.1],[2.4,-2.5],[1.2,-4.6]], armor, 0);
    deck([[0,-7.4],[-0.75,-4.3],[-1.25,1.6],[-0.9,4.2],[0,4.7],[0.9,4.2],[1.25,1.6],[0.75,-4.3]], dark, 0.48, 0.47);
    deck([[-2.9,-1.8],[-7.5,2.5],[-7.9,3.5],[-3.8,2.2]], cyan, 0.38, 0.06);
    deck([[2.9,-1.8],[7.5,2.5],[7.9,3.5],[3.8,2.2]], cyan, 0.38, 0.06);
    deck([[-0.65,-5.0],[-1.18,-2.8],[-0.92,-0.2],[0,0.8],[0.92,-0.2],[1.18,-2.8],[0.65,-5.0]], canopy, 0.88, 0.35);

    for (const side of [-1, 1]) {
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.65, 4.8), dark);
      nacelle.position.set(side * 2.45, -0.27, 3.3);
      ship.add(nacelle);
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.58, 0.35, 12), cyan);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(side * 2.45, -0.2, 5.8);
      ship.add(exhaust);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.85), amber);
      tip.position.set(side * 7.65, 0.28, 3.12);
      ship.add(tip);
    }
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 3.4), cyan);
    spine.position.set(0, 0.99, 2.55);
    ship.add(spine);

    // Forward-firing wingtip laser cannons matching the cockpit's forward laser armament
    const wingCannonHardpoints = [];
    for (const side of [-1, 1]) {
      const cannonAssembly = new THREE.Group();
      cannonAssembly.position.set(side * 6.2, 0.15, 0.2);

      // Pylon mount
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 1.8), dark);
      cannonAssembly.add(pylon);

      // Main barrel housing
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 2.2, 10), armor);
      housing.rotation.x = Math.PI / 2;
      housing.position.set(0, 0, -1.0);
      cannonAssembly.add(housing);

      // Long forward laser barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 4.4, 8), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0, -3.8);
      cannonAssembly.add(barrel);

      // Flash suppressor & cyan energy muzzle
      const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.65, 8), dark);
      suppressor.rotation.x = Math.PI / 2;
      suppressor.position.set(0, 0, -6.1);
      cannonAssembly.add(suppressor);

      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8), cyan);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(0, 0, -6.45);
      cannonAssembly.add(muzzle);

      ship.add(cannonAssembly);
      wingCannonHardpoints.push([side * 6.2, 0.15, -6.5]);
    }

    const turret = new THREE.Group();
    turret.position.set(0, 1.75, 1.25);
    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.55, 0.55, 12), dark);
    turret.add(turretBase);
    const turretHead = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.95, 2.85), armor);
    turretHead.position.y = 0.55;
    turret.add(turretHead);
    const turretStripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 2.2), cyan);
    turretStripe.position.set(0, 1.06, -0.35);
    turret.add(turretStripe);
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.24), amber);
    sensor.position.set(0.76, 0.92, -1.43);
    turret.add(sensor);
    const barrelPitch = new THREE.Group();
    barrelPitch.position.y = 0.55;
    for (const side of [-1, 1]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.33, 4.1, 10), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * 0.65, 0, -2.65);
      barrelPitch.add(barrel);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10), cyan);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(side * 0.65, 0, -4.76);
      barrelPitch.add(muzzle);
    }
    turret.add(barrelPitch);
    ship.add(turret);

    // Underside missile hardpoint racks (4 missile bays on the belly)
    const missileMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 });
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
    const missileHardpoints = [];
    const bayOffsets = [
      [-1.35, -0.65, -0.8],
      [1.35, -0.65, -0.8],
      [-1.35, -0.65, 1.2],
      [1.35, -0.65, 1.2]
    ];
    bayOffsets.forEach(([bx, by, bz]) => {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 1.8), pylonMat);
      pylon.position.set(bx, by, bz);
      ship.add(pylon);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.0, 8), missileMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(bx, by - 0.25, bz);
      ship.add(pod);
      missileHardpoints.push([bx, by - 0.25, bz - 1.0]);
    });

    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x5ffaff, transparent: true, opacity: 0.014, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const shield = new THREE.Mesh(new THREE.SphereGeometry(9.4, 32, 20), shieldMat);
    shield.scale.set(1, 0.48, 0.88);
    ship.add(shield);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x6cf8ff, transparent: true, opacity: 0.025, depthWrite: false, wireframe: true, blending: THREE.AdditiveBlending });
    const shieldGrid = new THREE.Mesh(new THREE.SphereGeometry(9.45, 16, 10), gridMat);
    shieldGrid.scale.copy(shield.scale);
    ship.add(shieldGrid);
    ship.userData = { faction: 'human', hero: true, enginePositions: [[-2.45, -0.2, 5.8], [2.45, -0.2, 5.8]], missileHardpoints, wingCannonHardpoints, thrusterGlowColor: 0x54f5ee, collisionRadius: 8, turret, barrelPitch, shield, shieldGrid };
    return ship;
  },

  // Create modular spaceship
  buildShip: function(faction, seedVal = Math.random()) {
    const isAlien = faction === "alien";
    
    // Seeded random helper for reproducible ships
    let seed = seedVal;
    function random() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    // Harmonized Color Palette Setup: Reddish for Alien, Green for Human
    let baseColor, stripeColor, trimColor, emissiveColor;
    if (isAlien) {
      // Alien: dark obsidian, crimson, hot ruby, vivid red/magenta
      const baseOptions = [0x1a070b, 0x140508, 0x1e0c10];
      const stripeOptions = [0xef4444, 0xf43f5e, 0xd946ef, 0xff2a4f];
      baseColor = baseOptions[Math.floor(random() * baseOptions.length)];
      stripeColor = stripeOptions[Math.floor(random() * stripeOptions.length)];
      trimColor = 0x22050b;
      emissiveColor = 0xef4444; // Red plasma flames
    } else {
      // Humans: military steel, emerald green, neon jade, vibrant lime-green
      const baseOptions = [0x0d1f18, 0x162c22, 0xd0e8db];
      const stripeOptions = [0x10b981, 0x22c55e, 0x059669, 0x34d399];
      baseColor = baseOptions[Math.floor(random() * baseOptions.length)];
      stripeColor = stripeOptions[Math.floor(random() * stripeOptions.length)];
      trimColor = 0x064e3b; // Deep emerald trim
      emissiveColor = 0x10b981; // Green plasma flames
    }

    // Material definitions (pooled/shared locally for this ship instance)
    const baseMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.85,
      roughness: 0.25,
      flatShading: true
    });

    const stripeMat = new THREE.MeshStandardMaterial({
      color: stripeColor,
      metalness: 0.7,
      roughness: 0.3,
      flatShading: true
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      metalness: 0.9,
      roughness: 0.15,
      flatShading: true
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: isAlien ? 0xff1744 : 0x10b981,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.9
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: emissiveColor
    });

    const weaponGlowMat = new THREE.MeshBasicMaterial({
      color: isAlien ? 0xff1e46 : 0x22c55e // Alien red, human green
    });

    const rootGroup = new THREE.Group();
    rootGroup.name = "ship_" + faction;

    // Pick parts
    const hullDef = hulls[Math.floor(random() * hulls.length)];
    const cockpitDef = cockpits[Math.floor(random() * cockpits.length)];
    const wingDef = wings[Math.floor(random() * wings.length)];
    const thrusterDef = thrusters[Math.floor(random() * thrusters.length)];
    const weaponDef = weapons[Math.floor(random() * weapons.length)];
    const detailDef = details[Math.floor(random() * details.length)];

    // 1. Build Hull Core
    const hullGroup = new THREE.Group();
    hullDef.geometries.forEach(g => {
      const geom = getSharedGeometry(g.type, g.size);
      const mesh = new THREE.Mesh(geom, random() > 0.4 ? baseMat : stripeMat);
      
      mesh.position.fromArray(g.offset || [0,0,0]);
      if (g.rotation) mesh.rotation.fromArray(g.rotation);
      if (g.scale) mesh.scale.fromArray(g.scale);
      hullGroup.add(mesh);
    });
    rootGroup.add(hullGroup);

    // Helper for applying geometries to a specific attachment slot
    function attachPart(partDef, slotCoords, forceMaterial = null) {
      if (!slotCoords) return;
      
      const buildGeom = (coords, isMirrored = false) => {
        const partGroup = new THREE.Group();
        partGroup.position.fromArray(coords);
        
        if (isMirrored) {
          partGroup.scale.set(-1.0, 1.0, 1.0); // Mirror along X-axis
        }

        partDef.geometries.forEach(g => {
          let mat = forceMaterial;
          if (!mat) {
            if (g.isGlass) mat = glassMat;
            else if (g.isGlow) mat = glowMat;
            else if (g.isWeaponGlow) mat = weaponGlowMat;
            else mat = random() > 0.6 ? stripeMat : (random() > 0.8 ? trimMat : baseMat);
          }

          const geom = getSharedGeometry(g.type, g.size);
          const mesh = new THREE.Mesh(geom, mat);
          
          mesh.position.fromArray(g.offset || [0,0,0]);
          if (g.rotation) mesh.rotation.fromArray(g.rotation);
          if (g.scale) mesh.scale.fromArray(g.scale);
          partGroup.add(mesh);
        });

        rootGroup.add(partGroup);
      };

      // Handle arrays of coordinates (for symmetric wings, weapons, engines)
      if (Array.isArray(slotCoords[0])) {
        slotCoords.forEach((coords, idx) => {
          // If X coordinate is negative, mirror it
          const mirror = coords[0] > 0.0;
          buildGeom(coords, mirror);
        });
      } else {
        buildGeom(slotCoords);
      }
    }

    // 2. Attach Cockpit
    attachPart(cockpitDef, hullDef.slots.cockpit);

    // 3. Attach Wings (Mirrored symmetrically)
    attachPart(wingDef, hullDef.slots.wings);

    // 4. Attach Thrusters/Engines
    // Capture engine positions for particle positioning in the rendering loop
    const enginePositions = [];
    if (Array.isArray(hullDef.slots.engines[0])) {
      hullDef.slots.engines.forEach(e => enginePositions.push([...e]));
    } else {
      enginePositions.push([...hullDef.slots.engines]);
    }
    attachPart(thrusterDef, hullDef.slots.engines);

    // 5. Attach Weapons
    attachPart(weaponDef, hullDef.slots.weapons);

    // 6. Attach Details
    attachPart(detailDef, hullDef.slots.details);

    // Store attributes on the Three.js group for reference during runtime animations
    rootGroup.userData = {
      faction: faction,
      enginePositions: enginePositions,
      thrusterGlowColor: emissiveColor,
      collisionRadius: isAlien ? 3.0 : 2.0
    };

    // Apply slight random scaling to the overall ship group for variation
    const overallScale = 0.85 + random() * 0.3;
    rootGroup.scale.set(overallScale, overallScale, overallScale);

    return rootGroup;
  },

  // Create modular space station (human faction only)
  buildStation: function(seedVal = Math.random()) {
    let seed = seedVal;
    function random() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    const stationGroup = new THREE.Group();
    stationGroup.name = "space_station";

    // Standard high-tech grey industrial theme colors
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x5a6066,
      metalness: 0.8,
      roughness: 0.3,
      flatShading: true
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xff4c00, // Warning orange accents
      metalness: 0.5,
      roughness: 0.4,
      flatShading: true
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      metalness: 0.9,
      roughness: 0.1
    });

    const coreGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f6ff // Fusion core light
    });

    const blinkers = []; // Track blinking navigation light meshes

    // Recursive assembler helper that snaps modules to slot coordinates
    function assembleModule(partDef, position, rotation = [0,0,0], scale = [1,1,1]) {
      const moduleGroup = new THREE.Group();
      moduleGroup.position.fromArray(position);
      moduleGroup.rotation.fromArray(rotation);
      moduleGroup.scale.fromArray(scale);

      partDef.geometries.forEach(g => {
        let mat = metalMat;
        if (g.isGlass) mat = glassMat;
        else if (g.isGlow) mat = coreGlowMat;
        else if (random() > 0.75) mat = trimMat;

        const geom = getSharedGeometry(g.type, g.size);
        const mesh = new THREE.Mesh(geom, mat);
        
        mesh.position.fromArray(g.offset || [0,0,0]);
        if (g.rotation) mesh.rotation.fromArray(g.rotation);
        if (g.scale) mesh.scale.fromArray(g.scale);
        moduleGroup.add(mesh);

        // Blinking beacon light helper
        if (g.isGlow || random() > 0.95) {
          const beaconGeom = getSharedGeometry("sphere", [0.15, 4, 4]);
          const beaconMat = new THREE.MeshBasicMaterial({ color: random() > 0.5 ? 0xff0000 : 0x00ff00 });
          const beacon = new THREE.Mesh(beaconGeom, beaconMat);
          beacon.position.copy(mesh.position).add(new THREE.Vector3(0, g.size ? g.size[1]*0.6 : 0.5, 0));
          moduleGroup.add(beacon);
          blinkers.push(beacon);
        }
      });

      // Slowly rotate some rings or hubs for visual depth
      if (partDef.id === "station_habitat_ring" || partDef.id === "station_gravity_ring") {
        moduleGroup.userData = { rotateSpeed: 0.15 + random() * 0.2 };
      }

      stationGroup.add(moduleGroup);
      return moduleGroup;
    }

    // 1. Build Center Core
    const core = assembleModule(stationCoreHub, [0, 0, 0]);

    // 2. Attach Primary Modules (top and bottom)
    const topStrut = assembleModule(stationConnectingStrut, [0, 6, 0]);
    assembleModule(stationCommandBridge, [0, 11.2, 0]);

    const bottomStrut = assembleModule(stationConnectingStrut, [0, -6, 0]);
    assembleModule(stationReactorCore, [0, -11.5, 0]);

    // 3. Attach Radial Modules
    // Left: Habitat Ring
    assembleModule(stationHabitatRing, [-10, 0, 0], [0, 0, 1.5708]);
    
    // Right: Hangar Deck
    assembleModule(stationHangarDeck, [8, 0, 0], [0, 0, -1.5708]);
    assembleModule(stationDockingBay, [12.5, 0, 0], [0, 0, -1.5708]);

    // Front: Cargo & Refinery
    assembleModule(stationCargoRack, [0, 0, 8], [1.5708, 0, 0]);
    assembleModule(stationRefinery, [0, 0, 13.5], [1.5708, 0, 0]);

    // Back: Solar Panel array
    assembleModule(stationSolarArray, [0, 0, -9], [1.5708, 0, 0]);

    // 4. Attach detail extensions to modular slots
    // Top Spire
    assembleModule(stationSensorSpire, [0, 13.5, 0]);
    assembleModule(stationAntennaMast, [0, 17.5, 0]);

    // Bottom Defense and Shield Pylons
    assembleModule(stationDefensePlatform, [0, -15.5, 0], [3.14159, 0, 0]);
    assembleModule(stationShieldPylon, [-3.5, -12, 0], [0, 0, 0.5]);
    assembleModule(stationShieldPylon, [3.5, -12, 0], [0, 0, -0.5]);

    // Fuel and Radiators on the sides
    assembleModule(stationFuelTank, [-6.5, 6, 0], [0, 0, 1.5708]);
    assembleModule(stationFuelTank, [6.5, 6, 0], [0, 0, -1.5708]);
    assembleModule(stationRadiatorWing, [-12.5, -6, 0], [0, 0, 1.5708]);
    assembleModule(stationRadiatorWing, [12.5, -6, 0], [0, 0, -1.5708]);

    // Store references
    stationGroup.userData = {
      blinkers: blinkers,
      dockingPositions: [[8.0, 0.0, 0.0], [12.5, 0.0, 0.0]],
      collisionRadius: 20.0
    };

    // Scale up the space station to make it feel massive
    stationGroup.scale.set(1.5, 1.5, 1.5);

    return stationGroup;
  }
};
