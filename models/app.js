(function () {
  'use strict';

  const catalog = window.GGG_MODEL_CATALOG || [];
  const gridEl = document.getElementById('model-grid');
  const countEl = document.getElementById('model-count');
  const searchEl = document.getElementById('model-search');
  const gameFilterEl = document.getElementById('game-filter');
  const pillsEl = document.getElementById('category-pills');

  // Modal elements
  const modalEl = document.getElementById('inspector-modal');
  const modalTitleEl = document.getElementById('modal-title');
  const modalMetaEl = document.getElementById('modal-meta');
  const modalViewportEl = document.getElementById('modal-viewport');
  const modalCodeEl = document.getElementById('modal-code');
  const modalCopyBtn = document.getElementById('modal-copy-btn');
  const modalCloseBtn = document.getElementById('modal-close');
  const toggleRotateBtn = document.getElementById('toggle-rotate');
  const toggleWireframeBtn = document.getElementById('toggle-wireframe');
  const resetCameraBtn = document.getElementById('reset-camera');
  const animSelectEl = document.getElementById('anim-select');
  const toggleAnimPlayBtn = document.getElementById('toggle-anim-play');
  const cycleAnimSpeedBtn = document.getElementById('cycle-anim-speed');
  let activeAnimName = 'idle';
  let animPlaying = true;
  let animSpeed = 1;
  let animTime = 0;
  let lastModalTime = 0;
  let modalRawGroup = null;

  let activeCategory = 'All';
  let activeGame = 'all';
  let searchQuery = '';
  let hoveredCardId = null;

  // Shared offscreen WebGLRenderer for card thumbnails
  const thumbWidth = 360;
  const thumbHeight = 248;
  const thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  thumbRenderer.setSize(thumbWidth, thumbHeight);
  thumbRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (THREE.ACESFilmicToneMapping) {
    thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    thumbRenderer.toneMappingExposure = 1.08;
  }

  const thumbScene = new THREE.Scene();
  const thumbCamera = new THREE.PerspectiveCamera(42, thumbWidth / thumbHeight, 0.1, 100);
  thumbCamera.position.set(2.4, 1.8, 3.2);
  thumbCamera.lookAt(0, 0, 0);

  function addStudioLights(scene) {
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.72));
    const key = new THREE.DirectionalLight(0xfff7ed, 1.2);
    key.position.set(4.5, 6.5, 5.0);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rim.position.set(-4.5, 2.5, -4.0);
    const back = new THREE.DirectionalLight(0xa855f7, 0.4);
    back.position.set(0, -3.0, -5.0);
    scene.add(key, rim, back);
  }
  addStudioLights(thumbScene);

  const thumbHolder = new THREE.Group();
  thumbScene.add(thumbHolder);

  // Cache built normalized models for cards
  const cardEntries = new Map();

  function countMeshes(obj) {
    let n = 0;
    obj.traverse(c => { if (c.isMesh) n++; });
    return n;
  }

  function normalizeModel(rawGroup) {
    const wrapper = new THREE.Group();
    wrapper.add(rawGroup);
    const box = new THREE.Box3().setFromObject(rawGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 1.9 / maxDim;
    rawGroup.scale.multiplyScalar(scale);
    rawGroup.position.sub(center.multiplyScalar(scale));
    return wrapper;
  }

  function renderCardThumbnail(entry, angle) {
    while (thumbHolder.children.length > 0) {
      thumbHolder.remove(thumbHolder.children[thumbHolder.children.length - 1]);
    }
    entry.group.rotation.y = angle;
    thumbHolder.add(entry.group);
    thumbRenderer.render(thumbScene, thumbCamera);

    const ctx = entry.canvas.getContext('2d');
    ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
    ctx.drawImage(thumbRenderer.domElement, 0, 0, entry.canvas.width, entry.canvas.height);
  }

  function formatStandaloneCode(model) {
    if (model.fighterId) {
      return [
        `// ${model.name} (${model.game})`,
        '// Load /games/_shared/gravegain-kit.js and /games/_shared/gravegain-races.js first.',
        `const mesh = window.GGG_GRAVEGAIN_FIGHTERS[${JSON.stringify(model.fighterId)}].build(THREE);`,
        'scene.add(mesh);',
        "// In your animation loop: mesh.userData.animate(timeSeconds, 'idle');"
      ].join('\n');
    }
    const fnStr = model.build.toString();
    const usesKit = fnStr.includes('K.');
    const deps = usesKit ? '// Requires: /games/_shared/gravegain-kit.js (window.GGG_GRAVEGAIN_KIT)\n' : '';
    const sample = cardEntries.has(model.id) ? cardEntries.get(model.id).rawGroup : null;
    const anims = sample && sample.userData && sample.userData.animations;
    const animHint = Array.isArray(anims) && anims.length
      ? `// Animations (${anims.length}): ${anims.join(', ')}\n// Animate in loop: mesh.userData.animate(timeSeconds, '${anims[0]}');\n`
      : '';
    return `// ${model.name} (${model.game})\n${deps}${animHint}// Usage: const mesh = ${model.build.name || 'createModel'}(THREE); scene.add(mesh);\n${fnStr}`;
  }

  async function copyCode(text, btn) {
    const label = btn.querySelector('.btn-label') || btn;
    const orig = label.textContent;
    try {
      await navigator.clipboard.writeText(text);
      label.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        label.textContent = orig;
        btn.classList.remove('copied');
      }, 1500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  // Populate filters
  const games = Array.from(new Set(catalog.map(m => m.game))).sort();
  games.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    gameFilterEl.appendChild(opt);
  });

  const categories = ['All', ...Array.from(new Set(catalog.map(m => m.category)))];
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill' + (cat === 'All' ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      pillsEl.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === btn));
      renderGrid();
    });
    pillsEl.appendChild(btn);
  });

  function getFilteredModels() {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter(m => {
      if (activeCategory !== 'All' && m.category !== activeCategory) return false;
      if (activeGame !== 'all' && m.game !== activeGame) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.game.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(q)))
      );
    });
  }

  function renderGrid() {
    const items = getFilteredModels();
    countEl.textContent = `${items.length} of ${catalog.length} models`;
    gridEl.innerHTML = '';
    cardEntries.clear();

    if (items.length === 0) {
      gridEl.innerHTML = '<div class="empty-state">No 3D models match your filter.</div>';
      return;
    }

    items.forEach(model => {
      const card = document.createElement('article');
      card.className = 'model-card';

      const previewBox = document.createElement('button');
      previewBox.type = 'button';
      previewBox.className = 'preview-box';
      previewBox.setAttribute('aria-label', `Inspect ${model.name} in 3D`);
      const canvas = document.createElement('canvas');
      canvas.className = 'preview-canvas';
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const badge = document.createElement('span');
      badge.className = 'preview-badge';
      badge.textContent = model.category;
      previewBox.append(canvas, badge);
      previewBox.addEventListener('click', () => openInspector(model));

      card.addEventListener('mouseenter', () => { hoveredCardId = model.id; });
      card.addEventListener('mouseleave', () => { if (hoveredCardId === model.id) hoveredCardId = null; });

      const body = document.createElement('div');
      body.className = 'card-body';
      body.innerHTML = `
        <div class="card-title-row">
          <h2 class="card-title">${model.name}</h2>
          <span class="card-game">${model.game}</span>
        </div>
        <p class="card-desc">${model.description}</p>
      `;

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const inspectBtn = document.createElement('button');
      inspectBtn.type = 'button';
      inspectBtn.className = 'btn';
      inspectBtn.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-eye"></use></svg>Inspect 3D';
      inspectBtn.addEventListener('click', () => openInspector(model));

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-primary';
      copyBtn.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-code"></use></svg><span class="btn-label">Copy code</span>';
      copyBtn.addEventListener('click', () => copyCode(formatStandaloneCode(model), copyBtn));

      actions.append(inspectBtn, copyBtn);
      body.appendChild(actions);
      card.append(previewBox, body);
      gridEl.appendChild(card);

      const rawGroup = model.build(THREE);
      const anims = rawGroup.userData && rawGroup.userData.animations;
      if (Array.isArray(anims) && anims.length > 0) {
        const animBadge = document.createElement('span');
        animBadge.className = 'preview-anim-badge';
        animBadge.textContent = `${anims.length} anims`;
        previewBox.appendChild(animBadge);
      }

      const entry = {
        model,
        canvas,
        rawGroup,
        group: normalizeModel(rawGroup),
        angle: 0.45,
        animTime: 0,
        defaultAnim: Array.isArray(anims) && anims.length ? anims[0] : null
      };
      cardEntries.set(model.id, entry);
      renderCardThumbnail(entry, entry.angle);
    });
  }

  // Animate hovered card
  function animateCards() {
    requestAnimationFrame(animateCards);
    if (hoveredCardId && cardEntries.has(hoveredCardId)) {
      const entry = cardEntries.get(hoveredCardId);
      entry.angle += 0.025;
      if (entry.defaultAnim && entry.rawGroup && entry.rawGroup.userData && typeof entry.rawGroup.userData.animate === 'function') {
        entry.animTime += 0.016;
        entry.rawGroup.userData.animate(entry.animTime, entry.defaultAnim);
      }
      renderCardThumbnail(entry, entry.angle);
    }
  }
  animateCards();

  searchEl.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderGrid();
  });
  gameFilterEl.addEventListener('change', e => {
    activeGame = e.target.value;
    renderGrid();
  });

  // ========================
  // INSPECTOR MODAL
  // ========================
  let modalRenderer = null;
  let modalScene = null;
  let modalCamera = null;
  let modalModelGroup = null;
  let modalAnimId = null;
  let autoRotate = true;
  let wireframe = false;
  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };
  let orbit = { theta: 0.6, phi: 1.15, radius: 3.4 };

  function updateModalCamera() {
    if (!modalCamera) return;
    modalCamera.position.x = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    modalCamera.position.y = orbit.radius * Math.cos(orbit.phi);
    modalCamera.position.z = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    modalCamera.lookAt(0, 0, 0);
  }

  function openInspector(model) {
    modalTitleEl.textContent = model.name;
    modalMetaEl.textContent = `${model.game}, ${model.category}`;
    const codeStr = formatStandaloneCode(model);
    modalCodeEl.textContent = codeStr;
    modalCopyBtn.onclick = () => copyCode(codeStr, modalCopyBtn);

    modalEl.classList.add('open');

    if (!modalRenderer) {
      modalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if (THREE.ACESFilmicToneMapping) {
        modalRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        modalRenderer.toneMappingExposure = 1.08;
      }
      modalViewportEl.insertBefore(modalRenderer.domElement, modalViewportEl.firstChild);

      modalScene = new THREE.Scene();
      modalCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      addStudioLights(modalScene);

      const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65, metalness: 0.35 });
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, 0.04, 32), pedestalMat);
      pedestal.position.y = -1.02;
      pedestal.userData.isPedestal = true;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.12, 1.18, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.995;
      ring.userData.isPedestal = true;
      modalScene.add(pedestal, ring);

      modalViewportEl.addEventListener('pointerdown', e => {
        if (e.target.closest('.viewport-toolbar')) return;
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
      });
      window.addEventListener('pointermove', e => {
        if (!isDragging) return;
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        prevMouse = { x: e.clientX, y: e.clientY };
        orbit.theta -= dx * 0.01;
        orbit.phi = Math.max(0.2, Math.min(Math.PI - 0.2, orbit.phi - dy * 0.01));
        updateModalCamera();
      });
      window.addEventListener('pointerup', () => { isDragging = false; });
      modalViewportEl.addEventListener('wheel', e => {
        e.preventDefault();
        orbit.radius = Math.max(1.5, Math.min(8, orbit.radius + e.deltaY * 0.003));
        updateModalCamera();
      }, { passive: false });
    }

    if (modalModelGroup) {
      modalScene.remove(modalModelGroup);
    }
    modalRawGroup = model.build(THREE);
    modalModelGroup = normalizeModel(modalRawGroup);
    setWireframe(modalModelGroup, wireframe);
    modalScene.add(modalModelGroup);

    const meshCount = countMeshes(modalRawGroup);
    const anims = modalRawGroup.userData && modalRawGroup.userData.animations;
    const hasAnims = Array.isArray(anims) && anims.length > 0 && typeof modalRawGroup.userData.animate === 'function';
    modalMetaEl.textContent = `${model.game}, ${model.category}, ${meshCount} meshes${hasAnims ? `, ${anims.length} animations` : ''}`;

    animTime = 0;
    lastModalTime = performance.now();
    if (animSelectEl) {
      if (hasAnims) {
        animSelectEl.innerHTML = anims.map(a => `<option value="${a}">${a}</option>`).join('');
        activeAnimName = anims[0];
        animSelectEl.value = activeAnimName;
        animSelectEl.style.display = 'inline-block';
        animSelectEl.onchange = () => { activeAnimName = animSelectEl.value; animTime = 0; };
        if (toggleAnimPlayBtn) toggleAnimPlayBtn.style.display = 'inline-block';
        if (cycleAnimSpeedBtn) cycleAnimSpeedBtn.style.display = 'inline-block';
      } else {
        animSelectEl.style.display = 'none';
        if (toggleAnimPlayBtn) toggleAnimPlayBtn.style.display = 'none';
        if (cycleAnimSpeedBtn) cycleAnimSpeedBtn.style.display = 'none';
      }
    }

    const rect = modalViewportEl.getBoundingClientRect();
    modalRenderer.setSize(rect.width || 480, rect.height || 400);
    modalCamera.aspect = (rect.width || 480) / (rect.height || 400);
    modalCamera.updateProjectionMatrix();
    orbit = { theta: 0.6, phi: 1.15, radius: 3.4 };
    updateModalCamera();

    if (!modalAnimId) {
      const loop = (now) => {
        modalAnimId = requestAnimationFrame(loop);
        const cur = now || performance.now();
        const dt = Math.min(0.05, Math.max(0, (cur - lastModalTime) * 0.001));
        lastModalTime = cur;
        if (animPlaying) animTime += dt * animSpeed;
        if (modalRawGroup && modalRawGroup.userData && typeof modalRawGroup.userData.animate === 'function') {
          modalRawGroup.userData.animate(animTime, activeAnimName);
        }
        if (autoRotate && !isDragging && modalModelGroup) {
          orbit.theta += 0.01;
          updateModalCamera();
        }
        modalRenderer.render(modalScene, modalCamera);
      };
      loop();
    }
  }

  function setWireframe(obj, enabled) {
    obj.traverse(child => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { m.wireframe = enabled; });
        } else {
          child.material.wireframe = enabled;
        }
      }
    });
  }

  function closeInspector() {
    modalEl.classList.remove('open');
    if (modalAnimId) {
      cancelAnimationFrame(modalAnimId);
      modalAnimId = null;
    }
  }

  modalCloseBtn.addEventListener('click', closeInspector);
  modalEl.addEventListener('click', e => {
    if (e.target === modalEl) closeInspector();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalEl.classList.contains('open')) closeInspector();
  });

  toggleRotateBtn.addEventListener('click', () => {
    autoRotate = !autoRotate;
    toggleRotateBtn.classList.toggle('active', autoRotate);
    toggleRotateBtn.setAttribute('aria-pressed', String(autoRotate));
  });

  toggleWireframeBtn.addEventListener('click', () => {
    wireframe = !wireframe;
    toggleWireframeBtn.classList.toggle('active', wireframe);
    toggleWireframeBtn.setAttribute('aria-pressed', String(wireframe));
    if (modalModelGroup) setWireframe(modalModelGroup, wireframe);
  });

  resetCameraBtn.addEventListener('click', () => {
    orbit = { theta: 0.6, phi: 1.15, radius: 3.4 };
    updateModalCamera();
  });

  if (toggleAnimPlayBtn) {
    toggleAnimPlayBtn.addEventListener('click', () => {
      animPlaying = !animPlaying;
      toggleAnimPlayBtn.classList.toggle('active', animPlaying);
      toggleAnimPlayBtn.setAttribute('aria-pressed', String(animPlaying));
      toggleAnimPlayBtn.textContent = animPlaying ? 'Pause animation' : 'Play animation';
    });
  }

  if (cycleAnimSpeedBtn) {
    const speeds = [1, 1.5, 0.5];
    cycleAnimSpeedBtn.addEventListener('click', () => {
      const idx = (speeds.indexOf(animSpeed) + 1) % speeds.length;
      animSpeed = speeds[idx];
      cycleAnimSpeedBtn.textContent = `${animSpeed}x`;
    });
  }

  renderGrid();
})();
