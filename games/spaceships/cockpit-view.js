// Authentic Star Wars 3D Starfighter Cockpit View (Exclusive Dedicated Model)
// Rendered exclusively in 'cockpit' view:
// - Heavy dark Durasteel canopy struts with illuminated overhead annunciator blocks
// - Center console: Smart Positional Radar (red hostile blips, green friendly blips, death 'X' markers with timed fadeout)
// - Left console: Missile bay quad-status, salvo recharge counter, and live rotating dorsal turret aim & firing indicator
// - Right console: Top-down orbital solar system map with planets, sun, orbits, and hero ship cluster
// - Animated dual-grip flight yoke & throttle lever, G-force inertia sway & red alert shield-hit lighting
// - Outer wingtip laser cannons with recoil & muzzle flashes flanking the windshield

const THREE = window.THREE;

export class CockpitView {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'star_wars_cockpit_3d';
    this.group.visible = false;

    // Attach cockpit directly to the camera so it is perfectly rock-solid and stable in first-person
    if (this.camera && !this.camera.parent && this.scene) {
      this.scene.add(this.camera);
    }
    if (this.camera) {
      this.camera.add(this.group);
    }

    // Dynamic state for inertia, animations, and weapon recoil
    this.prevQuat = new THREE.Quaternion();
    this.prevQuatInitialized = false;
    this.smoothYawRate = 0;
    this.smoothPitchRate = 0;
    this.smoothRollRate = 0;
    this.recoilLeft = 0;
    this.recoilRight = 0;
    this.nextCannonSide = 1;
    this.muzzleFlashTimer = 0;
    this.canvasUpdateTimer = 0;

    // References to animated 3D sub-components
    this.rig = new THREE.Group(); // Sways slightly with G-force & weapon recoil
    this.group.add(this.rig);

    this.yokePivot = null;
    this.throttleHandle = null;
    this.leftCannons = null;
    this.rightCannons = null;
    this.muzzleFlashes = [];
    this.muzzleLight = null;
    this.interiorLight = null;
    this.alarmLights = [];
    this.blinkingButtons = [];

    // Flight Computer Canvases
    this.centerRadarCanvas = null;
    this.centerRadarCtx = null;
    this.centerRadarTexture = null;

    this.leftMissileCanvas = null;
    this.leftMissileCtx = null;
    this.leftMissileTexture = null;

    this.rightSolarCanvas = null;
    this.rightSolarCtx = null;
    this.rightSolarTexture = null;

    this.upperRightScannerCanvas = null;
    this.upperRightScannerCtx = null;
    this.upperRightScannerTexture = null;

    // Death marker tracking: dead ships turn into red/green X's and fade out over ~2.5s
    this.deathMarkers = [];
    this.knownAliens = new Map();
    this.knownFriendlies = new Map();

