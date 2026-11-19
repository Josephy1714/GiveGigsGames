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

  const thumbScene = new THREE.Scene();
  const thumbCamera = new THREE.PerspectiveCamera(42, thumbWidth / thumbHeight, 0.1, 100);
  thumbCamera.position.set(2.4, 1.8, 3.2);
  thumbCamera.lookAt(0, 0, 0);

  const thumbAmbient = new THREE.AmbientLight(0xffffff, 0.75);
  const thumbDir = new THREE.DirectionalLight(0xffffff, 1.1);
  thumbDir.position.set(4, 6, 5);
  const thumbRim = new THREE.DirectionalLight(0x38bdf8, 0.45);
  thumbRim.position.set(-4, -2, -4);
  thumbScene.add(thumbAmbient, thumbDir, thumbRim);

  // Cache built normalized models for cards
  const cardEntries = new Map();

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
    while (thumbScene.children.length > 3) {
      thumbScene.remove(thumbScene.children[thumbScene.children.length - 1]);
    }
    entry.group.rotation.y = angle;
    thumbScene.add(entry.group);
    thumbRenderer.render(thumbScene, thumbCamera);

    const ctx = entry.canvas.getContext('2d');
    ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
    ctx.drawImage(thumbRenderer.domElement, 0, 0, entry.canvas.width, entry.canvas.height);
  }

  function formatStandaloneCode(model) {
    return `// ${model.name} (${model.game})\n// Usage: const mesh = ${model.build.name || 'createModel'}(THREE); scene.add(mesh);\n${model.build.toString()}`;
  }

  async function copyCode(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
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

      const previewBox = document.createElement('div');
      previewBox.className = 'preview-box';
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
          <h3 class="card-title">${model.name}</h3>
          <span class="card-game">${model.game}</span>
        </div>
        <p class="card-desc">${model.description}</p>
      `;

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const inspectBtn = document.createElement('button');
      inspectBtn.type = 'button';
      inspectBtn.className = 'btn';
      inspectBtn.textContent = 'Inspect 3D';
      inspectBtn.addEventListener('click', () => openInspector(model));

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-primary';
      copyBtn.textContent = 'Copy Code';
      copyBtn.addEventListener('click', () => copyCode(formatStandaloneCode(model), copyBtn));

      actions.append(inspectBtn, copyBtn);
      body.appendChild(actions);
      card.append(previewBox, body);
      gridEl.appendChild(card);

      const entry = {
        model,
        canvas,
        group: normalizeModel(model.build(THREE)),
        angle: 0.45
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
    modalMetaEl.textContent = `${model.game} • ${model.category}`;
    const codeStr = formatStandaloneCode(model);
    modalCodeEl.textContent = codeStr;
    modalCopyBtn.onclick = () => copyCode(codeStr, modalCopyBtn);

    modalEl.classList.add('open');

    if (!modalRenderer) {
      modalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      modalViewportEl.insertBefore(modalRenderer.domElement, modalViewportEl.firstChild);

      modalScene = new THREE.Scene();
      modalCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      modalScene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const d1 = new THREE.DirectionalLight(0xffffff, 1.15);
      d1.position.set(5, 7, 5);
      const d2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
      d2.position.set(-5, -3, -5);
      modalScene.add(d1, d2);

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
    modalModelGroup = normalizeModel(model.build(THREE));
    setWireframe(modalModelGroup, wireframe);
    modalScene.add(modalModelGroup);

    const rect = modalViewportEl.getBoundingClientRect();
    modalRenderer.setSize(rect.width || 480, rect.height || 400);
    modalCamera.aspect = (rect.width || 480) / (rect.height || 400);
    modalCamera.updateProjectionMatrix();
    orbit = { theta: 0.6, phi: 1.15, radius: 3.4 };
    updateModalCamera();

    if (!modalAnimId) {
      const loop = () => {
        modalAnimId = requestAnimationFrame(loop);
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
  });

  toggleWireframeBtn.addEventListener('click', () => {
    wireframe = !wireframe;
    toggleWireframeBtn.classList.toggle('active', wireframe);
    if (modalModelGroup) setWireframe(modalModelGroup, wireframe);
  });

  resetCameraBtn.addEventListener('click', () => {
    orbit = { theta: 0.6, phi: 1.15, radius: 3.4 };
    updateModalCamera();
  });

  renderGrid();
})();
