(() => {
  const THREE = window.THREE;
  if (!THREE) return;

  // Three.js uses +Z for the driver's front. Overtake's camera looks down -Z.
  function meshData(geometry) {
    const mesh = geometry.index ? geometry.toNonIndexed() : geometry;
    const vertices = mesh.getAttribute("position").array;
    const normals = mesh.getAttribute("normal").array;
    const positions = Array.from(vertices, (value, i) => i % 3 === 2 ? -value : value);
    const directions = Array.from(normals, (value, i) => i % 3 === 2 ? -value : value);
    if (mesh !== geometry) mesh.dispose();
    return { positions, normals: directions };
  }

  function carPart(outline, width, bevel) {
    const shape = new THREE.Shape();
    outline.forEach(([z, y], i) => i ? shape.lineTo(z, y) : shape.moveTo(z, y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: width, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1,
    });
    geometry.translate(0, 0, -width / 2);
    geometry.rotateY(-Math.PI / 2);
    const data = meshData(geometry);
    geometry.dispose();
    return data;
  }

  // Side profiles run from rear to nose in Three.js coordinates.
  const profiles = {
    starter: { width: 285, body: [[-249, 51], [-257, 116], [-173, 135], [170, 126], [286, 105], [290, 54]], cabin: [[-172, 126], [-115, 200], [55, 200], [133, 125]], wing: 0 },
    street: { width: 300, body: [[-252, 46], [-264, 104], [-188, 140], [72, 122], [287, 83], [297, 49]], cabin: [[-151, 127], [-85, 181], [28, 176], [117, 117]], wing: 0 },
    gt: { width: 323, body: [[-260, 42], [-270, 117], [-212, 134], [123, 126], [282, 92], [302, 52]], cabin: [[-182, 114], [-113, 192], [13, 192], [103, 123]], wing: 175 },
    prototype: { width: 316, body: [[-261, 36], [-269, 105], [-155, 116], [120, 97], [326, 64], [320, 37]], cabin: [[-136, 97], [-65, 158], [40, 149], [122, 91]], wing: 220 },
    apex: { width: 335, body: [[-269, 40], [-262, 112], [-175, 141], [92, 126], [285, 88], [316, 43]], cabin: [[-186, 126], [-87, 190], [22, 178], [126, 114]], wing: 147 },
    hyper: { width: 346, body: [[-281, 37], [-274, 108], [-202, 140], [-68, 126], [113, 97], [346, 67], [310, 37]], cabin: [[-139, 112], [-78, 172], [34, 153], [140, 94]], wing: 245 },
  };
  const cars = new Map();
  function car(id) {
    if (!cars.has(id)) {
      const profile = profiles[id] ?? profiles.starter;
      cars.set(id, {
        body: carPart(profile.body, profile.width, 13),
        cabin: carPart(profile.cabin, profile.width * (id === "prototype" || id === "hyper" ? 0.50 : 0.66), 9),
        width: profile.width,
        wing: profile.wing,
      });
    }
    return cars.get(id);
  }

  function buildDriver(id) {
    return window.GGG_GRAVEGAIN_FIGHTERS[id].build(THREE);
  }

  function disposeModel(root) {
    const geometries = new Set();
    const materials = new Set();
    root.traverse((object) => {
      if (!object.isMesh) return;
      geometries.add(object.geometry);
      for (const material of [object.material].flat()) materials.add(material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  function driver(id) {
    const root = buildDriver(id);
    root.updateMatrixWorld(true);
    const groups = new Map();
    root.traverseVisible((object) => {
      if (!object.isMesh || Array.isArray(object.material)) return;
      const color = "#" + object.material.color.getHexString();
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      const data = meshData(geometry);
      geometry.dispose();
      const group = groups.get(color) ?? { color, positions: [], normals: [] };
      for (const value of data.positions) group.positions.push(value);
      for (const value of data.normals) group.normals.push(value);
      groups.set(color, group);
    });
    disposeModel(root);
    return [...groups.values()];
  }

  function preview(canvas, buildModel, distance, elevation) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return undefined;
    }
    renderer.setSize(canvas.width, canvas.height, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const model = buildModel();
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3()).length();
    const camera = new THREE.PerspectiveCamera(34, canvas.width / canvas.height, size * 0.01, size * 10);
    camera.position.copy(center).add(new THREE.Vector3(size * distance * 0.4, size * elevation, size * distance));
    camera.lookAt(center);
    const key = new THREE.DirectionalLight(0xffebda, 2.2);
    key.position.set(3, 6, 4);
    scene.add(new THREE.HemisphereLight(0xe7f1ff, 0x61507a, 1.5), key, model);
    renderer.render(scene, camera);
    return () => {
      disposeModel(model);
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }

  function previewDriver(canvas, id) {
    return preview(canvas, () => buildDriver(id), 1.56, 0.16);
  }

  function previewCar(canvas, id, color) {
    return preview(canvas, () => {
      const { body, cabin, width, wing } = car(id);
      const model = new THREE.Group();
      for (const [data, paint] of [[body, color], [cabin, "#203f64"]]) {
        const geometry = new THREE.BufferGeometry();
        const unmirror = (values) => values.map((value, i) => i % 3 === 2 ? -value : value);
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(unmirror(data.positions), 3));
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(unmirror(data.normals), 3));
        model.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: paint, roughness: 0.36 })));
      }
      const rubber = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.82 });
      const tire = new THREE.CylinderGeometry(58, 58, 46, 12);
      for (const side of [-1, 1]) {
        for (const axle of [-165, 165]) {
          const wheel = new THREE.Mesh(tire, rubber);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(side * (width / 2 + 26), 58, axle);
          model.add(wheel);
        }
      }
      if (wing) {
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(width * 1.16, 22, 75), rubber);
        spoiler.position.set(0, wing, -225);
        model.add(spoiler);
        for (const side of [-1, 1]) {
          const strut = new THREE.Mesh(new THREE.BoxGeometry(24, wing - 112, 34), rubber);
          strut.position.set(side * 95, (wing + 112) / 2, -225);
          model.add(strut);
        }
      }
      return model;
    }, 1.45, 0.56);
  }

  window.OVERTAKE_MODELS = { car, driver, previewDriver, previewCar };
})();