    this.buildCockpit();
  }

  buildCockpit() {
    // Star Wars Industrial Materials (Matte Anti-Glare Avionics)
    const durasteelDark = new THREE.MeshStandardMaterial({
      color: 0x090c12,
      metalness: 0.25,
      roughness: 0.85
    });
    const durasteelMid = new THREE.MeshStandardMaterial({
      color: 0x0f131c,
      metalness: 0.30,
      roughness: 0.80
    });
    const durasteelTrim = new THREE.MeshStandardMaterial({
      color: 0x1a212e,
      metalness: 0.45,
      roughness: 0.65
    });
    const rebelWhite = new THREE.MeshStandardMaterial({
      color: 0xd4dbe4,
      metalness: 0.50,
      roughness: 0.35
    });
    const rebelRed = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      metalness: 0.45,
      roughness: 0.38
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.94,
      roughness: 0.12
    });

    const canopyGlassMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.045,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // =========================================================================
    // 1. CANOPY STRUTS & OCTAGONAL/TRAPEZOIDAL STAR WARS VIEWPORT FRAME
    // =========================================================================
    const canopyGroup = new THREE.Group();
    this.rig.add(canopyGroup);

    const addStrut = (p1, p2, radius = 0.034, mat = durasteelDark) => {
      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);
      const dist = v1.distanceTo(v2);
      const geom = new THREE.CylinderGeometry(radius, radius, dist, 8);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(v1).add(v2).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
      canopyGroup.add(mesh);

      // Collar joints at strut junctions
      for (const endPos of [v1, v2]) {
        const joint = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.35, radius * 1.35, 0.05, 8), durasteelTrim);
        joint.position.copy(endPos);
        joint.quaternion.copy(mesh.quaternion);
        canopyGroup.add(joint);
      }
      return mesh;
    };

    // Forward trapezoidal windshield frame (classic Star Wars X-Wing / Falcon look)
    const fTL = [-0.62, 0.50, -1.62];
    const fTR = [0.62, 0.50, -1.62];
    const fBL = [-0.88, -0.22, -1.55];
    const fBR = [0.88, -0.22, -1.55];

    // Mid arch points
    const mTL = [-0.82, 0.68, -0.62];
    const mTR = [0.82, 0.68, -0.62];
    const mBL = [-1.18, -0.28, -0.55];
    const mBR = [1.18, -0.28, -0.55];

    // Rear bulkhead points
    const rTL = [-0.74, 0.66, 0.35];
    const rTR = [0.74, 0.66, 0.35];
    const rBL = [-1.12, -0.32, 0.35];
    const rBR = [1.12, -0.32, 0.35];

    // Main structural A-pillars, B-pillars, and roof rails
    addStrut(fTL, fTR, 0.038); // Top crossbar
    addStrut(fBL, fTL, 0.040); // Left forward A-pillar
    addStrut(fBR, fTR, 0.040); // Right forward A-pillar
    addStrut(fBL, fBR, 0.032); // Lower cowl bar

    addStrut(fTL, mTL, 0.036);
    addStrut(fTR, mTR, 0.036);
    addStrut(mTL, rTL, 0.036);
    addStrut(mTR, rTR, 0.036);
    addStrut(mTL, mTR, 0.032);

    addStrut(fBL, mBL, 0.038);
    addStrut(fBR, mBR, 0.038);
    addStrut(mBL, rBL, 0.038);
    addStrut(mBR, rBR, 0.038);

    addStrut(mBL, mTL, 0.030);
    addStrut(mBR, mTR, 0.030);

    // Diagonal corner braces
    addStrut([-0.62, 0.36, -1.60], [-0.44, 0.50, -1.62], 0.020, durasteelTrim);
    addStrut([0.62, 0.36, -1.60], [0.44, 0.50, -1.62], 0.020, durasteelTrim);
    addStrut([-0.79, -0.06, -1.56], [-0.62, -0.22, -1.55], 0.020, durasteelTrim);
    addStrut([0.79, -0.06, -1.56], [0.62, -0.22, -1.55], 0.020, durasteelTrim);

    // Forward windshield pane
    const frontPane = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.72), canopyGlassMat);
    frontPane.position.set(0, 0.14, -1.60);
    frontPane.rotation.x = -0.32;
    canopyGroup.add(frontPane);

    // =========================================================================
    // 1B. COCKPIT INTERIOR TUB: SOLID FLOOR, LOWER SIDEWALLS & BULKHEAD
    // =========================================================================
    const tubGroup = new THREE.Group();
    this.rig.add(tubGroup);

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080b10,
      metalness: 0.35,
      roughness: 0.85
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b0e16,
      metalness: 0.30,
      roughness: 0.80
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x131822,
      metalness: 0.45,
      roughness: 0.70
    });

    // 1. Solid Main Floor Deck Plate (from forward pedals at z = -1.60 back to seat bulkhead at z = +0.45)
    const floorPlate = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.04, 2.15), floorMat);
    floorPlate.position.set(0, -0.75, -0.55);
    tubGroup.add(floorPlate);

    // Center treadplate runway below the flight yoke
    const treadPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.015, 1.8), panelMat);
    treadPlate.position.set(0, -0.73, -0.60);
    tubGroup.add(treadPlate);

    // Tread lines / anti-skid floor ribs
    for (let r = 0; r < 8; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.01, 0.03), durasteelTrim);
      rib.position.set(0, -0.72, -1.35 + r * 0.18);
      tubGroup.add(rib);
    }

    // Starfighter rudder pedals in footwell
    for (const side of [-1, 1]) {
      const pedalArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.03), durasteelTrim);
      pedalArm.position.set(side * 0.18, -0.66, -1.32);
      pedalArm.rotation.x = -0.35;
      const pedalPlate = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.02), chromeMat);
      pedalPlate.position.set(side * 0.18, -0.61, -1.36);
      pedalPlate.rotation.x = -0.35;
      tubGroup.add(pedalArm, pedalPlate);
    }

    // 2. Forward Firewall / Footwell Kickplate under dashboard
    const forwardFirewall = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.52, 0.06), wallMat);
    forwardFirewall.position.set(0, -0.52, -1.58);
    forwardFirewall.rotation.x = 0.18; // sloped forward into nose
    tubGroup.add(forwardFirewall);

    // 3. Left & Right Sidewalls below the window sill struts
    // The window sill runs from fBL (-0.88, -0.22, -1.55) to mBL (-1.18, -0.28, -0.55) to rBL (-1.12, -0.32, +0.35)
    // Floor is at y = -0.75
    for (const side of [-1, 1]) {
      // Forward sidewall panel: spans from z = -1.55 to z = -0.55
      const fwdWallAngle = Math.atan2(1.18 - 0.88, 1.55 - 0.55) * side; // angle outward
      const fwdWallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 1.06), wallMat);
      fwdWallMesh.position.set(side * 1.03, -0.50, -1.05);
      fwdWallMesh.rotation.y = fwdWallAngle;
      tubGroup.add(fwdWallMesh);

      // Mid-to-rear sidewall panel: spans from z = -0.55 to z = +0.40
      const rearWallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.95), wallMat);
      rearWallMesh.position.set(side * 1.15, -0.52, -0.08);
      tubGroup.add(rearWallMesh);

      // Angled lower sill ledge right underneath the canopy bottom strut
      const sillLedgeFwd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 1.06), durasteelTrim);
      sillLedgeFwd.position.set(side * 1.03, -0.25, -1.05);
      sillLedgeFwd.rotation.y = fwdWallAngle;
      tubGroup.add(sillLedgeFwd);

      const sillLedgeRear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.95), durasteelTrim);
      sillLedgeRear.position.set(side * 1.15, -0.30, -0.08);
      tubGroup.add(sillLedgeRear);

      // Inset avionics maintenance panels on the sidewall
      for (let p = 0; p < 3; p++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.24), panelMat);
        panel.position.set(side * 1.12, -0.52, -0.42 + p * 0.32);
        tubGroup.add(panel);

        const boltL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.02), chromeMat);
        boltL.position.set(side * 1.12, -0.43, -0.42 + p * 0.32);
        tubGroup.add(boltL);
      }

      // Cable bundle runs along the junction where sidewall meets floor
      const floorCable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.05, 8), durasteelDark);
      floorCable.rotation.x = Math.PI / 2;
      floorCable.position.set(side * 0.94, -0.72, -0.55);
      tubGroup.add(floorCable);

      const floorCable2 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.05, 8), durasteelTrim);
      floorCable2.rotation.x = Math.PI / 2;
      floorCable2.position.set(side * 0.91, -0.725, -0.55);
      tubGroup.add(floorCable2);
    }

    // 4. Rear Bulkhead Wall & Pilot Seat Backing (behind pilot at z = +0.38)
    const rearBulkhead = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.08, 0.08), wallMat);
    rearBulkhead.position.set(0, -0.22, 0.38);
    tubGroup.add(rearBulkhead);

    // Rear bulkhead structural framing arch
    const rearFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.12, 0.10), durasteelTrim);
    rearFrameL.position.set(-0.76, -0.20, 0.37);
    const rearFrameR = rearFrameL.clone();
    rearFrameR.position.x = 0.76;
    tubGroup.add(rearFrameL, rearFrameR);

    // Pilot Ejection Seat structure directly behind camera
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.78, 0.12), durasteelDark);
    seatBack.position.set(0, -0.32, 0.22);
    seatBack.rotation.x = -0.12;
    tubGroup.add(seatBack);

    const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.10), new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.15,
      roughness: 0.90
    }));
    headRest.position.set(0, 0.14, 0.26);
    headRest.rotation.x = -0.12;
    tubGroup.add(headRest);

    // Life support / oxygen canisters on rear bulkhead
    for (const side of [-1, 1]) {
      const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.44, 10), chromeMat);
      canister.position.set(side * 0.52, -0.18, 0.32);
      tubGroup.add(canister);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), durasteelTrim);
      cap.position.set(side * 0.52, 0.06, 0.32);
      tubGroup.add(cap);
    }

    // =========================================================================
    // 2. OVERHEAD BROW CONSOLE & WARNING LAMPS
    // =========================================================================
    const overheadGroup = new THREE.Group();
    overheadGroup.position.set(0, 0.54, -1.25);
    overheadGroup.rotation.x = 0.38;
    this.rig.add(overheadGroup);

    const browHousing = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.11, 0.32), durasteelDark);
    overheadGroup.add(browHousing);

    const browTrim = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.025, 0.34), durasteelTrim);
    browTrim.position.y = -0.048;
    overheadGroup.add(browTrim);

    const annunciatorColors = [0xef4444, 0xf59e0b, 0x10b981, 0x38bdf8, 0xf59e0b, 0xef4444];
    for (let i = 0; i < 6; i++) {
      const isAlarm = i === 0 || i === 5;
      const mat = new THREE.MeshBasicMaterial({ color: annunciatorColors[i] });
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.042, 0.02), mat);
      lamp.position.set(-0.38 + i * 0.152, 0, 0.162);
      overheadGroup.add(lamp);
      if (isAlarm) {
        this.alarmLights.push(lamp);
      } else {
        this.blinkingButtons.push({
          mesh: lamp,
          baseColor: new THREE.Color(annunciatorColors[i]),
          speed: 2.2 + i * 0.7,
          phase: i * 1.3
        });
      }
    }

    // Overhead optical rangefinder pod hanging from right brow
    const rangefinderPod = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.18), durasteelMid);
    rangefinderPod.position.set(0.32, -0.08, 0.04);
    overheadGroup.add(rangefinderPod);
    const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.04, 12), chromeMat);
    lensRing.rotation.x = Math.PI / 2;
    lensRing.position.set(0.32, -0.08, 0.13);
    overheadGroup.add(lensRing);
    const lensGlow = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    lensGlow.position.set(0.32, -0.08, 0.151);
    overheadGroup.add(lensGlow);

    // =========================================================================
    // 2B. UPPER-RIGHT CIRCULAR CRT PLANETARY SCANNER (Iconic Star Wars Target Scanner)
    // =========================================================================
    this.initUpperRightScannerCanvas();
    const upperRightGroup = new THREE.Group();
    upperRightGroup.position.set(0.66, 0.38, -1.22);
    upperRightGroup.rotation.set(0.12, -0.34, -0.06);
    this.rig.add(upperRightGroup);

    // Outer cylindrical housing and chamfered bezel
    const crtCasing = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.20, 0.08, 24), durasteelMid);
    crtCasing.rotation.x = Math.PI / 2;
    crtCasing.position.z = -0.01;
    upperRightGroup.add(crtCasing);

    // Bezel trim ring (open torus so it does not block the screen)
    const crtTrimRing = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.016, 8, 24), durasteelTrim);
    crtTrimRing.position.z = 0.046;
    upperRightGroup.add(crtTrimRing);

    const crtInnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.008, 8, 24), chromeMat);
    crtInnerRing.position.z = 0.050;
    upperRightGroup.add(crtInnerRing);

    // Circular screen displaying the rotating emerald planetary radar scan
    const scannerScreenMat = new THREE.MeshBasicMaterial({
      map: this.upperRightScannerTexture,
      side: THREE.DoubleSide
    });
    const scannerScreenMesh = new THREE.Mesh(new THREE.CircleGeometry(0.165, 24), scannerScreenMat);
    scannerScreenMesh.position.z = 0.052;
    upperRightGroup.add(scannerScreenMesh);

    // Solid mounting strut clamp anchoring it securely to the right canopy A-pillar
    const crtBracket = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.24, 8), durasteelDark);
    crtBracket.position.set(0.09, 0.08, -0.04);
    crtBracket.rotation.z = 0.72;
    upperRightGroup.add(crtBracket);

    // =========================================================================
    // 3. MAIN DASHBOARD: CENTER FORWARD-FACING POSITIONAL RADAR
    // =========================================================================
    const dashGroup = new THREE.Group();
    this.rig.add(dashGroup);

    // Anti-glare cowl
    const cowlTop = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.09, 0.68), durasteelDark);
    cowlTop.position.set(0, -0.24, -1.28);
    cowlTop.rotation.x = 0.12;
    dashGroup.add(cowlTop);

    // Center Pedestal housing the smart forward radar screen
    const centerPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.56), durasteelMid);
    centerPedestal.position.set(0, -0.42, -1.20);
    centerPedestal.rotation.x = -0.24;
    dashGroup.add(centerPedestal);

    const crtBezel = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.06), durasteelTrim);
    crtBezel.position.set(0, -0.35, -0.93);
    crtBezel.rotation.x = -0.24;
    dashGroup.add(crtBezel);

    // Center screen: Forward-Facing Positional Radar
    this.initCenterRadarCanvas();
    const crtScreenMat = new THREE.MeshBasicMaterial({ map: this.centerRadarTexture });
    const crtScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), crtScreenMat);
    crtScreen.position.set(0, -0.35, -0.898);
    crtScreen.rotation.x = -0.24;
    dashGroup.add(crtScreen);

    // Optical combiner HUD glass above dashboard
    const hudBracketL = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.08, 0.03), durasteelTrim);
    hudBracketL.position.set(-0.21, -0.16, -1.16);
    hudBracketL.rotation.x = -0.2;
    const hudBracketR = hudBracketL.clone();
    hudBracketR.position.x = 0.21;
    dashGroup.add(hudBracketL, hudBracketR);

    const hudGlassMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const hudGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.20), hudGlassMat);
    hudGlass.position.set(0, -0.10, -1.16);
    hudGlass.rotation.x = -0.2;
    dashGroup.add(hudGlass);

    // Subtle luminescent bezel edge around the combiner glass
    const hudEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.40, 0.20)),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    );
    hudEdges.position.copy(hudGlass.position);
    hudEdges.rotation.copy(hudGlass.rotation);
    dashGroup.add(hudEdges);

    // Glowing 3D Vector Sight Reticle
    const reticleGroup = new THREE.Group();
    reticleGroup.position.set(0, -0.10, -1.155);
    reticleGroup.rotation.x = -0.2;
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(0.052, 0.056, 24), reticleMat);
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.017, 16), reticleMat);
    reticleGroup.add(outerRing, innerRing);
    for (let a = 0; a < 4; a++) {
      const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.032), reticleMat);
      const angle = (a * Math.PI) / 2 + Math.PI / 4;
      tick.position.set(Math.cos(angle) * 0.045, Math.sin(angle) * 0.045, 0);
      tick.rotation.z = angle + Math.PI / 2;
      reticleGroup.add(tick);
    }
    dashGroup.add(reticleGroup);

    // =========================================================================
    // 4. LEFT CONSOLE: MISSILE RECHARGE & ROTATING TURRET HUD
    // =========================================================================
    this.initLeftMissileCanvas();

    const leftConsole = new THREE.Group();
    leftConsole.position.set(-0.62, -0.45, -1.02);
    leftConsole.rotation.set(-0.28, 0.42, 0.08);
    dashGroup.add(leftConsole);

    const leftPanelBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.48), durasteelMid);
    leftConsole.add(leftPanelBody);

    const leftScreenBezel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.04), durasteelTrim);
    leftScreenBezel.position.set(0.06, 0.04, 0.23);
    leftConsole.add(leftScreenBezel);

    const leftScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.18),
      new THREE.MeshBasicMaterial({ map: this.leftMissileTexture })
    );
    leftScreenMesh.position.set(0.06, 0.04, 0.252);
    leftConsole.add(leftScreenMesh);

    this.populateConsoleGreebles(leftConsole, -0.18, -0.08, 0.245, 4, 3);

    // =========================================================================
    // 5. RIGHT CONSOLE: TOP-DOWN SOLAR SYSTEM LOCAL POSITIONAL RADAR
    // =========================================================================
    this.initRightSolarCanvas();

    const rightConsole = new THREE.Group();
    rightConsole.position.set(0.62, -0.45, -1.02);
    rightConsole.rotation.set(-0.28, -0.42, -0.08);
    dashGroup.add(rightConsole);

    const rightPanelBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.48), durasteelMid);
    rightConsole.add(rightPanelBody);

    const rightScreenBezel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.04), durasteelTrim);
    rightScreenBezel.position.set(-0.06, 0.04, 0.23);
    rightConsole.add(rightScreenBezel);

    const rightScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.18),
      new THREE.MeshBasicMaterial({ map: this.rightSolarTexture })
    );
    rightScreenMesh.position.set(-0.06, 0.04, 0.252);
    rightConsole.add(rightScreenMesh);

    this.populateConsoleGreebles(rightConsole, 0.11, -0.08, 0.245, 4, 3);

    // =========================================================================
    // 6. SIDE ARMRESTS, THROTTLE & POWER CELLS
    // =========================================================================
    const leftArmrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.85), durasteelDark);
    leftArmrest.position.set(-0.78, -0.62, -0.52);
    this.rig.add(leftArmrest);

    const throttleTrack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.36), durasteelTrim);
    throttleTrack.position.set(-0.74, -0.48, -0.58);
    this.rig.add(throttleTrack);

    this.throttleHandle = new THREE.Group();
    this.throttleHandle.position.set(-0.74, -0.46, -0.58);
    const throttleStem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.04), chromeMat);
    throttleStem.position.y = 0.04;
    const throttleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.13, 12), durasteelMid);
    throttleGrip.rotation.z = Math.PI / 2;
    throttleGrip.position.y = 0.09;
    const throttleBoostLED = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.015, 0.015),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    throttleBoostLED.position.set(0.04, 0.09, 0);
    this.throttleHandle.add(throttleStem, throttleGrip, throttleBoostLED);
    this.rig.add(this.throttleHandle);

    const rightArmrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.85), durasteelDark);
    rightArmrest.position.set(0.78, -0.62, -0.52);
    this.rig.add(rightArmrest);

    for (let c = 0; c < 5; c++) {
      const cell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.08, 10),
        new THREE.MeshBasicMaterial({ color: c < 3 ? 0x10b981 : 0xf59e0b })
      );
      cell.position.set(0.74, -0.47, -0.42 - c * 0.065);
      this.rig.add(cell);
      this.blinkingButtons.push({
        mesh: cell,
        baseColor: new THREE.Color(c < 3 ? 0x10b981 : 0xf59e0b),
        speed: 1.8 + c * 0.5,
        phase: c
      });
    }

    // Ribbed hoses along cockpit sidewalls
    for (const side of [-1, 1]) {
      for (let r = 0; r < 10; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.009, 6, 12), durasteelTrim);
        ring.position.set(side * 0.92, -0.35 + r * 0.012, -0.95 + r * 0.065);
        ring.rotation.y = side * 0.2;
        this.rig.add(ring);
      }
    }

    // =========================================================================
    // 7. ANIMATED DUAL-GRIP STARFIGHTER FLIGHT YOKE
    // =========================================================================
    this.yokePivot = new THREE.Group();
    this.yokePivot.position.set(0, -0.68, -0.66);
    this.rig.add(this.yokePivot);

    const yokeBoot = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 12), durasteelDark);
    yokeBoot.position.y = 0.05;
    this.yokePivot.add(yokeBoot);

    const columnShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.28, 12), durasteelMid);
    columnShaft.position.set(0, 0.18, 0.02);
    columnShaft.rotation.x = 0.18;
    this.yokePivot.add(columnShaft);

    const yokeHead = new THREE.Group();
    yokeHead.position.set(0, 0.31, 0.05);
    this.yokePivot.add(yokeHead);

    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.042, 0.045), durasteelTrim);
    yokeHead.add(crossBar);

    const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.05, 12), durasteelDark);
    centerHub.rotation.x = Math.PI / 2;
    yokeHead.add(centerHub);

    const hubCap = new THREE.Mesh(new THREE.CircleGeometry(0.024, 12), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    hubCap.position.z = 0.026;
    yokeHead.add(hubCap);

    for (const side of [-1, 1]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.14, 10), durasteelDark);
      grip.position.set(side * 0.13, 0.045, 0);
      grip.rotation.z = side * -0.12;
      yokeHead.add(grip);

      const thumbRest = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.032, 0.045), durasteelTrim);
      thumbRest.position.set(side * 0.125, 0.115, 0.008);
      yokeHead.add(thumbRest);

      const fireButton = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.015, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      fireButton.rotation.x = Math.PI / 2;
      fireButton.position.set(side * 0.12, 0.115, 0.032);
      yokeHead.add(fireButton);
    }

    // =========================================================================
    // 8. EXTERIOR STARFIGHTER NOSE & S-FOIL LASER CANNONS (UNIFIED HERO SHIP AESTHETIC)
    // =========================================================================
    const exteriorGroup = new THREE.Group();
    this.rig.add(exteriorGroup);

    this.heroArmorMat = new THREE.MeshStandardMaterial({
      color: 0xdce8ed,
      metalness: 0.65,
      roughness: 0.28
    });
    this.heroDarkMat = new THREE.MeshStandardMaterial({
      color: 0x10273b,
      metalness: 0.78,
      roughness: 0.26
    });
    this.heroCyanMat = new THREE.MeshBasicMaterial({ color: 0x54f5ee });
    this.heroAmberMat = new THREE.MeshBasicMaterial({ color: 0xffb969 });
    const heroArmorMat = this.heroArmorMat;
    const heroDarkMat = this.heroDarkMat;
    const heroCyanMat = this.heroCyanMat;
    const heroAmberMat = this.heroAmberMat;

    // Sleek arrowhead forward nosecone matching exterior hero craft (low-profile, sloped downward)
    const noseBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 4.2), heroDarkMat);
    noseBase.position.set(0, -0.46, -3.6);
    exteriorGroup.add(noseBase);

    // Tapered forward spine plate in dark titanium
    const noseSpine = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 3.8), heroDarkMat);
    noseSpine.position.set(0, -0.39, -3.5);
    noseSpine.rotation.x = -0.04; // slopes downward away from windshield
    exteriorGroup.add(noseSpine);

    // Glowing cyan energy conduits along the nose
    for (const side of [-1, 1]) {
      const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 3.2), heroCyanMat);
      conduit.position.set(side * 0.20, -0.37, -3.2);
      conduit.rotation.y = side * -0.05;
      conduit.rotation.x = -0.04;
      exteriorGroup.add(conduit);

      const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.20), heroAmberMat);
      sensor.position.set(side * 0.23, -0.35, -2.1);
      exteriorGroup.add(sensor);
    }

    // Outer S-Foil cannons with flash suppressor & muzzle flashes
    this.leftCannons = this.buildSFoilCannonAssembly(-1, heroDarkMat, durasteelTrim, heroArmorMat, heroCyanMat);
    this.rightCannons = this.buildSFoilCannonAssembly(1, heroDarkMat, durasteelTrim, heroArmorMat, heroCyanMat);
    exteriorGroup.add(this.leftCannons, this.rightCannons);

    // =========================================================================
    // 9. COCKPIT INTERIOR & MUZZLE LIGHTING
    // =========================================================================
    this.interiorLight = new THREE.PointLight(0x38bdf8, 0.22, 3.2);
    this.interiorLight.position.set(0, 0.15, -0.75);
    this.rig.add(this.interiorLight);

    this.muzzleLight = new THREE.PointLight(0x54f5ee, 0.0, 8.0);
    this.muzzleLight.position.set(0, 0.0, -2.8);
    this.rig.add(this.muzzleLight);
  }

  buildSFoilCannonAssembly(side, darkMat, trimMat, hullMat, redMat) {
    const assembly = new THREE.Group();
    assembly.position.set(side * 1.65, -0.18, -2.45);

    for (const vSign of [1, -1]) {
      const wingGroup = new THREE.Group();
      wingGroup.rotation.z = side * vSign * 0.22;
      assembly.add(wingGroup);

      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 1.15), hullMat);
      wingBlade.position.set(side * -0.25, vSign * 0.14, 0.35);
      wingGroup.add(wingBlade);

      const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.044, 0.22), redMat);
      wingStripe.position.set(side * -0.22, vSign * 0.14, 0.15);
      wingGroup.add(wingStripe);

      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.45, 10), darkMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 0.12, vSign * 0.22, 0.10);
      wingGroup.add(pod);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.85, 8), trimMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * 0.12, vSign * 0.22, -1.35);
      wingGroup.add(barrel);

      const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.024, 0.28, 8), darkMat);
      suppressor.rotation.x = Math.PI / 2;
      suppressor.position.set(side * 0.12, vSign * 0.22, -2.28);
      wingGroup.add(suppressor);

      const flashMat = new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const flashMesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 8), flashMat);
      flashMesh.rotation.x = -Math.PI / 2;
      flashMesh.position.set(side * 0.12, vSign * 0.22, -2.62);
      wingGroup.add(flashMesh);
      this.muzzleFlashes.push({ mesh: flashMesh, mat: flashMat, side });
    }

    return assembly;
  }

  populateConsoleGreebles(parent, startX, startY, zPos, cols, rows) {
    const palette = [0xef4444, 0xf59e0b, 0x38bdf8, 0x10b981, 0xfef08a, 0xf97316];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const colHex = palette[idx % palette.length];
        const mat = new THREE.MeshBasicMaterial({ color: colHex });
        const btn = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.026, 0.018), mat);
        btn.position.set(startX + c * 0.048, startY - r * 0.038, zPos);
        parent.add(btn);
        this.blinkingButtons.push({
          mesh: btn,
          baseColor: new THREE.Color(colHex),
          speed: 1.5 + (idx % 5) * 0.85,
          phase: idx * 0.9
        });
      }
    }
  }

  initCenterRadarCanvas() {
    this.centerRadarCanvas = document.createElement('canvas');
    this.centerRadarCanvas.width = 512;
    this.centerRadarCanvas.height = 320;
    this.centerRadarCtx = this.centerRadarCanvas.getContext('2d');
    this.centerRadarTexture = new THREE.CanvasTexture(this.centerRadarCanvas);
    this.centerRadarTexture.minFilter = THREE.LinearFilter;
  }

  initLeftMissileCanvas() {
    this.leftMissileCanvas = document.createElement('canvas');
    this.leftMissileCanvas.width = 300;
    this.leftMissileCanvas.height = 200;
    this.leftMissileCtx = this.leftMissileCanvas.getContext('2d');
    this.leftMissileTexture = new THREE.CanvasTexture(this.leftMissileCanvas);
    this.leftMissileTexture.minFilter = THREE.LinearFilter;
  }

  initRightSolarCanvas() {
    this.rightSolarCanvas = document.createElement('canvas');
    this.rightSolarCanvas.width = 300;
    this.rightSolarCanvas.height = 200;
    this.rightSolarCtx = this.rightSolarCanvas.getContext('2d');
    this.rightSolarTexture = new THREE.CanvasTexture(this.rightSolarCanvas);
    this.rightSolarTexture.minFilter = THREE.LinearFilter;
  }

  initUpperRightScannerCanvas() {
    this.upperRightScannerCanvas = document.createElement('canvas');
    this.upperRightScannerCanvas.width = 256;
    this.upperRightScannerCanvas.height = 256;
    this.upperRightScannerCtx = this.upperRightScannerCanvas.getContext('2d');
    this.upperRightScannerTexture = new THREE.CanvasTexture(this.upperRightScannerCanvas);
    this.upperRightScannerTexture.minFilter = THREE.LinearFilter;
  }

  triggerLaserFire() {
    if (this.nextCannonSide > 0) {
      this.recoilRight = 1.0;
      this.recoilLeft = Math.max(this.recoilLeft, 0.45);
    } else {
      this.recoilLeft = 1.0;
      this.recoilRight = Math.max(this.recoilRight, 0.45);
    }
    this.nextCannonSide *= -1;
    this.muzzleFlashTimer = 0.09;
  }

  getMuzzleWorldPositions() {
    if (!this.leftCannons || !this.rightCannons) return null;
    this.group.updateWorldMatrix(true, true);
    const leftWorld = this.leftCannons.localToWorld(new THREE.Vector3(0.12, 0.18, -2.5));
    const rightWorld = this.rightCannons.localToWorld(new THREE.Vector3(-0.12, 0.18, -2.5));
    return { leftWorld, rightWorld };
  }

  setLivery(livery) {
    if (!livery) return;
    if (this.heroArmorMat) this.heroArmorMat.color.setHex(livery.armorHex);
    if (this.heroDarkMat) this.heroDarkMat.color.setHex(livery.darkHex);
    if (this.heroCyanMat) this.heroCyanMat.color.setHex(livery.accentHex);
    if (this.heroAmberMat) this.heroAmberMat.color.setHex(livery.glowHex);
  }

  recordShipDeath(pos, isHostile = true) {
    this.deathMarkers.push({
      pos: pos.clone(),
      isHostile,
      timeRemaining: 2.5,
      maxTime: 2.5
    });
  }

  // 1. CENTER CONSOLE: Forward-Facing Smart Positional Radar
  drawCenterRadar(elapsed, leadShip, ships, aliens, stations = [], lockedTarget = null) {
    const ctx = this.centerRadarCtx;
    if (!ctx) return;
    const w = this.centerRadarCanvas.width;
    const h = this.centerRadarCanvas.height;

    ctx.fillStyle = '#030810';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.52;

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('FORWARD TACTICAL RADAR // SMART POSITIONAL', 14, 22);

    ctx.textAlign = 'right';
    const spd = leadShip?.vel ? Math.round(leadShip.vel.length()) : 220;
    ctx.fillText(`VEL: ${spd} M/S`, w - 14, 22);

    const rangeRings = [42, 84, 126, 154];
    ctx.lineWidth = 1;
    rangeRings.forEach((r, idx) => {
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.15 + idx * 0.06})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.beginPath();
    ctx.moveTo(cx - 165, cy);
    ctx.lineTo(cx + 165, cy);
    ctx.moveTo(cx, cy - 125);
    ctx.lineTo(cx, cy + 125);
    ctx.stroke();

    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(cx - 110, cy - 110);
    ctx.lineTo(cx + 110, cy + 110);
    ctx.moveTo(cx - 110, cy + 110);
    ctx.lineTo(cx + 110, cy - 110);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#54f5ee';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx - 6, cy + 7);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.closePath();
    ctx.fill();

    const invQuat = leadShip.mesh.quaternion.clone().invert();
    const maxRange = 450;
    const radarPixelRadius = 150;

    if (stations && stations.length) {
      stations.forEach(station => {
        const relLocal = station.mesh.position.clone().sub(leadShip.pos).applyQuaternion(invQuat);
        const dist = Math.hypot(relLocal.x, relLocal.z);
        if (dist > 1 && dist < maxRange * 1.8) {
          const clamped = Math.min(dist, maxRange) / maxRange * radarPixelRadius;
          const angle = Math.atan2(relLocal.x, -relLocal.z);
          const px = cx + Math.sin(angle) * clamped;
          const py = cy - Math.cos(angle) * clamped;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(px - 5, py - 5, 10, 10);
        }
      });
    }

    if (ships) {
      ctx.fillStyle = '#22c55e';
      ships.slice(1).forEach(friendly => {
        const relWorld = friendly.pos.clone().sub(leadShip.pos);
        const relLocal = relWorld.applyQuaternion(invQuat);
        const dist = Math.hypot(relLocal.x, relLocal.z);
        if (dist > 1 && dist < maxRange) {
          const screenDist = (dist / maxRange) * radarPixelRadius;
          const angle = Math.atan2(relLocal.x, -relLocal.z);
          const px = cx + Math.sin(angle) * screenDist;
          const py = cy - Math.cos(angle) * screenDist;

          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();

          if (Math.abs(relLocal.y) > 4) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py - THREE.MathUtils.clamp(relLocal.y * 0.4, -14, 14));
            ctx.stroke();
          }
        }
      });
    }

    let autoLockTarget = null;
    let closestDistSq = Infinity;

    if (aliens) {
      aliens.forEach(alien => {
        const relWorld = alien.pos.clone().sub(leadShip.pos);
        const relLocal = relWorld.applyQuaternion(invQuat);
        const dist = Math.hypot(relLocal.x, relLocal.z);

        if (dist > 1 && dist < maxRange) {
          const screenDist = (dist / maxRange) * radarPixelRadius;
          const angle = Math.atan2(relLocal.x, -relLocal.z);
          const px = cx + Math.sin(angle) * screenDist;
          const py = cy - Math.cos(angle) * screenDist;

          if (alien.isBoss) {
            ctx.fillStyle = '#ff2a4f';
            ctx.beginPath();
            ctx.moveTo(px, py - 8);
            ctx.lineTo(px + 8, py);
            ctx.lineTo(px, py + 8);
            ctx.lineTo(px - 8, py);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, alien.isBoss ? 11 : 7.5, 0, Math.PI * 2);
          ctx.stroke();

          if (lockedTarget === alien) {
            autoLockTarget = { px, py, dist, alien };
          } else if (!lockedTarget) {
            const forwardDist = -relLocal.z;
            const lateralDist = Math.hypot(relLocal.x, relLocal.y);
            if (forwardDist > 10 && lateralDist < 50 && lateralDist < closestDistSq) {
              closestDistSq = lateralDist;
              autoLockTarget = { px, py, dist, alien };
            }
          }
        }
      });
    }

    if (autoLockTarget) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      const bSize = 12;
      ctx.strokeRect(autoLockTarget.px - bSize, autoLockTarget.py - bSize, bSize * 2, bSize * 2);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`LOCK: ${Math.round(autoLockTarget.dist)}M`, autoLockTarget.px, autoLockTarget.py + bSize + 11);
    }

    this.deathMarkers.forEach(dm => {
      const relWorld = dm.pos.clone().sub(leadShip.pos);
      const relLocal = relWorld.applyQuaternion(invQuat);
      const dist = Math.hypot(relLocal.x, relLocal.z);

      if (dist < maxRange) {
        const screenDist = (dist / maxRange) * radarPixelRadius;
        const angle = Math.atan2(relLocal.x, -relLocal.z);
        const px = cx + Math.sin(angle) * screenDist;
        const py = cy - Math.cos(angle) * screenDist;

        const alpha = Math.max(0, dm.timeRemaining / dm.maxTime);
        ctx.strokeStyle = dm.isHostile ? `rgba(239, 68, 68, ${alpha})` : `rgba(34, 197, 94, ${alpha})`;
        ctx.lineWidth = 2.5;

        const xs = 7;
        ctx.beginPath();
        ctx.moveTo(px - xs, py - xs);
        ctx.lineTo(px + xs, py + xs);
        ctx.moveTo(px + xs, py - xs);
        ctx.lineTo(px - xs, py + xs);
        ctx.stroke();

        ctx.beginPath();
        const shockR = (1.0 - alpha) * 18 + 6;
        ctx.arc(px, py, shockR, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('● BOGEY (HOSTILE)', 14, h - 14);

    ctx.fillStyle = '#22c55e';
    ctx.fillText('● ALLY (FRIENDLY)', 160, h - 14);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('✖ DESTROYED', 310, h - 14);

    this.centerRadarTexture.needsUpdate = true;
  }

  // 2. LEFT CONSOLE: Hull, Shield, Weapon Heat, Missile Racks & Rotating Dorsal Turret
  drawLeftMissileConsole(elapsed, leadShip, missileVolleyTimer, missileQueueLen, meta = {}) {
    const ctx = this.leftMissileCtx;
    if (!ctx) return;
    const w = this.leftMissileCanvas.width;
    const h = this.leftMissileCanvas.height;

    ctx.fillStyle = '#040b14';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SYSTEMS & ORDNANCE', 12, 20);

    const maxAmmo = meta.maxMissileAmmo || 8;
    const ammo = meta.missileAmmo ?? maxAmmo;
    ctx.textAlign = 'right';
    ctx.fillStyle = ammo > 0 ? '#10b981' : '#ef4444';
    ctx.fillText(`MSL ${ammo}/${maxAmmo}`, w - 12, 20);

    const rechargePct = THREE.MathUtils.clamp(1.0 - (missileVolleyTimer / 4.0), 0.05, 1.0);
    const readyToFire = missileQueueLen > 0 || ammo > 0;

    for (let i = 0; i < 4; i++) {
      const bx = 14 + i * 68;
      const by = 32;
      const isLoaded = ammo > i || rechargePct > (i * 0.25);

      ctx.strokeStyle = isLoaded ? '#10b981' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, 60, 22);

      ctx.fillStyle = isLoaded ? '#10b981' : '#1e293b';
      if (missileQueueLen > 0 && isLoaded) {
        ctx.fillStyle = Math.sin(elapsed * 16.0) > 0 ? '#f59e0b' : '#10b981';
      }
      ctx.fillRect(bx + 2, by + 2, isLoaded ? 56 : Math.round(56 * rechargePct), 18);

      ctx.fillStyle = isLoaded ? '#000000' : '#64748b';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`BAY ${i + 1}`, bx + 30, by + 15);
    }

    // Active Weapon & Heat gauge
    const weaponName = meta.weaponName || 'PLASMA';
    const heat = Math.round(meta.weaponHeat || 0);
    const overheated = Boolean(meta.weaponOverheated);
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = overheated ? '#ef4444' : '#38bdf8';
    ctx.fillText(`WPN: ${weaponName}`, 14, 72);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(130, 62, 154, 11);
    ctx.fillStyle = overheated ? '#ef4444' : (heat > 75 ? '#f59e0b' : '#38bdf8');
    ctx.fillRect(130, 62, Math.round(154 * THREE.MathUtils.clamp(heat / 100, 0, 1)), 11);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(overheated ? 'OVERHEAT' : `HEAT ${heat}%`, 134, 71);

    // Hull & Shield bars
    const hullPct = Math.round(((leadShip?.hull ?? 100) / Math.max(1, leadShip?.maxHull || 100)) * 100);
    const shieldPct = Math.round(((leadShip?.shield ?? 100) / Math.max(1, leadShip?.maxShield || 100)) * 100);

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`HULL ${hullPct}%`, 14, 90);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(82, 82, 62, 9);
    ctx.fillStyle = hullPct < 30 ? '#ef4444' : '#34d399';
    ctx.fillRect(82, 82, Math.round(62 * THREE.MathUtils.clamp(hullPct / 100, 0, 1)), 9);

    ctx.fillStyle = '#54f5ee';
    ctx.fillText(`SHLD ${shieldPct}%`, 154, 90);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(222, 82, 62, 9);
    ctx.fillStyle = shieldPct < 30 ? '#f59e0b' : '#54f5ee';
    ctx.fillRect(222, 82, Math.round(62 * THREE.MathUtils.clamp(shieldPct / 100, 0, 1)), 9);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.beginPath();
    ctx.moveTo(12, 100);
    ctx.lineTo(w - 12, 100);
    ctx.stroke();

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('TOP ROTATING TURRET', 14, 114);

    const tcx = 58;
    const tcy = 156;
    const tr = 26;

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#54f5ee';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▲ FWD', tcx, tcy - tr - 4);

    let turretYaw = 0;
    let isTurretFiring = false;
    if (leadShip?.mesh?.userData?.turret) {
      turretYaw = leadShip.mesh.userData.turret.rotation.y || 0;
      isTurretFiring = (leadShip.shootCooldown <= 0.25);
    }

    ctx.strokeStyle = isTurretFiring ? '#ef4444' : '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tcx, tcy);
    ctx.lineTo(tcx + Math.sin(turretYaw) * 26, tcy - Math.cos(turretYaw) * 26);
    ctx.stroke();

    ctx.fillStyle = '#54f5ee';
    ctx.beginPath();
    ctx.arc(tcx, tcy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = 'bold 10px monospace';
    const deg = Math.round((turretYaw * 180) / Math.PI);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`BEARING: ${deg}°`, 112, 134);

    ctx.fillStyle = meta.manualFlight ? '#38bdf8' : '#10b981';
    ctx.fillText(meta.manualFlight ? 'HELM: MANUAL' : 'HELM: AUTOPILOT', 112, 152);

    ctx.fillStyle = meta.autoFire ? '#f59e0b' : (readyToFire ? '#10b981' : '#94a3b8');
    ctx.fillText(`AUTO-FIRE: ${meta.autoFire ? 'ON' : 'OFF'}`, 112, 170);

    this.leftMissileTexture.needsUpdate = true;
  }

  // 3. RIGHT CONSOLE: Top-Down Local Solar System Positional Radar
  drawRightSolarConsole(elapsed, leadShip, planets, stations = [], navTarget = null) {
    const ctx = this.rightSolarCtx;
    if (!ctx) return;
    const w = this.rightSolarCanvas.width;
    const h = this.rightSolarCanvas.height;

    ctx.fillStyle = '#03080e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SOLAR SYSTEM ORBITAL TACTICAL MAP', 12, 20);

    const scx = w * 0.5;
    const scy = h * 0.56;
    const solarScale = 68 / 5600;

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(scx, scy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(scx, scy, 8, 0, Math.PI * 2);
    ctx.stroke();

    if (planets) {
      planets.forEach(p => {
        const pPos = p.mesh.position;
        const orbitRadius = Math.hypot(pPos.x, pPos.z) * solarScale;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(scx, scy, orbitRadius, 0, Math.PI * 2);
        ctx.stroke();

        const px = scx + pPos.x * solarScale;
        const py = scy + pPos.z * solarScale;

        ctx.fillStyle = p.color ? `#${p.color.toString(16).padStart(6, '0')}` : '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2.6, p.radius * 0.032), 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (stations) {
      stations.forEach(st => {
        const sPos = st.mesh.position;
        const sx = scx + sPos.x * solarScale;
        const sy = scy + sPos.z * solarScale;
        ctx.fillStyle = st.theme === 'refinery' ? '#f59e0b' : (st.theme === 'citadel' ? '#c084fc' : '#38bdf8');
        ctx.fillRect(sx - 2.5, sy - 2.5, 5, 5);
      });
    }

    if (leadShip) {
      const px = scx + leadShip.pos.x * solarScale;
      const py = scy + leadShip.pos.z * solarScale;

      if (navTarget?.mesh?.position) {
        const nx = scx + navTarget.mesh.position.x * solarScale;
        const ny = scy + navTarget.mesh.position.z * solarScale;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const pulse = Math.sin(elapsed * 6.0) * 1.8;
      ctx.fillStyle = '#54f5ee';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 7 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      if (leadShip.vel && leadShip.vel.lengthSq() > 0.1) {
        const heading = leadShip.vel.clone().normalize();
        ctx.strokeStyle = '#54f5ee';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + heading.x * 11, py + heading.z * 11);
        ctx.stroke();
      }

      ctx.fillStyle = '#54f5ee';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HERO', px, py - 10);
    }

    this.rightSolarTexture.needsUpdate = true;
  }

  // 4. UPPER-RIGHT CIRCULAR CRT: Dynamic Nearest Planet / Station Scanner
  drawUpperRightScanner(elapsed, leadShip, planets = [], stations = []) {
    const ctx = this.upperRightScannerCtx;
    if (!ctx) return;
    const w = this.upperRightScannerCanvas.width;
    const h = this.upperRightScannerCanvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    let nearestPlanet = null;
    let nearestPlanetDist = Infinity;
    let nearestStation = null;
    let nearestStationDist = Infinity;

    if (leadShip) {
      for (const p of planets || []) {
        const d = leadShip.pos.distanceTo(p.mesh.position) - p.radius;
        if (d < nearestPlanetDist) {
          nearestPlanetDist = d;
          nearestPlanet = p;
        }
      }
      for (const s of stations || []) {
        const d = leadShip.pos.distanceTo(s.mesh.position);
        if (d < nearestStationDist) {
          nearestStationDist = d;
          nearestStation = s;
        }
      }
    }

    const showStation = Boolean(nearestStation && nearestStationDist < Math.min(750, nearestPlanetDist + 160));
    const accentHex = showStation
      ? (nearestStation.theme === 'refinery' ? '#f59e0b' : (nearestStation.theme === 'citadel' ? '#c084fc' : '#38bdf8'))
      : (nearestPlanet?.color ? `#${nearestPlanet.color.toString(16).padStart(6, '0')}` : '#10b981');

    ctx.fillStyle = '#02120e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 122, 0, Math.PI * 2);
    ctx.stroke();

    const rings = [35, 68, 98];
    rings.forEach((r, idx) => {
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.18 + idx * 0.08})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 120, cy);
    ctx.lineTo(cx + 120, cy);
    ctx.moveTo(cx, cy - 120);
    ctx.lineTo(cx, cy + 120);
    ctx.stroke();

    if (showStation) {
      // Rotating wireframe space station schematic
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(elapsed * 0.45);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(-14, -46, 28, 92);
      ctx.strokeRect(-46, -10, 92, 20);
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      const planetR = 50;
      const cList = nearestPlanet?.colors || ['#064e3b', '#10b981', '#34d399', '#059669'];
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
      ctx.clip();

      const grad = ctx.createLinearGradient(cx - planetR, cy - planetR, cx + planetR, cy + planetR);
      grad.addColorStop(0, cList[0] || '#064e3b');
      grad.addColorStop(0.38, cList[1] || '#10b981');
      grad.addColorStop(0.7, cList[2] || '#34d399');
      grad.addColorStop(1, cList[3] || '#022c22');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);

      const scroll = (elapsed * 12) % 32;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      for (let y = -planetR - 32; y < planetR + 32; y += 14) {
        ctx.fillRect(cx - planetR, cy + y + scroll, planetR * 2, 4);
      }

      const shadowGrad = ctx.createRadialGradient(cx - 16, cy - 16, 8, cx, cy, planetR);
      shadowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.0)');
      shadowGrad.addColorStop(1, 'rgba(0, 8, 12, 0.82)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);
      ctx.restore();

      if (nearestPlanet?.rings) {
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 74, 18, -0.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
      ctx.stroke();
    }

    const sweepAngle = (elapsed * 2.2) % (Math.PI * 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sweepAngle);
    const sweepGrad = ctx.createLinearGradient(0, 0, 115, 0);
    sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
    sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.05)');
    ctx.strokeStyle = sweepGrad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(115, 0);
    ctx.stroke();
    ctx.restore();

    const headerText = showStation
      ? `STATION // ${nearestStation.name.toUpperCase().slice(0, 18)}`
      : `PLANET // ${(nearestPlanet?.name || 'SYSTEM').toUpperCase()}`;
    const distVal = showStation ? Math.max(0, Math.round(nearestStationDist)) : Math.max(0, Math.round(nearestPlanetDist));
    const readyFlag = showStation
      ? (nearestStationDist < 420 ? 'DOCK READY [L]' : `DIST: ${distVal} M`)
      : (nearestPlanetDist < 360 ? 'LAND READY [L]' : `DIST: ${distVal} M`);

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 10.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(headerText, cx, 26);
    ctx.font = 'bold 9.5px monospace';
    ctx.fillText(readyFlag, cx, h - 16);

    this.upperRightScannerTexture.needsUpdate = true;
  }

  update(dt, elapsed, leadShip, ships, aliens, keys = {}, touch = {}, missileVolleyTimer = 2.5, missileQueueLen = 0, planets = null, cameraDirector = null, cockpitMeta = {}) {
    if (!this.group.visible || !leadShip) return;

    if (aliens) {
      const currentAlienIds = new Set(aliens.map(a => a.id));
      for (const [id, lastPos] of this.knownAliens) {
        if (!currentAlienIds.has(id)) {
          this.recordShipDeath(lastPos, true);
        }
      }
      this.knownAliens.clear();
      aliens.forEach(a => this.knownAliens.set(a.id, a.pos.clone()));
    }

    if (ships) {
      const currentShipIds = new Set(ships.slice(1).map(s => s.id));
      for (const [id, lastPos] of this.knownFriendlies) {
        if (!currentShipIds.has(id)) {
          this.recordShipDeath(lastPos, false);
        }
      }
      this.knownFriendlies.clear();
      ships.slice(1).forEach(s => this.knownFriendlies.set(s.id, s.pos.clone()));
    }

    this.deathMarkers.forEach(dm => {
      dm.timeRemaining -= dt;
    });
    this.deathMarkers = this.deathMarkers.filter(dm => dm.timeRemaining > 0);

    const curQuat = leadShip.mesh.quaternion;
    if (!this.prevQuatInitialized) {
      this.prevQuat.copy(curQuat);
      this.prevQuatInitialized = true;
    }

    const invPrev = this.prevQuat.clone().invert();
    const deltaQuat = invPrev.multiply(curQuat);
    const deltaEuler = new THREE.Euler().setFromQuaternion(deltaQuat, 'YXZ');
    this.prevQuat.copy(curQuat);

    const safeDt = Math.max(dt, 0.001);
    let rawYawRate = THREE.MathUtils.clamp(deltaEuler.y / safeDt, -4.0, 4.0);
    let rawPitchRate = THREE.MathUtils.clamp(deltaEuler.x / safeDt, -4.0, 4.0);
    let rawRollRate = THREE.MathUtils.clamp(deltaEuler.z / safeDt, -5.0, 5.0);

    if (keys['a'] || keys['arrowleft']) rawYawRate += 1.8;
    if (keys['d'] || keys['arrowright']) rawYawRate -= 1.8;
    if (keys['w'] || keys['arrowup']) rawPitchRate += 1.6;
    if (keys['s'] || keys['arrowdown']) rawPitchRate -= 1.6;
    if (Math.hypot(touch.stickX || 0, touch.stickY || 0) > 0.1) {
      rawYawRate -= (touch.stickX || 0) * 1.8;
      rawPitchRate -= (touch.stickY || 0) * 1.6;
    }

    const smoothFactor = 1.0 - Math.exp(-10.0 * dt);
    this.smoothYawRate += (rawYawRate - this.smoothYawRate) * smoothFactor;
    this.smoothPitchRate += (rawPitchRate - this.smoothPitchRate) * smoothFactor;
    this.smoothRollRate += (rawRollRate - this.smoothRollRate) * smoothFactor;

    const hitShake = (leadShip.shieldHitFlash || 0) * 0.022;
    const engineVib = leadShip.boostActive ? 0.0025 : 0.0008;
    const shakeX = (Math.sin(elapsed * 47.0) * engineVib) + (Math.random() - 0.5) * hitShake;
    const shakeY = (Math.cos(elapsed * 53.0) * engineVib) + (Math.random() - 0.5) * hitShake;

    const camOff = cameraDirector?.cockpitCamOffset || { x: 0, y: 0, z: 0 };

    this.rig.position.set(
      -camOff.x + THREE.MathUtils.clamp(this.smoothYawRate * 0.014, -0.04, 0.04) + shakeX,
      -camOff.y + THREE.MathUtils.clamp(-this.smoothPitchRate * 0.012, -0.035, 0.035) + shakeY,
      -camOff.z + (this.recoilLeft + this.recoilRight) * 0.008
    );

    const lookYaw = cameraDirector ? cameraDirector.cockpitLookYaw : 0;
    const lookPitch = cameraDirector ? cameraDirector.cockpitLookPitch : 0;
    const lookRoll = cameraDirector ? (cameraDirector.cockpitLookRoll || 0) : 0;

    this.rig.rotation.set(
      -lookPitch + THREE.MathUtils.clamp(this.smoothPitchRate * 0.02, -0.05, 0.05),
      -lookYaw + THREE.MathUtils.clamp(this.smoothYawRate * 0.02, -0.05, 0.05),
      -lookRoll + THREE.MathUtils.clamp(-this.smoothYawRate * 0.035 + this.smoothRollRate * 0.02, -0.08, 0.08)
    );

    if (this.yokePivot) {
      const targetYokeRoll = THREE.MathUtils.clamp(this.smoothYawRate * 0.22 - this.smoothRollRate * 0.15, -0.48, 0.48);
      const targetYokePitch = THREE.MathUtils.clamp(-this.smoothPitchRate * 0.18, -0.32, 0.32);
      this.yokePivot.rotation.z = targetYokeRoll;
      this.yokePivot.rotation.x = targetYokePitch;
    }

    if (this.throttleHandle) {
      const speedRatio = leadShip.vel ? THREE.MathUtils.clamp(leadShip.vel.length() / (leadShip.maxSpeed || 220), 0.25, 1.4) : 0.8;
      const targetZ = -0.46 - (speedRatio - 0.3) * 0.22;
      this.throttleHandle.position.z += (targetZ - this.throttleHandle.position.z) * Math.min(1, dt * 8);
    }

    this.recoilLeft = Math.max(0, this.recoilLeft - dt * 6.5);
    this.recoilRight = Math.max(0, this.recoilRight - dt * 6.5);
    if (this.leftCannons) {
      this.leftCannons.position.z = -2.45 + this.recoilLeft * 0.22;
    }
    if (this.rightCannons) {
      this.rightCannons.position.z = -2.45 + this.recoilRight * 0.22;
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
      const flashAlpha = this.muzzleFlashTimer / 0.09;
      this.muzzleFlashes.forEach(f => {
        f.mat.opacity = flashAlpha * 0.9;
        f.mesh.scale.setScalar(0.8 + flashAlpha * 0.5);
      });
      if (this.muzzleLight) this.muzzleLight.intensity = flashAlpha * 2.5;
    } else {
      this.muzzleFlashes.forEach(f => { f.mat.opacity = 0; });
      if (this.muzzleLight) this.muzzleLight.intensity = 0;
    }

    const shieldRatio = (leadShip.shield ?? 100) / Math.max(1, leadShip.maxShield || 100);
    const shieldAlert = (leadShip.shieldHitFlash || 0) > 0.1 || shieldRatio < 0.35;
    if (this.interiorLight) {
      if (shieldAlert) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 18.0);
        this.interiorLight.color.setHex(0xef4444);
        this.interiorLight.intensity = 0.85 + pulse * 0.8;
      } else {
        this.interiorLight.color.setHex(0x38bdf8);
        this.interiorLight.intensity = 0.22;
      }
    }

    for (const lamp of this.alarmLights) {
      if (shieldAlert) {
        const on = Math.sin(elapsed * 20.0) > 0;
        lamp.material.color.setHex(on ? 0xff2a2a : 0x450a0a);
      } else {
        lamp.material.color.setHex(0x7f1d1d);
      }
    }

    for (const b of this.blinkingButtons) {
      const wave = 0.55 + 0.45 * Math.sin(elapsed * b.speed + b.phase);
      b.mesh.material.color.copy(b.baseColor).multiplyScalar(wave > 0.35 ? 1.0 : 0.28);
    }

    this.canvasUpdateTimer += dt;
    if (this.canvasUpdateTimer >= 0.033) {
      this.canvasUpdateTimer = 0;
      this.drawCenterRadar(elapsed, leadShip, ships, aliens, cockpitMeta.stations, cockpitMeta.lockedTarget);
      this.drawLeftMissileConsole(elapsed, leadShip, missileVolleyTimer, missileQueueLen, cockpitMeta);
      this.drawRightSolarConsole(elapsed, leadShip, planets, cockpitMeta.stations, cockpitMeta.navTarget);
      this.drawUpperRightScanner(elapsed, leadShip, planets, cockpitMeta.stations);
    }
  }

  destroy() {
    if (this.group && this.camera) {
      this.camera.remove(this.group);
    }
    this.centerRadarTexture?.dispose();
    this.leftMissileTexture?.dispose();
    this.rightSolarTexture?.dispose();
    this.upperRightScannerTexture?.dispose();
  }
}
