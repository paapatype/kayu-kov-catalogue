// Kayu & Kov 2025 - Mobile Catalogue
// OBJ-based 3D product viewer — all 55 profiles loaded from designer Blender models
// OBJ files: assets/models/profile_01.obj … profile_55.obj

// ========== PROFILE DIMENSIONS LOADER ==========
// Loaded from profile-dimensions.json for product metadata (names, codes, categories, verified status)

let profileDimensions = null;

async function loadProfileDimensions() {
  try {
    const response = await fetch('profile-dimensions.json');
    const data = await response.json();
    profileDimensions = data.profiles;
    console.log(`Loaded ${Object.keys(profileDimensions).length} profile dimensions from JSON`);
    return profileDimensions;
  } catch (e) {
    console.warn('Could not load profile-dimensions.json, building from product data:', e.message);
    profileDimensions = {};
    products.forEach(p => {
      profileDimensions[p.id] = {
        id: p.id,
        name: p.name,
        code: p.code,
        category: p.category,
        price: p.price,
        dimensions: parseDimensionString(p.dimensions),
        verified: false
      };
    });
    return profileDimensions;
  }
}

// Fallback helper: parse "100 x 50mm" or "25mm diameter" into dimensions object
function parseDimensionString(dimStr) {
  const diameterMatch = dimStr.match(/(\d+\.?\d*)\s*mm?\s*diameter/i);
  if (diameterMatch) {
    return { diameter: parseFloat(diameterMatch[1]) };
  }
  const match = dimStr.match(/(\d+\.?\d*)\s*x\s*(\d+\.?\d*)(?:\s*x\s*(\d+\.?\d*))?/i);
  if (match) {
    const result = {
      width: parseFloat(match[1]),
      height: parseFloat(match[2])
    };
    if (match[3]) result.thickness = parseFloat(match[3]);
    return result;
  }
  return { width: 100, height: 20 };
}

// ========== THREE.JS SCENE MANAGEMENT ==========

const viewers = new Map();
const snapshotCache = new Map(); // Global: productId → PNG dataURL (persists across re-renders)
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
let hintShownCount = 0; // Only show drag hint on first few cards

// Check WebGL availability
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// Show error state in viewer container
function showViewerError(container, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'viewer-error';
  errorDiv.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(errorDiv);
}

// Show fallback placeholder (2D representation)
function showFallbackPlaceholder(container, productId) {
  const dims = profileDimensions ? profileDimensions[productId] : null;
  const placeholder = document.createElement('div');
  placeholder.className = 'viewer-fallback';

  const categoryIcon = dims ? getCategoryIcon(dims.category) : '📦';
  const dimText = dims ? `${dims.dimensions.width || dims.dimensions.diameter}mm` : '';

  placeholder.innerHTML = `
    <div class="fallback-icon">${categoryIcon}</div>
    <div class="fallback-text">3D Preview</div>
    ${dimText ? `<div class="fallback-dims">${dimText}</div>` : ''}
  `;
  container.appendChild(placeholder);
}

function getCategoryIcon(category) {
  const icons = {
    'sheet': '▬',
    'strip': '▬',
    'solid-box': '▮',
    'hollow-box': '▭',
    'hollow-strip': '▭',
    'square': '□',
    'door': '▭',
    'louver': '⬭',
    'solid-louver': '⬬',
    'rod': '●',
    'round-pipe': '◯',
    'l-angle': '∟',
    'c-channel': '⊏',
    'i-beam': '工',
    'fluted': '∿',
    'serrated': '⋀',
    'cladding': '▤',
    'railing': '⌒'
  };
  return icons[category] || '▮';
}

// ========== 3D VIEWER — OBJ LOADER ==========

