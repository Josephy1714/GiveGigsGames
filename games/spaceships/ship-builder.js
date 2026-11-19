// 4weird Games - Ship & Station Procedural Builder
// Assembles modular ships, hero ship classes, capital bosses, and themed space stations.
// Optimized with a shared geometry cache for minimal GPU/memory overhead.

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

const geometryCache = {};

function getSharedGeometry(type, sizeParams = [1, 1, 1, 8]) {
  const key = `${type}_${sizeParams.join('_')}`;
  if (geometryCache[key]) return geometryCache[key];

  let geom;
  if (type === 'box') {
    geom = new THREE.BoxGeometry(sizeParams[0], sizeParams[1], sizeParams[2]);
  } else if (type === 'sphere') {
    geom = new THREE.SphereGeometry(sizeParams[0], Math.floor(sizeParams[1]), Math.floor(sizeParams[2]));
  } else if (type === 'cylinder') {
    geom = new THREE.CylinderGeometry(sizeParams[0], sizeParams[1], sizeParams[2], Math.floor(sizeParams[3]));
  } else if (type === 'cone') {
    geom = new THREE.ConeGeometry(sizeParams[0], sizeParams[1], Math.floor(sizeParams[2]));
  } else if (type === 'torus') {
    geom = new THREE.TorusGeometry(sizeParams[0], sizeParams[1], Math.floor(sizeParams[2]), Math.floor(sizeParams[3]));
  } else {
    geom = new THREE.BoxGeometry(1, 1, 1);
  }

  geometryCache[key] = geom;
  return geom;
}

function addExtrudedDeck(parent, points, material, y, thickness = 0.32) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], -points[0][1]);
  points.slice(1).forEach(([x, z]) => shape.lineTo(x, -z));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 1
  });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  parent.add(mesh);
  return mesh;
}

function createCannonAssembly(x, y, z, armorMat, darkMat, accentMat, barrelLen = 4.2) {
  const assembly = new THREE.Group();
  assembly.position.set(x, y, z);

  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 1.8), darkMat);
  assembly.add(pylon);

  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 2.2, 10), armorMat);
  housing.rotation.x = Math.PI / 2;
  housing.position.set(0, 0, -1.0);
  assembly.add(housing);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, barrelLen, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -1.7 - barrelLen * 0.5);
  assembly.add(barrel);

  const muzzleZ = -1.7 - barrelLen - 0.15;
  const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.6, 8), darkMat);
  suppressor.rotation.x = Math.PI / 2;
  suppressor.position.set(0, 0, muzzleZ + 0.2);
  assembly.add(suppressor);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.24, 8), accentMat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0, muzzleZ);
  assembly.add(muzzle);

  return { assembly, hardpoint: [x, y, z + muzzleZ] };
}

function attachHeroTurretAndBays(ship, armorMat, darkMat, accentMat, glowMat, turretPos = [0, 1.75, 1.25], bayScale = 1.0, shieldRadius = 9.4) {
  const turret = new THREE.Group();
  turret.position.set(...turretPos);
  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.55, 0.55, 12), darkMat);
  turret.add(turretBase);
  const turretHead = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.95, 2.85), armorMat);
  turretHead.position.y = 0.55;
  turret.add(turretHead);
  const turretStripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 2.2), accentMat);
  turretStripe.position.set(0, 1.06, -0.35);
  turret.add(turretStripe);
  const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.24), glowMat);
  sensor.position.set(0.76, 0.92, -1.43);
  turret.add(sensor);

  const barrelPitch = new THREE.Group();
  barrelPitch.position.y = 0.55;
  for (const side of [-1, 1]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.33, 4.1, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(side * 0.65, 0, -2.65);
    barrelPitch.add(barrel);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10), accentMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(side * 0.65, 0, -4.76);
    barrelPitch.add(muzzle);
  }
  turret.add(barrelPitch);
  ship.add(turret);

  const missileMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 });
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
  const missileHardpoints = [];
  const bayOffsets = [
    [-1.35 * bayScale, -0.65, -0.8],
    [1.35 * bayScale, -0.65, -0.8],
    [-1.35 * bayScale, -0.65, 1.2],
    [1.35 * bayScale, -0.65, 1.2]
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

  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x5ffaff,
    transparent: true,
    opacity: 0.014,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(shieldRadius, 32, 20), shieldMat);
  shield.scale.set(1, 0.48, 0.92);
  ship.add(shield);

  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x6cf8ff,
    transparent: true,
    opacity: 0.025,
    depthWrite: false,
    wireframe: true,
    blending: THREE.AdditiveBlending
  });
  const shieldGrid = new THREE.Mesh(new THREE.SphereGeometry(shieldRadius + 0.06, 16, 10), gridMat);
  shieldGrid.scale.copy(shield.scale);
  ship.add(shieldGrid);

  return { turret, barrelPitch, missileHardpoints, shield, shieldGrid };
}

