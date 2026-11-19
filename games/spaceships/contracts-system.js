// Loot Pods & Tractor Beam, Threat/Boss Director, and Space Station Contracts System
import { getPilotBonuses } from './ship-catalog.js';

const THREE = window.THREE;

export class ContractsSystem {
  constructor(core) {
    this.core = core;
    this.lootPods = [];
    this.threatLevel = 1;
    this.killsSinceBoss = 0;
    this.totalKills = 0;
    this.activeContracts = [];
    this.stationBoards = new Map();
    this.beamTicker = 0;
  }

  getEnemySpec(archetypeOverride = null) {
    const t = this.threatLevel;
    let archetype = archetypeOverride;
    if (!archetype) {
      const r = Math.random();
      if (t >= 4 && r < 0.22) archetype = 'raider';
      else if (t >= 2 && r < 0.45) archetype = 'gunship';
      else if (r < 0.72) archetype = 'interceptor';
      else archetype = 'scout';
    }

    if (archetype === 'boss') {
      return {
        archetype: 'boss',
        name: 'Void Dreadnought',
        maxHealth: 1100 + t * 180,
        maxSpeed: 96,
        size: 23,
        bounty: 4800 + t * 500,
        damage: 42,
        fireInterval: 1.1,
        isBoss: true
      };
    }
    if (archetype === 'raider') {
      return {
        archetype: 'raider',
        name: 'Crimson Raider',
        maxHealth: 300 + t * 28,
        maxSpeed: 162,
        size: 12.2,
        bounty: 680 + t * 40,
        damage: 30,
        fireInterval: 1.45,
        isBoss: false
      };
    }
    if (archetype === 'gunship') {
      return {
        archetype: 'gunship',
        name: 'Viper Gunship',
        maxHealth: 220 + t * 22,
        maxSpeed: 148,
        size: 11.2,
        bounty: 480 + t * 30,
        damage: 26,
        fireInterval: 1.55,
        isBoss: false
      };
    }
    if (archetype === 'scout') {
      return {
        archetype: 'scout',
        name: 'Dart Scout',
        maxHealth: 78 + t * 8,
        maxSpeed: 235,
        size: 7.8,
        bounty: 210 + t * 15,
        damage: 14,
        fireInterval: 2.1,
        isBoss: false
      };
    }
    return {
      archetype: 'interceptor',
      name: 'Alien Interceptor',
      maxHealth: 120 + t * 12,
      maxSpeed: 185,
      size: 9.5,
      bounty: 290 + t * 20,
      damage: 20,
      fireInterval: 1.85,
      isBoss: false
    };
  }

  recordEnemyKill(alien) {
    this.totalKills += 1;
    if (alien?.isBoss) {
      this.killsSinceBoss = 0;
      this.threatLevel = Math.min(10, this.threatLevel + 1);
      this.recordEvent('boss', 1);
    } else {
      this.killsSinceBoss += 1;
      if (this.totalKills % 12 === 0) {
        this.threatLevel = Math.min(10, this.threatLevel + 1);
      }
    }
    this.recordEvent('kill', 1, { archetype: alien?.archetype });
  }

  shouldSpawnBoss(activeAliens) {
    const hasBoss = activeAliens.some(a => a.isBoss);
    if (hasBoss) return false;
    return this.killsSinceBoss >= 14;
  }