function create3DViewer(container, productId) {
  console.log(`[3D] Creating viewer for product ${productId}...`);

  // Check if Three.js is loaded
  if (typeof THREE === 'undefined') {
    console.error('[3D] THREE is undefined - library not loaded');
    showViewerError(container, '3D library failed to load');
    return null;
  }

  // Check if OrbitControls is available
  if (typeof THREE.OrbitControls === 'undefined') {
    console.error('[3D] THREE.OrbitControls is undefined - controls not loaded');
    showViewerError(container, '3D controls failed to load');
    return null;
  }

  // Check if OBJLoader is available
  if (typeof THREE.OBJLoader === 'undefined') {
    console.error('[3D] THREE.OBJLoader is undefined - loader not loaded');
    showViewerError(container, '3D model loader not available');
    return null;
  }

  // Check WebGL availability
  if (!isWebGLAvailable()) {
    console.warn('[3D] WebGL not available on this device');
    showFallbackPlaceholder(container, productId);
    return null;
  }

  // Ensure container has dimensions
  let containerRect = container.getBoundingClientRect();
  if (containerRect.width === 0 || containerRect.height === 0) {
    container.style.minHeight = '200px';
    containerRect = container.getBoundingClientRect();
  }

  const width = containerRect.width || 300;
  const height = containerRect.height || 200;

  if (width < 10 || height < 10) {
    console.warn(`Container too small: ${width}x${height}`);
    showFallbackPlaceholder(container, productId);
    return null;
  }

  try {
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A2634);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(120, 80, 120);
    camera.lookAt(0, 0, 0);

    // Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,  // Skip antialiasing on mobile for performance
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) {
      console.error('WebGL renderer creation failed:', e);
      showFallbackPlaceholder(container, productId);
      return null;
    }

    if (!renderer.getContext()) {
      console.error('WebGL context is null');
      renderer.dispose();
      showFallbackPlaceholder(container, productId);
      return null;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    // Hide canvas until OBJ model is loaded (prevents empty-scene flash)
    renderer.domElement.style.opacity = '0';
    container.appendChild(renderer.domElement);

    // Handle WebGL context loss
    let animationId;
    let isDestroyed = false;

    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.warn(`[3D] WebGL context lost for product ${productId}`);
      if (animationId) cancelAnimationFrame(animationId);
      renderer.domElement.style.display = 'none';
      // Show cached snapshot if available, otherwise a minimal placeholder
      const cached = snapshotCache.get(String(productId));
      if (cached) {
        const img = document.createElement('img');
        img.src = cached;
        img.className = 'context-lost';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;position:absolute;top:0;left:0;';
        container.appendChild(img);
      } else {
        const lostPlaceholder = document.createElement('div');
        lostPlaceholder.className = 'viewer-paused context-lost';
        lostPlaceholder.innerHTML = '<div class="spinner"></div>';
        container.appendChild(lostPlaceholder);
      }
    });

    renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log(`[3D] WebGL context restored for product ${productId}`);
      container.querySelector('.context-lost')?.remove();
      renderer.domElement.style.display = '';
      animate();
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xE8833A, 0.3);
    fillLight.position.set(-50, 50, -50);
    scene.add(fillLight);

    // Material — Wood appearance
    const material = new THREE.MeshStandardMaterial({
      color: 0xA67C52,
      roughness: 0.7,
      metalness: 0.1
    });

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1;
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    // Animation loop
    let loadedObject = null;

    function animate() {
      if (isDestroyed) return;
      animationId = requestAnimationFrame(animate);
      if (!pageVisible) return; // Skip rendering when tab is hidden (saves GPU/battery)
      controls.update();
      try { renderer.render(scene, camera); } catch (e) { cancelAnimationFrame(animationId); }
    }
    animate();

    // Load OBJ model
    const objPath = `assets/models/profile_${String(productId).padStart(2, '0')}.obj`;
    const loader = new THREE.OBJLoader();
    loader.load(
      objPath,
      (object) => {
        if (isDestroyed) return;

        // Apply wood material to all meshes
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
          }
        });

        // Scale: Blender metres → millimetres
        object.scale.set(1000, 1000, 1000);

        // No rotation needed — OBJ Y-up matches Three.js Y-up

        // Center at origin
        object.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);

        scene.add(object);
        loadedObject = object;

        // Auto-fit camera to model size
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0 && isFinite(maxDim)) {
          const fov = camera.fov * (Math.PI / 180);
          const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 0.68;
          camera.position.set(cameraZ * 0.7, cameraZ * 0.5, cameraZ * 0.7);
          camera.lookAt(0, 0, 0);
        }

        // Pre-cache a snapshot so we have a frozen image if this viewer is later destroyed
        try {
          renderer.render(scene, camera);
          snapshotCache.set(String(productId), renderer.domElement.toDataURL('image/png'));
        } catch (e) { /* snapshot optional */ }

        // Reveal canvas now that the model is rendered
        renderer.domElement.style.transition = 'opacity 0.35s ease-out';
        renderer.domElement.style.opacity = '1';

        // Show a discreet drag hint on the first few cards
        if (hintShownCount < 3) {
          hintShownCount++;
          const hint = document.createElement('div');
          hint.className = 'viewer-drag-hint';
          hint.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 8v8M8 12h8"/></svg> Drag to rotate`;
          container.appendChild(hint);
          // Fade out after 2.5s then remove
          setTimeout(() => {
            hint.style.opacity = '0';
            setTimeout(() => hint.remove(), 500);
          }, 2500);
        }

        console.log(`[3D] OBJ loaded: product ${productId} — ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}mm`);
      },
      undefined,
      (err) => {
        if (!isDestroyed) {
          console.error(`[3D] OBJ load error for product ${productId}:`, err);
          showViewerError(container, 'Failed to load 3D model');
        }
      }
    );

    // Responsive resize
    const resizeObserver = new ResizeObserver(entries => {
      if (isDestroyed) return;
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    console.log(`[3D] Viewer created for product ${productId}`);

    return {
      scene, camera, renderer, controls, mesh: null,
      destroy: () => {
        isDestroyed = true;
        if (animationId) cancelAnimationFrame(animationId);
        resizeObserver.disconnect();
        controls.dispose();

        if (loadedObject) {
          loadedObject.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) child.material.dispose();
            }
          });
        }

        const gl = renderer.getContext();
        if (gl) {
          const ext = gl.getExtension('WEBGL_lose_context');
          if (ext) ext.loseContext();
        }

        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        container.querySelector('.context-lost')?.remove();
        console.log(`[3D] Viewer destroyed for product ${productId}`);
      }
    };

  } catch (e) {
    console.error(`3D viewer creation failed for product ${productId}:`, e);
    showViewerError(container, 'Viewer initialization failed');
    return null;
  }
}