export const ShipBuilder = {
  buildHeroShip: function(livery = null) {
    return this.buildPlayerShip('vanguard', livery);
  },

  buildPlayerShip: function(classId = 'vanguard', livery = null) {
    const pal = livery || {
      armorHex: 0xdce8ed,
      darkHex: 0x10273b,
      accentHex: 0x54f5ee,
      glowHex: 0xffb969
    };

    const ship = new THREE.Group();
    ship.name = `hero_ship_${classId}`;

    const armor = new THREE.MeshStandardMaterial({ color: pal.armorHex, metalness: 0.58, roughness: 0.31, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: pal.darkHex, metalness: 0.72, roughness: 0.28 });
    const accent = new THREE.MeshBasicMaterial({ color: pal.accentHex });
    const glow = new THREE.MeshBasicMaterial({ color: pal.glowHex });
    const canopy = new THREE.MeshStandardMaterial({
      color: 0x0b7c9d,
      emissive: 0x064257,
      emissiveIntensity: 0.85,
      metalness: 0.28,
      roughness: 0.12
    });

    const wingCannonHardpoints = [];
    const enginePositions = [];
    let turretPos = [0, 1.75, 1.25];
    let bayScale = 1.0;
    let shieldRadius = 9.4;

    if (classId === 'dart') {
      // Zephyr Interceptor: twin forward spear prongs & swept razor wings
      addExtrudedDeck(ship, [[0,-9.2],[-0.85,-5.0],[-2.2,-1.5],[-8.2,3.6],[-6.8,5.2],[-2.4,2.8],[-1.1,5.6],[0,4.5],[1.1,5.6],[2.4,2.8],[6.8,5.2],[8.2,3.6],[2.2,-1.5],[0.85,-5.0]], armor, 0, 0.28);
      addExtrudedDeck(ship, [[0,-8.5],[-0.55,-4.5],[-0.95,1.2],[-0.7,4.2],[0,4.8],[0.7,4.2],[0.95,1.2],[0.55,-4.5]], dark, 0.42, 0.42);
      addExtrudedDeck(ship, [[-0.55,-5.2],[-0.95,-2.5],[-0.75,0.2],[0,1.0],[0.75,0.2],[0.95,-2.5],[0.55,-5.2]], canopy, 0.82, 0.34);

      for (const side of [-1, 1]) {
        const spear = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 4.8), armor);
        spear.position.set(side * 1.45, 0.12, -5.8);
        ship.add(spear);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 4.2), accent);
        stripe.position.set(side * 4.4, 0.36, 1.4);
        stripe.rotation.y = side * -0.58;
        ship.add(stripe);

        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.56, 4.2, 10), dark);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.position.set(side * 1.9, -0.1, 3.3);
        ship.add(nacelle);

        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.35, 12), accent);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(side * 1.9, -0.1, 5.5);
        ship.add(exhaust);
        enginePositions.push([side * 1.9, -0.1, 5.6]);

        const cannon = createCannonAssembly(side * 4.9, 0.14, -0.2, armor, dark, accent, 4.0);
        ship.add(cannon.assembly);
        wingCannonHardpoints.push(cannon.hardpoint);
      }
      turretPos = [0, 1.6, 1.5];
      shieldRadius = 9.0;

    } else if (classId === 'gunship') {
      // Aegis Heavy Gunship: twin armored sponsons & quad wing/nose cannons
      addExtrudedDeck(ship, [[0,-8.4],[-1.9,-5.6],[-3.6,-2.2],[-9.2,1.6],[-9.4,4.8],[-4.2,3.8],[-3.0,6.2],[0,5.2],[3.0,6.2],[4.2,3.8],[9.4,4.8],[9.2,1.6],[3.6,-2.2],[1.9,-5.6]], armor, -0.1, 0.52);
      addExtrudedDeck(ship, [[0,-7.8],[-1.2,-4.6],[-1.7,2.0],[-1.3,4.8],[0,5.4],[1.3,4.8],[1.7,2.0],[1.2,-4.6]], dark, 0.52, 0.55);
      addExtrudedDeck(ship, [[-0.85,-5.2],[-1.35,-2.6],[-1.05,0.2],[0,1.2],[1.05,0.2],[1.35,-2.6],[0.85,-5.2]], canopy, 1.05, 0.38);

      for (const side of [-1, 1]) {
        const sponson = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 6.2), dark);
        sponson.position.set(side * 3.1, 0.05, 1.6);
        ship.add(sponson);

        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.4, 12), accent);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(side * 3.1, 0.05, 4.9);
        ship.add(exhaust);
        enginePositions.push([side * 3.1, 0.05, 5.1]);

        const innerCannon = createCannonAssembly(side * 3.1, 0.25, -2.1, armor, dark, accent, 3.6);
        const outerCannon = createCannonAssembly(side * 7.2, 0.12, 0.3, armor, dark, accent, 4.4);
        ship.add(innerCannon.assembly, outerCannon.assembly);
        wingCannonHardpoints.push(outerCannon.hardpoint, innerCannon.hardpoint);
      }
      turretPos = [0, 1.95, 1.6];
      bayScale = 1.25;
      shieldRadius = 10.6;

    } else if (classId === 'corvette') {
      // Valkyrie Strike Corvette: heavy elongated keel, cargo pods, triple engines
      addExtrudedDeck(ship, [[0,-10.5],[-1.8,-6.5],[-3.0,-1.8],[-9.4,2.4],[-8.4,5.4],[-3.5,4.2],[-2.6,7.0],[0,6.2],[2.6,7.0],[3.5,4.2],[8.4,5.4],[9.4,2.4],[3.0,-1.8],[1.8,-6.5]], armor, -0.15, 0.65);
      addExtrudedDeck(ship, [[0,-9.8],[-1.1,-5.5],[-1.5,3.2],[-1.1,6.2],[0,6.6],[1.1,6.2],[1.5,3.2],[1.1,-5.5]], dark, 0.58, 0.6);
      addExtrudedDeck(ship, [[-0.8,-5.8],[-1.3,-3.0],[-1.0,0.2],[0,1.2],[1.0,0.2],[1.3,-3.0],[0.8,-5.8]], canopy, 1.18, 0.38);

      // Ventral ore cargo pods
      for (const side of [-1, 1]) {
        const cargoPod = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 5.2, 8), dark);
        cargoPod.rotation.x = Math.PI / 2;
        cargoPod.position.set(side * 2.2, -0.55, 0.5);
        ship.add(cargoPod);

        const nac = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 5.8), dark);
        nac.position.set(side * 2.8, 0.1, 3.8);
        ship.add(nac);

        const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.64, 0.4, 12), accent);
        exh.rotation.x = Math.PI / 2;
        exh.position.set(side * 2.8, 0.1, 6.8);
        ship.add(exh);
        enginePositions.push([side * 2.8, 0.1, 6.9]);

        const c1 = createCannonAssembly(side * 2.6, 0.35, -3.2, armor, dark, glow, 3.8);
        const c2 = createCannonAssembly(side * 7.6, 0.18, 0.6, armor, dark, accent, 4.4);
        ship.add(c1.assembly, c2.assembly);
        wingCannonHardpoints.push(c2.hardpoint, c1.hardpoint);
      }
      const centerExh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.45, 12), glow);
      centerExh.rotation.x = Math.PI / 2;
      centerExh.position.set(0, 0.35, 6.9);
      ship.add(centerExh);
      enginePositions.push([0, 0.35, 7.0]);

      turretPos = [0, 2.05, 1.8];
      bayScale = 1.3;
      shieldRadius = 11.4;

    } else if (classId === 'frigate') {
      // Hyperion Fleet Frigate: capital command bridge, 6 cannons, quad nacelles
      addExtrudedDeck(ship, [[0,-12.0],[-2.4,-7.5],[-4.0,-1.0],[-10.6,2.8],[-9.8,6.5],[-4.4,5.0],[-3.2,8.4],[0,7.2],[3.2,8.4],[4.4,5.0],[9.8,6.5],[10.6,2.8],[4.0,-1.0],[2.4,-7.5]], armor, -0.25, 0.88);
      addExtrudedDeck(ship, [[0,-10.8],[-1.5,-6.2],[-2.0,3.8],[-1.4,7.4],[0,8.0],[1.4,7.4],[2.0,3.8],[1.5,-6.2]], dark, 0.72, 0.75);
      addExtrudedDeck(ship, [[-1.0,-5.4],[-1.5,-2.4],[-1.2,0.8],[0,1.8],[1.2,0.8],[1.5,-2.4],[1.0,-5.4]], canopy, 1.5, 0.48);

      const bridgeTower = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 3.8), armor);
      bridgeTower.position.set(0, 1.9, 3.8);
      ship.add(bridgeTower);

      for (const side of [-1, 1]) {
        for (const row of [0, 1]) {
          const nac = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 5.4), dark);
          nac.position.set(side * (2.6 + row * 1.9), row === 0 ? 0.45 : -0.35, 4.6);
          ship.add(nac);
          const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.6, 0.4, 12), accent);
          exh.rotation.x = Math.PI / 2;
          exh.position.set(side * (2.6 + row * 1.9), row === 0 ? 0.45 : -0.35, 7.4);
          ship.add(exh);
          enginePositions.push([side * (2.6 + row * 1.9), row === 0 ? 0.45 : -0.35, 7.5]);
        }
        const c1 = createCannonAssembly(side * 2.4, 0.42, -5.0, armor, dark, accent, 3.8);
        const c2 = createCannonAssembly(side * 5.4, 0.25, -1.6, armor, dark, accent, 4.2);
        const c3 = createCannonAssembly(side * 8.8, 0.16, 1.2, armor, dark, glow, 4.5);
        ship.add(c1.assembly, c2.assembly, c3.assembly);
        wingCannonHardpoints.push(c3.hardpoint, c2.hardpoint, c1.hardpoint);
      }
      turretPos = [0, 2.85, 3.6];
      bayScale = 1.45;
      shieldRadius = 13.0;

    } else if (classId === 'sovereign') {
      // Sovereign Star-Yacht Dreadnought: sweeping luxury cruiser with promenade spine
      addExtrudedDeck(ship, [[0,-13.4],[-2.2,-8.2],[-4.4,-2.2],[-11.6,3.2],[-10.2,7.2],[-4.6,5.2],[-3.0,9.0],[0,8.2],[3.0,9.0],[4.6,5.2],[10.2,7.2],[11.6,3.2],[4.4,-2.2],[2.2,-8.2]], armor, -0.25, 0.92);
      addExtrudedDeck(ship, [[0,-12.2],[-1.4,-7.0],[-2.1,4.0],[-1.5,8.0],[0,8.6],[1.5,8.0],[2.1,4.0],[1.4,-7.0]], dark, 0.78, 0.78);
      addExtrudedDeck(ship, [[-1.1,-6.0],[-1.7,-2.6],[-1.4,1.0],[0,2.2],[1.4,1.0],[1.7,-2.6],[1.1,-6.0]], canopy, 1.58, 0.52);

      const goldPromenade = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 9.2), glow);
      goldPromenade.position.set(0, 1.65, 3.8);
      ship.add(goldPromenade);

      for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.6, 5.2), accent);
        fin.position.set(side * 4.8, 0.95, 4.5);
        fin.rotation.z = side * -0.45;
        ship.add(fin);

        for (const row of [0, 1]) {
          const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 6.2, 12), dark);
          nac.rotation.x = Math.PI / 2;
          nac.position.set(side * (2.5 + row * 1.9), row === 0 ? 0.45 : -0.35, 5.0);
          ship.add(nac);
          const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 0.45, 12), accent);
          exh.rotation.x = Math.PI / 2;
          exh.position.set(side * (2.5 + row * 1.9), row === 0 ? 0.45 : -0.35, 8.2);
          ship.add(exh);
          enginePositions.push([side * (2.5 + row * 1.9), row === 0 ? 0.45 : -0.35, 8.3]);
        }

        const c1 = createCannonAssembly(side * 2.5, 0.44, -5.6, armor, dark, glow, 4.0);
        const c2 = createCannonAssembly(side * 5.8, 0.28, -2.0, armor, dark, accent, 4.4);
        const c3 = createCannonAssembly(side * 9.4, 0.16, 1.5, armor, dark, glow, 4.6);
        ship.add(c1.assembly, c2.assembly, c3.assembly);
        wingCannonHardpoints.push(c3.hardpoint, c2.hardpoint, c1.hardpoint);
      }
      turretPos = [0, 2.55, 2.8];
      bayScale = 1.6;
      shieldRadius = 14.2;

    } else {
      // Classic Vanguard Mk-I Starfighter (exact heritage silhouette + livery)
      addExtrudedDeck(ship, [[0,-7.8],[-1.2,-4.6],[-2.4,-2.5],[-7.6,2.1],[-8.6,4.4],[-3.1,3.1],[-2.4,6.1],[0,4.4],[2.4,6.1],[3.1,3.1],[8.6,4.4],[7.6,2.1],[2.4,-2.5],[1.2,-4.6]], armor, 0);
      addExtrudedDeck(ship, [[0,-7.4],[-0.75,-4.3],[-1.25,1.6],[-0.9,4.2],[0,4.7],[0.9,4.2],[1.25,1.6],[0.75,-4.3]], dark, 0.48, 0.47);
      addExtrudedDeck(ship, [[-2.9,-1.8],[-7.5,2.5],[-7.9,3.5],[-3.8,2.2]], accent, 0.38, 0.06);
      addExtrudedDeck(ship, [[2.9,-1.8],[7.5,2.5],[7.9,3.5],[3.8,2.2]], accent, 0.38, 0.06);
      addExtrudedDeck(ship, [[-0.65,-5.0],[-1.18,-2.8],[-0.92,-0.2],[0,0.8],[0.92,-0.2],[1.18,-2.8],[0.65,-5.0]], canopy, 0.88, 0.35);

      for (const side of [-1, 1]) {
        const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.65, 4.8), dark);
        nacelle.position.set(side * 2.45, -0.27, 3.3);
        ship.add(nacelle);
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.58, 0.35, 12), accent);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(side * 2.45, -0.2, 5.8);
        ship.add(exhaust);
        enginePositions.push([side * 2.45, -0.2, 5.8]);

        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.85), glow);
        tip.position.set(side * 7.65, 0.28, 3.12);
        ship.add(tip);

        const cannon = createCannonAssembly(side * 6.2, 0.15, 0.2, armor, dark, accent, 4.4);
        ship.add(cannon.assembly);
        wingCannonHardpoints.push(cannon.hardpoint);
      }
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 3.4), accent);
      spine.position.set(0, 0.99, 2.55);
      ship.add(spine);
    }

    const { turret, barrelPitch, missileHardpoints, shield, shieldGrid } =
      attachHeroTurretAndBays(ship, armor, dark, accent, glow, turretPos, bayScale, shieldRadius);

    ship.userData = {
      isShipRoot: true,
      faction: 'human',
      hero: true,
      classId,
      enginePositions,
      missileHardpoints,
      wingCannonHardpoints,
      thrusterGlowColor: pal.accentHex,
      collisionRadius: shieldRadius * 0.85,
      turret,
      barrelPitch,
      shield,
      shieldGrid
    };
    return ship;
  },

  // Create modular spaceship (wingmen & standard alien fighters)
  buildShip: function(faction, seedVal = Math.random()) {
    const isAlien = faction === 'alien';
    let seed = seedVal;
    function random() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    let baseColor, stripeColor, trimColor, emissiveColor;
    if (isAlien) {
      const baseOptions = [0x1a070b, 0x140508, 0x1e0c10];
      const stripeOptions = [0xef4444, 0xf43f5e, 0xd946ef, 0xff2a4f];
      baseColor = baseOptions[Math.floor(random() * baseOptions.length)];
      stripeColor = stripeOptions[Math.floor(random() * stripeOptions.length)];
      trimColor = 0x22050b;
      emissiveColor = 0xef4444;
    } else {
      const baseOptions = [0x0d1f18, 0x162c22, 0xd0e8db];
      const stripeOptions = [0x10b981, 0x22c55e, 0x059669, 0x34d399];
      baseColor = baseOptions[Math.floor(random() * baseOptions.length)];
      stripeColor = stripeOptions[Math.floor(random() * stripeOptions.length)];
      trimColor = 0x064e3b;
      emissiveColor = 0x10b981;
    }

    const baseMat = new THREE.MeshStandardMaterial({ color: baseColor, metalness: 0.85, roughness: 0.25, flatShading: true });
    const stripeMat = new THREE.MeshStandardMaterial({ color: stripeColor, metalness: 0.7, roughness: 0.3, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.9, roughness: 0.15, flatShading: true });
    const glassMat = new THREE.MeshStandardMaterial({
      color: isAlien ? 0xff1744 : 0x10b981,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.9
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: emissiveColor });
    const weaponGlowMat = new THREE.MeshBasicMaterial({ color: isAlien ? 0xff1e46 : 0x22c55e });

    const rootGroup = new THREE.Group();
    rootGroup.name = 'ship_' + faction;

    const hullDef = hulls[Math.floor(random() * hulls.length)];
    const cockpitDef = cockpits[Math.floor(random() * cockpits.length)];
    const wingDef = wings[Math.floor(random() * wings.length)];
    const thrusterDef = thrusters[Math.floor(random() * thrusters.length)];
    const weaponDef = weapons[Math.floor(random() * weapons.length)];
    const detailDef = details[Math.floor(random() * details.length)];

    const hullGroup = new THREE.Group();
    hullDef.geometries.forEach(g => {
      const geom = getSharedGeometry(g.type, g.size);
      const mesh = new THREE.Mesh(geom, random() > 0.4 ? baseMat : stripeMat);
      mesh.position.fromArray(g.offset || [0, 0, 0]);
      if (g.rotation) mesh.rotation.fromArray(g.rotation);
      if (g.scale) mesh.scale.fromArray(g.scale);
      hullGroup.add(mesh);
    });
    rootGroup.add(hullGroup);

    function attachPart(partDef, slotCoords) {
      if (!slotCoords) return;
      const buildGeom = (coords, isMirrored = false) => {
        const partGroup = new THREE.Group();
        partGroup.position.fromArray(coords);
        if (isMirrored) partGroup.scale.set(-1.0, 1.0, 1.0);
        partDef.geometries.forEach(g => {
          let mat;
          if (g.isGlass) mat = glassMat;
          else if (g.isGlow) mat = glowMat;
          else if (g.isWeaponGlow) mat = weaponGlowMat;
          else mat = random() > 0.6 ? stripeMat : (random() > 0.8 ? trimMat : baseMat);

          const geom = getSharedGeometry(g.type, g.size);
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.fromArray(g.offset || [0, 0, 0]);
          if (g.rotation) mesh.rotation.fromArray(g.rotation);
          if (g.scale) mesh.scale.fromArray(g.scale);
          partGroup.add(mesh);
        });
        rootGroup.add(partGroup);
      };

      if (Array.isArray(slotCoords[0])) {
        slotCoords.forEach(coords => buildGeom(coords, coords[0] > 0.0));
      } else {
        buildGeom(slotCoords);
      }
    }

    attachPart(cockpitDef, hullDef.slots.cockpit);
    attachPart(wingDef, hullDef.slots.wings);

    const enginePositions = [];
    if (Array.isArray(hullDef.slots.engines[0])) {
      hullDef.slots.engines.forEach(e => enginePositions.push([...e]));
    } else {
      enginePositions.push([...hullDef.slots.engines]);
    }
    attachPart(thrusterDef, hullDef.slots.engines);
    attachPart(weaponDef, hullDef.slots.weapons);
    attachPart(detailDef, hullDef.slots.details);

    rootGroup.userData = {
      isShipRoot: true,
      faction,
      enginePositions,
      thrusterGlowColor: emissiveColor,
      collisionRadius: isAlien ? 3.0 : 2.0
    };

    const overallScale = 0.85 + random() * 0.3;
    rootGroup.scale.set(overallScale, overallScale, overallScale);
    return rootGroup;
  },

  // Capital Void Dreadnought Boss
  buildBossShip: function() {
    const boss = new THREE.Group();
    boss.name = 'void_dreadnought_boss';

    const obsidian = new THREE.MeshStandardMaterial({ color: 0x1a0912, metalness: 0.82, roughness: 0.24, flatShading: true });
    const armor = new THREE.MeshStandardMaterial({ color: 0x3b0c1e, metalness: 0.72, roughness: 0.3, flatShading: true });
    const crimson = new THREE.MeshBasicMaterial({ color: 0xff2a4f });
    const ember = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    // Central armored spine & bridge citadel
    const spine = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.2, 20), obsidian);
    boss.add(spine);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.0, 6.2), armor);
    bridge.position.set(0, 3.2, 3.5);
    boss.add(bridge);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 12), crimson);
    eye.position.set(0, 3.4, 0.2);
    boss.add(eye);

    // Three armored forward prow blades
    for (const offset of [-3.6, 0, 3.6]) {
      const prow = new THREE.Mesh(new THREE.ConeGeometry(1.8, 9.0, 4), armor);
      prow.rotation.x = -Math.PI / 2;
      prow.position.set(offset, offset === 0 ? 0.2 : -0.4, -13.0);
      boss.add(prow);
    }

    // Swept heavy weapon wings
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.4, 8.5), obsidian);
      wing.position.set(side * 7.8, 0, 1.5);
      wing.rotation.y = side * -0.25;
      boss.add(wing);

      const wingEdge = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.35, 0.6), crimson);
      wingEdge.position.set(side * 7.8, 0.75, -2.5);
      wingEdge.rotation.y = side * -0.25;
      boss.add(wingEdge);

      const reactorPod = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 5.0, 10), armor);
      reactorPod.rotation.x = Math.PI / 2;
      reactorPod.position.set(side * 5.2, -0.6, 8.2);
      boss.add(reactorPod);

      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.6, 10), ember);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(side * 5.2, -0.6, 10.9);
      boss.add(nozzle);
    }

    // Rotating dark energy core ring
    const energyRing = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.4, 8, 32), crimson);
    energyRing.position.set(0, 0, 0.5);
    boss.add(energyRing);

    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xff2a4f,
      transparent: true,
      opacity: 0.09,
      wireframe: true,
      depthWrite: false
    });
    const shield = new THREE.Mesh(new THREE.SphereGeometry(14.5, 18, 12), shieldMat);
    shield.scale.set(1.15, 0.65, 1.3);
    boss.add(shield);

    boss.userData = {
      isShipRoot: true,
      faction: 'alien',
      isBoss: true,
      energyRing,
      shield,
      enginePositions: [[-5.2, -0.6, 11.2], [5.2, -0.6, 11.2], [0, 0, 10.5]],
      thrusterGlowColor: 0xff2a4f,
      collisionRadius: 24
    };
    boss.scale.setScalar(1.45);
    return boss;
  },

  // Create themed modular space station (with rotating habitat & glowing docking ring)
  buildStation: function(seedVal = Math.random(), theme = 'outpost') {
    let seed = seedVal;
    function random() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    const themePalettes = {
      outpost: { metal: 0x5d6a7a, trim: 0x06b6d4, glass: 0x38bdf8, core: 0x00f6ff },
      refinery: { metal: 0x45423e, trim: 0xf59e0b, glass: 0xfbbf24, core: 0xff6b00 },
      citadel: { metal: 0x8b93a8, trim: 0xa855f7, glass: 0xe879f9, core: 0xfde047 }
    };
    const pal = themePalettes[theme] || themePalettes.outpost;

    const stationGroup = new THREE.Group();
    stationGroup.name = `space_station_${theme}`;

    const metalMat = new THREE.MeshStandardMaterial({ color: pal.metal, metalness: 0.78, roughness: 0.3, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: pal.trim, metalness: 0.55, roughness: 0.35, flatShading: true });
    const glassMat = new THREE.MeshStandardMaterial({ color: pal.glass, transparent: true, opacity: 0.58, metalness: 0.85, roughness: 0.12 });
    const coreGlowMat = new THREE.MeshBasicMaterial({ color: pal.core });

    const blinkers = [];
    const rotatingModules = [];

    function assembleModule(partDef, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
      const moduleGroup = new THREE.Group();
      moduleGroup.position.fromArray(position);
      moduleGroup.rotation.fromArray(rotation);
      moduleGroup.scale.fromArray(scale);

      partDef.geometries.forEach(g => {
        let mat = metalMat;
        if (g.isGlass) mat = glassMat;
        else if (g.isGlow) mat = coreGlowMat;
        else if (random() > 0.72) mat = trimMat;

        const geom = getSharedGeometry(g.type, g.size);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.fromArray(g.offset || [0, 0, 0]);
        if (g.rotation) mesh.rotation.fromArray(g.rotation);
        if (g.scale) mesh.scale.fromArray(g.scale);
        moduleGroup.add(mesh);

        if (g.isGlow || random() > 0.94) {
          const beaconGeom = getSharedGeometry('sphere', [0.18, 6, 6]);
          const beaconMat = new THREE.MeshBasicMaterial({ color: random() > 0.5 ? pal.core : pal.trim });
          const beacon = new THREE.Mesh(beaconGeom, beaconMat);
          beacon.position.copy(mesh.position).add(new THREE.Vector3(0, g.size ? g.size[1] * 0.6 : 0.6, 0));
          moduleGroup.add(beacon);
          blinkers.push(beacon);
        }
      });

      if (partDef.id === 'station_habitat_ring' || partDef.id === 'station_gravity_ring') {
        moduleGroup.userData = { rotateSpeed: 0.22 + random() * 0.18 };
        rotatingModules.push(moduleGroup);
      }

      stationGroup.add(moduleGroup);
      return moduleGroup;
    }

    assembleModule(stationCoreHub, [0, 0, 0]);
    assembleModule(stationConnectingStrut, [0, 6, 0]);
    assembleModule(stationCommandBridge, [0, 11.2, 0]);
    assembleModule(stationConnectingStrut, [0, -6, 0]);
    assembleModule(stationReactorCore, [0, -11.5, 0]);
    assembleModule(stationHabitatRing, [-10, 0, 0], [0, 0, Math.PI / 2]);
    assembleModule(stationGravityRing, [0, 0, 0], [Math.PI / 2, 0, 0], [1.25, 1.25, 1.25]);

    assembleModule(stationHangarDeck, [8, 0, 0], [0, 0, -Math.PI / 2]);
    assembleModule(stationDockingBay, [12.5, 0, 0], [0, 0, -Math.PI / 2]);
    assembleModule(stationCargoRack, [0, 0, 8], [Math.PI / 2, 0, 0]);
    assembleModule(stationRefinery, [0, 0, 13.5], [Math.PI / 2, 0, 0]);
    assembleModule(stationSolarArray, [0, 0, -9], [Math.PI / 2, 0, 0]);

    assembleModule(stationSensorSpire, [0, 13.5, 0]);
    assembleModule(stationAntennaMast, [0, 17.5, 0]);
    assembleModule(stationBiodomePod, [0, 4.5, 7]);
    assembleModule(stationObservationDeck, [0, 7, -4]);
    assembleModule(stationTurretDefense, [0, -14, 4]);
    assembleModule(stationDefensePlatform, [0, -15.5, 0], [Math.PI, 0, 0]);
    assembleModule(stationShieldPylon, [-3.5, -12, 0], [0, 0, 0.5]);
    assembleModule(stationShieldPylon, [3.5, -12, 0], [0, 0, -0.5]);
    assembleModule(stationFuelTank, [-6.5, 6, 0], [0, 0, Math.PI / 2]);
    assembleModule(stationFuelTank, [6.5, 6, 0], [0, 0, -Math.PI / 2]);
    assembleModule(stationRadiatorWing, [-12.5, -6, 0], [0, 0, Math.PI / 2]);
    assembleModule(stationRadiatorWing, [12.5, -6, 0], [0, 0, -Math.PI / 2]);

    // Bright pulsing Docking Corridor Ring outside the docking bay
    const dockingRing = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.38, 10, 32),
      new THREE.MeshBasicMaterial({ color: pal.core, transparent: true, opacity: 0.78 })
    );
    dockingRing.rotation.y = Math.PI / 2;
    dockingRing.position.set(17.5, 0, 0);
    stationGroup.add(dockingRing);

    stationGroup.scale.set(1.65, 1.65, 1.65);

    stationGroup.userData = {
      theme,
      blinkers,
      rotatingModules,
      dockingRing,
      dockingPositions: [[17.5, 0.0, 0.0]],
      dockingRadius: 95,
      collisionRadius: 38
    };

    return stationGroup;
  }
};