  spawnLootPod(pos, kind = 'salvage', amount = 180, label = '') {
    if (!this.core?.scene) return null;
    const palette = {
      salvage: 0xfbbf24,
      ore: 0x38bdf8,
      repair: 0x10b981
    };
    const color = palette[kind] || 0xfbbf24;
    const geom = kind === 'repair'
      ? new THREE.BoxGeometry(2.2, 2.2, 2.2)
      : new THREE.OctahedronGeometry(2.0, 0);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.65,
      metalness: 0.5,
      roughness: 0.25
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos).add(new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 8
    ));
    this.core.scene.add(mesh);

    const pod = {
      mesh,
      kind,
      amount,
      label,
      life: 45,
      drift: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
    };
    this.lootPods.push(pod);
    return pod;
  }

  update(dt, leadShip, stats) {
    if (!leadShip || this.lootPods.length === 0) return;
    this.beamTicker += dt;
    const tractorRange = stats?.tractorRange || 55;
    const rangeSq = tractorRange * tractorRange;
    const nextPods = [];

    for (const pod of this.lootPods) {
      pod.life -= dt;
      if (pod.life <= 0) {
        this.core.scene.remove(pod.mesh);
        pod.mesh.geometry?.dispose();
        pod.mesh.material?.dispose();
        continue;
      }

      pod.mesh.rotation.y += dt * 2.4;
      pod.mesh.rotation.x += dt * 1.1;
      pod.mesh.position.addScaledVector(pod.drift, dt);

      const distSq = pod.mesh.position.distanceToSquared(leadShip.pos);
      if (distSq < rangeSq) {
        const pullDir = leadShip.pos.clone().sub(pod.mesh.position).normalize();
        const pullSpeed = 135 + Math.max(0, tractorRange - Math.sqrt(distSq)) * 1.8;
        pod.mesh.position.addScaledVector(pullDir, pullSpeed * dt);
        if (this.beamTicker > 0.06) {
          this.core.fx?.spawnTractorBeam?.(pod.mesh.position.clone(), leadShip.pos.clone());
        }
      }

      if (pod.mesh.position.distanceToSquared(leadShip.pos) < 14 * 14) {
        this.collectPod(pod, leadShip, stats);
        this.core.scene.remove(pod.mesh);
        pod.mesh.geometry?.dispose();
        pod.mesh.material?.dispose();
        continue;
      }
      nextPods.push(pod);
    }

    if (this.beamTicker > 0.06) this.beamTicker = 0;
    this.lootPods = nextPods;
  }

  collectPod(pod, leadShip, stats) {
    if (pod.kind === 'ore') {
      const gained = Math.max(1, Math.round(pod.amount * (stats?.miningMult || 1)));
      const space = Math.max(0, (stats?.cargoCap || 20) - (this.core.oreCargo || 0));
      const stored = Math.min(space, gained);
      if (stored > 0) {
        this.core.oreCargo = (this.core.oreCargo || 0) + stored;
        this.core.fx?.spawnFloatingText?.(leadShip.pos, `+${stored} ORE`, '#38bdf8');
        this.recordEvent('ore', stored);
      } else {
        const overflowCr = gained * 75;
        this.core.credits += overflowCr;
        this.core.fx?.spawnFloatingText?.(leadShip.pos, `CARGO FULL +${overflowCr} CR`, '#fbbf24');
      }
      this.core.soundSystem?.playCashCoin?.();
    } else if (pod.kind === 'repair') {
      const hullHeal = Math.min(leadShip.maxHull - leadShip.hull, pod.amount);
      leadShip.hull = Math.min(leadShip.maxHull, leadShip.hull + pod.amount);
      leadShip.shield = Math.min(leadShip.maxShield, leadShip.shield + pod.amount * 0.8);
      this.core.fx?.spawnFloatingText?.(leadShip.pos, `+${Math.round(hullHeal || pod.amount)} REPAIR`, '#10b981');
      this.core.soundSystem?.playObjectiveDing?.();
    } else {
      const bonusCr = Math.round(pod.amount * (stats?.salvageYieldMult || 1));
      this.core.credits += bonusCr;
      this.core.fx?.spawnFloatingText?.(leadShip.pos, `+${bonusCr} CR`, '#fbbf24');
      this.core.soundSystem?.playCashCoin?.();
      this.recordEvent('salvage', 1);
    }
    this.core.updateCreditsHud?.();
  }

  getStationContracts(station, pilotLife, planetProgress, forceRefresh = false) {
    if (!station) return [];
    if (!forceRefresh && this.stationBoards.has(station.id)) {
      return this.stationBoards.get(station.id);
    }
    const { contractTier } = getPilotBonuses(pilotLife);
    const mult = 1 + (contractTier - 1) * 0.35;
    const uncompletedWorlds = ['Ember', 'Azure', 'Viridian', 'Cryo', 'Obsidian', 'Aurelia']
      .filter(name => !planetProgress?.[name]?.completed);
    const surveyTarget = uncompletedWorlds[0] || 'Ember';

    const pool = [];
    const uid = () => `ctr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    if (station.specialty === 'mining') {
      pool.push({
        id: uid(),
        stationId: station.id,
        kind: 'ore',
        title: `Belt Ore Quota (${4 + contractTier * 2}t)`,
        desc: `Laser-mine glowing ore asteroids and tractor ${4 + contractTier * 2} tons of raw ore.`,
        targetCount: 4 + contractTier * 2,
        progress: 0,
        reward: Math.round(2800 * mult)
      });
      pool.push({
        id: uid(),
        stationId: station.id,
        kind: 'salvage',
        title: 'Derelict & Salvage Sweep',
        desc: `Recover ${2 + Math.floor(contractTier / 2)} salvage pods or derelict ship wrecks.`,
        targetCount: 2 + Math.floor(contractTier / 2),
        progress: 0,
        reward: Math.round(3200 * mult)
      });
    } else if (station.specialty === 'trade') {
      pool.push({
        id: uid(),
        stationId: station.id,
        kind: 'survey',
        title: `Frontier Survey: ${surveyTarget}`,
        desc: `Land on ${surveyTarget} and run a planetary zone scan (or interact with a surface site).`,
        targetCount: 1,
        targetPlanet: surveyTarget,
        progress: 0,
        reward: Math.round(4500 * mult)
      });
      pool.push({
        id: uid(),
        stationId: station.id,
        kind: 'boss',
        title: 'Capital Threat Elimination',
        desc: 'Intercept and destroy a Void Dreadnought capital warship.',
        targetCount: 1,
        progress: 0,
        reward: Math.round(12500 * mult)
      });
    } else {
      pool.push({
        id: uid(),
        stationId: station.id,
        kind: 'kill',
        title: `Sector Patrol (${4 + contractTier * 2} Hostiles)`,
        desc: `Clear ${4 + contractTier * 2} alien raiders from starfleet shipping lanes.`,
        targetCount: 4 + contractTier * 2,
        progress: 0,
        reward: Math.round(2600 * mult)
      });
      pool.push({
        id: uid(),
        stationId: station.id,
        kind: 'boss',
        title: 'Dreadnought Intercept',
        desc: 'Track and neutralize a Void Dreadnought flagship threatening the system.',
        targetCount: 1,
        progress: 0,
        reward: Math.round(11500 * mult)
      });
    }

    // Add universal secondary contracts so every station has 4 contracts
    pool.push({
      id: uid(),
      stationId: station.id,
      kind: 'kill',
      title: `Hostile Skirmish Sweep (${5 + contractTier * 2})`,
      desc: `Destroy ${5 + contractTier * 2} alien craft anywhere in the system.`,
      targetCount: 5 + contractTier * 2,
      progress: 0,
      reward: Math.round(3100 * mult)
    });
    pool.push({
      id: uid(),
      stationId: station.id,
      kind: 'ore',
      title: `Mineral Prospecting (${3 + contractTier * 2}t)`,
      desc: `Extract ${3 + contractTier * 2} units of asteroid ore using your primary cannons or Mining Laser.`,
      targetCount: 3 + contractTier * 2,
      progress: 0,
      reward: Math.round(2400 * mult)
    });

    this.stationBoards.set(station.id, pool);
    return pool;
  }

  acceptContract(station, contractId) {
    if (this.activeContracts.length >= 3) {
      return { error: 'Maximum 3 active contracts reached. Complete one first.' };
    }
    const board = this.stationBoards.get(station?.id) || [];
    const idx = board.findIndex(c => c.id === contractId);
    if (idx === -1) return { error: 'Contract unavailable.' };
    const [contract] = board.splice(idx, 1);
    this.activeContracts.push(contract);
    if (contract.kind === 'boss') {
      this.core.ensureBossSpawned?.();
    }
    return { accepted: contract };
  }

  abandonContract(contractId) {
    this.activeContracts = this.activeContracts.filter(c => c.id !== contractId);
  }

  recordEvent(kind, amount = 1, meta = {}) {
    if (!this.activeContracts.length) return [];
    const completed = [];
    const remaining = [];

    for (const c of this.activeContracts) {
      let match = c.kind === kind;
      if (kind === 'survey' && c.kind === 'survey' && c.targetPlanet && meta.planet) {
        match = c.targetPlanet === meta.planet;
      }
      if (match) {
        c.progress = Math.min(c.targetCount, (c.progress || 0) + amount);
      }
      if (c.progress >= c.targetCount) {
        completed.push(c);
      } else {
        remaining.push(c);
      }
    }

    this.activeContracts = remaining;
    if (completed.length > 0) {
      completed.forEach(c => this.core.onContractCompleted?.(c));
    }
    return completed;
  }

  destroy() {
    this.lootPods.forEach(pod => {
      this.core?.scene?.remove(pod.mesh);
      pod.mesh.geometry?.dispose();
      pod.mesh.material?.dispose();
    });
    this.lootPods = [];
    this.activeContracts = [];
    this.stationBoards.clear();
  }
}