// ========== HELPER FUNCTIONS ==========

function formatPrice(price) {
  return price.toLocaleString('en-IN');
}

function formatCategory(category) {
  return category.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// ========== RENDER FUNCTIONS ==========

function renderProductCard(product) {
  return `
    <article class="product-card" data-id="${product.id}" data-category="${product.category}">
      <div class="card-header" onclick="openModal(${product.id})">
        <div class="card-title-row">
          <span class="serial-badge">${product.id}</span>
          <h3 class="product-name">${product.name}</h3>
        </div>
        <span class="category-tag">${formatCategory(product.category)}</span>
      </div>

      <div class="profile-3d-viewer"
           data-product-id="${product.id}">
        <div class="viewer-loading">
          <div class="spinner"></div>
        </div>
      </div>
      <div class="card-footer" onclick="openModal(${product.id})">
        <div class="product-meta">
          <span class="product-dimensions">${product.dimensions}</span>
          <span class="product-code">${product.code}</span>
        </div>
        <div class="product-price">
          <span class="price-label">/RFT</span>
          <span class="price-value">&#8377;${formatPrice(product.price)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderProducts(filteredProducts) {
  const grid = document.getElementById('productsGrid');
  const countEl = document.getElementById('productCount');

  // Destroy existing viewers
  viewers.forEach(viewer => viewer.destroy());
  viewers.clear();

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <h3>No products found</h3>
        <p>Try adjusting your search or filter</p>
      </div>
    `;
  } else {
    grid.innerHTML = filteredProducts.map(renderProductCard).join('');

    // Lazy-load 3D viewers via IntersectionObserver
    const MAX_ACTIVE_VIEWERS = isMobile ? 4 : 8;
    const activeViewerQueue = [];
    const pendingCreation = new Set();

    const viewerContainers = document.querySelectorAll('.profile-3d-viewer');

    function captureSnapshot(viewer, productId) {
      // Try to update the cached snapshot with the latest frame
      try {
        viewer.renderer.render(viewer.scene, viewer.camera);
        snapshotCache.set(productId, viewer.renderer.domElement.toDataURL('image/png'));
      } catch (e) { /* pre-cached snapshot from OBJ load still available */ }
    }

    function showSnapshot(container, productId) {
      const dataUrl = snapshotCache.get(productId);
      if (dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'viewer-snapshot';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;position:absolute;top:0;left:0;';
        img.alt = 'Product preview';
        container.appendChild(img);
        return true;
      }
      return false;
    }

    function createViewerForContainer(container, observer) {
      const productId = container.dataset.productId;

      if (viewers.has(productId) || pendingCreation.has(productId)) {
        const idx = activeViewerQueue.indexOf(productId);
        if (idx > -1) {
          activeViewerQueue.splice(idx, 1);
          activeViewerQueue.push(productId);
        }
        return;
      }

      pendingCreation.add(productId);

      while (activeViewerQueue.length >= MAX_ACTIVE_VIEWERS) {
        const oldestId = activeViewerQueue.shift();
        const oldViewer = viewers.get(oldestId);
        if (oldViewer) {
          captureSnapshot(oldViewer, oldestId);
          oldViewer.destroy();
          viewers.delete(oldestId);

          const oldContainer = document.querySelector(`.profile-3d-viewer[data-product-id="${oldestId}"]`);
          if (oldContainer) {
            // Show cached snapshot (frozen frame) or a loading spinner
            if (!showSnapshot(oldContainer, oldestId)) {
              const placeholder = document.createElement('div');
              placeholder.className = 'viewer-loading';
              placeholder.innerHTML = '<div class="spinner"></div>';
              oldContainer.appendChild(placeholder);
            }
            observer.unobserve(oldContainer);
            observer.observe(oldContainer);
          }
        }
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          container.querySelector('.viewer-loading')?.remove();
          container.querySelector('.viewer-paused')?.remove();
          container.querySelector('.viewer-snapshot')?.remove();

          try {
            const viewer = create3DViewer(container, parseInt(productId));
            if (viewer) {
              viewers.set(productId, viewer);
              activeViewerQueue.push(productId);

              // Stop auto-rotate by default, only rotate on hover/touch
              viewer.controls.autoRotate = false;

              // Desktop: rotate on hover
              container.addEventListener('mouseenter', () => {
                viewer.controls.autoRotate = true;
              });
              container.addEventListener('mouseleave', () => {
                viewer.controls.autoRotate = false;
              });

              // Mobile: rotate on touch
              container.addEventListener('touchstart', () => {
                viewer.controls.autoRotate = true;
              }, { passive: true });
              container.addEventListener('touchend', () => {
                viewer.controls.autoRotate = false;
              }, { passive: true });
            }
          } catch (e) {
            console.error(`[3D] Viewer creation exception for ${productId}:`, e);
            showViewerError(container, 'Unexpected error');
          } finally {
            pendingCreation.delete(productId);
          }
        }, 100);
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          createViewerForContainer(entry.target, observer);
        }
      });
    }, { rootMargin: '100px', threshold: 0.1 });

    viewerContainers.forEach(container => observer.observe(container));
  }

  countEl.textContent = filteredProducts.length;
}

// ========== FILTER LOGIC ==========

let currentCategory = 'all';
let currentSearch = '';

function filterProducts(category, searchTerm) {
  let filtered = products;

  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.code.includes(term) ||
      p.dimensions.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  }

  return filtered;
}

function updateDisplay() {
  const filtered = filterProducts(currentCategory, currentSearch);
  renderProducts(filtered);

  // Show/hide active filter indicator
  const header = document.querySelector('.products-header');
  const existing = header.querySelector('.active-filter');
  if (existing) existing.remove();

  if (currentCategory !== 'all' || currentSearch) {
    const label = currentSearch
      ? `"${currentSearch}"`
      : formatCategory(currentCategory);
    const indicator = document.createElement('button');
    indicator.className = 'active-filter';
    indicator.innerHTML = `${label} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    indicator.onclick = resetToAll;
    header.appendChild(indicator);
  }
}

function resetToAll() {
  currentCategory = 'all';
  currentSearch = '';
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === 'all');
  });
  updateDisplay();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleCategoryClick(e) {
  if (!e.target.classList.contains('category-btn')) return;

  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  e.target.classList.add('active');

  currentCategory = e.target.dataset.category;
  updateDisplay();

  document.querySelector('.products-container').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function handleSearch(e) {
  currentSearch = e.target.value;
  updateDisplay();
}

// ========== MODAL ==========

let modalViewer = null;

function openModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('productModal');
  const modalBody = document.getElementById('modalBody');

  if (modalViewer) {
    modalViewer.destroy();
    modalViewer = null;
  }

  // Check if a spec drawing exists for this product
  const specProducts = {
    1: 'profile_01_spec.svg',
    2: 'profile_02_spec.svg',
    3: 'profile_03_spec.svg',
    4: 'profile_04_spec.svg',
    5: 'profile_05_spec.svg',
    6: 'profile_06_spec.svg',
    7: 'profile_07_spec.svg',
    8: 'profile_08_spec.svg',
    9: 'profile_09_spec.svg',
    10: 'profile_10_spec.svg',
    11: 'profile_11_spec.svg',
    12: 'profile_12_spec.svg',
    13: 'profile_13_spec.svg',
    14: 'profile_14_spec.svg',
    15: 'profile_15_spec.svg',
    16: 'profile_16_spec.svg',
    17: 'profile_17_spec.svg',
    18: 'profile_18_spec.svg',
    19: 'profile_19_spec.svg',
    20: 'profile_20_spec.svg',
    21: 'profile_21_spec.svg',
    22: 'profile_22_spec.svg',
    23: 'profile_23_spec.svg',
    24: 'profile_24_spec.svg',
    25: 'profile_25_spec.svg',
    26: 'profile_26_spec.svg',
    27: 'profile_27_spec.svg',
    28: 'profile_28_spec.svg',
    29: 'profile_29_spec.svg',
    30: 'profile_30_spec.svg',
    31: 'profile_31_spec.svg',
    32: 'profile_32_spec.svg',
    33: 'profile_33_spec.svg',
    34: 'profile_34_spec.svg',
    35: 'profile_35_spec.svg',
    36: 'profile_36_spec.svg',
    37: 'profile_37_spec.svg',
    38: 'profile_38_spec.svg',
    39: 'profile_39_spec.svg',
    40: 'profile_40_spec.svg',
    41: 'profile_41_spec.svg',
    42: 'profile_42_spec.svg',
    43: 'profile_43_spec.svg',
    44: 'profile_44_spec.svg',
    45: 'profile_45_spec.svg',
    46: 'profile_46_spec.svg',
    47: 'profile_47_spec.svg',
    48: 'profile_48_spec.svg',
    49: 'profile_49_spec.svg',
    50: 'profile_50_spec.svg',
    51: 'profile_51_spec.svg',
    52: 'profile_52_spec.svg',
    53: 'profile_53_spec.svg',
    54: 'profile_54_spec.svg',
    55: 'profile_55_spec.svg',
  };
  const specFile = specProducts[product.id];
  const specSection = specFile
    ? `<div class="spec-drawing">
        <div class="spec-label">Cross-Section Drawing</div>
        <img src="assets/specs/${specFile}" alt="${product.name} cross-section" class="spec-img">
      </div>`
    : '';

  modalBody.innerHTML = `
    <div class="modal-header">
      <span class="modal-badge">${product.id}</span>
      <div class="modal-title-group">
        <h2 class="modal-title">${product.name}</h2>
        <span class="modal-category">${formatCategory(product.category)}</span>
      </div>
    </div>
    <div class="modal-3d-viewer"
         data-product-id="${product.id}">
      <div class="viewer-loading"><div class="spinner"></div></div>
    </div>
    <div class="viewer-hint">Drag to rotate &bull; Double-tap to reset</div>
    ${specSection}
    <div class="modal-details">
      <div class="detail-row">
        <span class="detail-label">Dimensions</span>
        <span class="detail-value">${product.dimensions}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Product Code</span>
        <span class="detail-value code">${product.code}</span>
      </div>
      <div class="detail-row">
        <span class="price-label">/RFT</span>
        <span class="detail-value price">&#8377;${formatPrice(product.price)}</span>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    setTimeout(() => {
      const container = modalBody.querySelector('.modal-3d-viewer');
      const loadingEl = container.querySelector('.viewer-loading');

      try {
        modalViewer = create3DViewer(container, product.id);
        loadingEl?.remove();
      } catch (e) {
        console.error(`Modal viewer failed for product ${product.id}:`, e);
        loadingEl?.remove();
        showViewerError(container, 'Failed to load 3D view');
      }
    }, 150);
  });
}

function closeModal() {
  const modal = document.getElementById('productModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  if (modalViewer) {
    modalViewer.destroy();
    modalViewer = null;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ========== SCROLL TO TOP ==========

function createScrollToTop() {
  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  `;
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
}

// ========== PAGE VISIBILITY — pause rendering when tab is hidden (saves battery) ==========

let pageVisible = true;

document.addEventListener('visibilitychange', () => {
  pageVisible = !document.hidden;
  if (pageVisible) {
    // Resume all active viewers
    viewers.forEach(viewer => {
      if (viewer.controls) viewer.controls.update();
    });
  }
});

// ========== INIT ==========

async function init() {
  // Load profile dimensions for product metadata
  await loadProfileDimensions();

  // Check 3D prerequisites
  const threeReady = typeof THREE !== 'undefined'
    && typeof THREE.OrbitControls !== 'undefined'
    && typeof THREE.OBJLoader !== 'undefined';

  if (!threeReady) {
    console.error('Three.js, OrbitControls, or OBJLoader not loaded - 3D viewers will show fallbacks');
  }

  // Render UI
  renderProducts(products);
  document.querySelector('.category-scroll').addEventListener('click', handleCategoryClick);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('headerLogo').addEventListener('click', resetToAll);
  createScrollToTop();

  console.log(`Kayu & Kov Catalogue: ${products.length} products loaded`);
  console.log(`Profile dimensions: ${profileDimensions ? Object.keys(profileDimensions).length : 0} profiles`);
  console.log(`3D rendering: ${threeReady ? 'enabled (OBJ models)' : 'DISABLED - libraries not loaded'}`);
}

document.addEventListener('DOMContentLoaded', init);
