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

// OBJ model filenames — shared by the card viewers AND the download panel
const OBJ_FILES = {
  1: 'profile_01_fluted_145x18.obj',
  2: 'profile_02_hollow_box_100x50.obj',
  3: 'profile_03_cladding_112x15.obj',
  4: 'profile_04_C_channel_50x50x6.obj',
  5: 'profile_05_rod_25mm.obj',
  6: 'profile_06_C_channel_100x30x16.obj',
  7: 'profile_07_serrated_100x20.obj',
  8: 'profile_08_strip_50x25.obj',
  9: 'profile_09_sheet_100x8.obj',
  10: 'profile_10_sheet_100x10.obj',
  11: 'profile_11_sheet_100x12.obj',
  12: 'profile_12_sheet_150x8.obj',
  13: 'profile_13_sheet_150x10.obj',
  14: 'profile_14_sheet_150x12.obj',
  15: 'profile_15_cladding_58x15.obj',
  16: 'profile_16_cladding_98x15.obj',
  17: 'profile_17_louver_150x35.obj',
  18: 'profile_18_hollow_box_150x25.obj',
  19: 'profile_19_solid_box_150x25.obj',
  20: 'profile_20_door_100x20.obj',
  21: 'profile_21_door_100x20x6.obj',
  22: 'profile_22_door_solid_100x20.obj',
  23: 'profile_23_door_85x31.obj',
  24: 'profile_24_door_frame_85x31.obj',
  25: 'profile_25_single_door_frame_85x31.obj',
  26: 'profile_26_sheet_100x6.obj',
  27: 'profile_27_sheet_200x11.obj',
  28: 'profile_28_sheet_200x7.obj',
  29: 'profile_29_sheet_400x11.obj',
  30: 'profile_30_sheet_400x7.obj',
  31: 'profile_31_strip_55x10.obj',
  32: 'profile_32_strip_80x11.obj',
  33: 'profile_33_strip_40x20.obj',
  34: 'profile_34_hollow_strip_40x20.obj',
  35: 'profile_35_hollow_strip_50x25.obj',
  36: 'profile_36_strip_45x10.obj',
  37: 'profile_37_L-angle_30x30x4.obj',
  38: 'profile_38_L-angle_40x40x4.obj',
  39: 'profile_39_louver_75x20.obj',
  40: 'profile_40_solid_louver_75x20.obj',
  41: 'profile_41_round_pipe_80x10.obj',
  42: 'profile_42_C-channel_100x30x6.obj',
  43: 'profile_43_C-channel_84x30x6.obj',
  44: 'profile_44_I-beam_38x6.obj',
  45: 'profile_45_rod_9mm.obj',
  46: 'profile_46_rod_8mm.obj',
  47: 'profile_47_rod_6mm.obj',
  48: 'profile_48_square_50x50x6.obj',
  49: 'profile_49_strip_80x6.obj',
  50: 'profile_50_square_100x100x8.obj',
  51: 'profile_51_square_box_150x150.obj',
  52: 'profile_52_strip_60x6.obj',
  53: 'profile_53_railing_65x32.5.obj',
  54: 'profile_54_hollow_box_150x50.obj',
  55: 'profile_55_round_pipe_150x10.obj'
};
const objFileFor = id => OBJ_FILES[id] || `profile_${String(id).padStart(2, '0')}.obj`;

// Cross-section spec drawings follow one naming pattern for all 55 profiles —
// shared by the detail modal AND the download card builder
function specFileFor(id) {
  return (id >= 1 && id <= 55) ? `profile_${String(id).padStart(2, '0')}_spec.svg` : null;
}

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

    // Load OBJ model — filename map hoisted to OBJ_FILES (shared with the download panel)
    const objFile = objFileFor(productId);
    const objPath = `assets/models/${objFile}`;
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

        // Auto-fit camera by the model's PROJECTED extents from the default
        // view direction, so every profile fills its card equally. Fitting the
        // longest raw dimension (the old way) pushed flat planks (fluted,
        // cladding) far away — they rendered at half the visual size of boxy
        // profiles sitting right next to them.
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0 && isFinite(maxDim)) {
          const fov = camera.fov * (Math.PI / 180);
          const dirV = new THREE.Vector3(0.7, 0.5, 0.7).normalize();
          const rightV = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dirV).normalize();
          const trueUpV = new THREE.Vector3().crossVectors(dirV, rightV).normalize();
          let hw = 0, hh = 0, hd = 0; // half-extents projected on screen-x / screen-y / view axis
          for (let ci = 0; ci < 8; ci++) {
            const corner = new THREE.Vector3(
              (ci & 1 ? size.x : -size.x) / 2,
              (ci & 2 ? size.y : -size.y) / 2,
              (ci & 4 ? size.z : -size.z) / 2
            );
            hw = Math.max(hw, Math.abs(corner.dot(rightV)));
            hh = Math.max(hh, Math.abs(corner.dot(trueUpV)));
            hd = Math.max(hd, Math.abs(corner.dot(dirV)));
          }
          const tanHalf = Math.tan(fov / 2);
          const dist = Math.max(hh / tanHalf, hw / (tanHalf * camera.aspect)) * 1.10 + hd;
          camera.position.copy(dirV.multiplyScalar(dist));
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
      <button class="card-download-btn" onclick="event.stopPropagation();openDownloadPanel(${product.id})" aria-label="Download card — ${product.name}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11"/><path d="m8 11 4 4 4-4"/><path d="M5 21h14"/></svg>
        <span>Download</span>
      </button>
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

  // Spec drawings exist for all 55 profiles — shared helper (also used by the card builder)
  const specFile = specFileFor(product.id);
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
    <button class="modal-download-btn" onclick="openDownloadPanel(${product.id})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11"/><path d="m8 11 4 4 4-4"/><path d="M5 21h14"/></svg>
      <span>Download card</span>
    </button>
  `;

  if (!modal.classList.contains('active')) {
    modal.classList.add('active');
    lockScroll(); // once per open — re-opening while active must not stack locks
  }

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
  if (!modal.classList.contains('active')) return;
  modal.classList.remove('active');
  unlockScroll();

  if (modalViewer) {
    modalViewer.destroy();
    modalViewer = null;
  }
}

// Keep keyboard focus inside whichever download layer is open (minimal focus trap)
function kkTrapTab(e) {
  const kkOv = document.getElementById('kkOv');
  const dlp = document.getElementById('dlPanel');
  const scope = (kkOv && kkOv.classList.contains('open')) ? kkOv
    : (dlp && dlp.classList.contains('open')) ? dlp : null;
  if (!scope) return;
  const els = [...scope.querySelectorAll('button, textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && !el.hidden && el.getClientRects().length > 0);
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  const active = document.activeElement;
  if (e.shiftKey) {
    if (active === first || !scope.contains(active)) { e.preventDefault(); last.focus(); }
  } else if (active === last || !scope.contains(active)) {
    e.preventDefault(); first.focus();
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { kkTrapTab(e); return; }
  if (e.key !== 'Escape' || e.isComposing) return;
  // Esc inside the note field exits the field, not the overlay (don't nuke a half-typed note)
  const note = document.getElementById('kkNote');
  if (note && document.activeElement === note) { note.blur(); return; }
  // Close the topmost layer first: card overlay → download panel → detail modal
  const kkOv = document.getElementById('kkOv');
  // Ignore Escape while the card is building (the ✕ is hidden then too) so a
  // finished build doesn't re-open an overlay the user just dismissed.
  if (kkOv && kkOv.classList.contains('building')) return;
  if (kkOv && kkOv.classList.contains('open')) { closeCardOverlay(); return; }
  const dlp = document.getElementById('dlPanel');
  if (dlp && dlp.classList.contains('open')) { closeDownloadPanel(); return; }
  closeModal();
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

// ========== WEBGL WARM-UP ==========
// The very first 3D card otherwise pays one-time costs the later cards
// skip: spinning up the GPU process and compiling the MeshStandardMaterial
// shader program (the program is cached after the first compile). That is
// why the first model — Fluted Profile-3 — appeared a beat slower than the
// rest. We pay those costs once, up front, on a throwaway 1×1 renderer
// that mirrors the cards' material + lights, so the program is already
// cached by the time the first card renders. Fully guarded: best-effort,
// and on any failure the cards behave exactly as before.
let _webglWarmed = false;
function prewarmWebGL() {
  if (_webglWarmed) return;
  _webglWarmed = true;
  try {
    if (typeof THREE === 'undefined' || typeof THREE.WebGLRenderer === 'undefined') return;
    if (!isWebGLAvailable()) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    });
    renderer.setSize(1, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);

    // Mirror create3DViewer's lights + material so the shader program the
    // renderer compiles here is the same one the cards will use.
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(50, 100, 50);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xE8833A, 0.3);
    fill.position.set(-50, 50, -50);
    scene.add(fill);

    const mat = new THREE.MeshStandardMaterial({ color: 0xA67C52, roughness: 0.7, metalness: 0.1 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    scene.add(mesh);

    if (typeof renderer.compile === 'function') renderer.compile(scene, camera);
    renderer.render(scene, camera);

    // Dispose — we only wanted the warm-up side effects (GPU process up,
    // shader program cached).
    mesh.geometry.dispose();
    mat.dispose();
    renderer.dispose();
    if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
    console.log('[3D] WebGL pipeline pre-warmed');
  } catch (e) {
    /* warm-up is best-effort — never block or break the catalogue */
  }
}

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

  // Warm the 3D pipeline once, off the critical path, so the first card
  // (Fluted Profile-3) renders as fast as the rest. Deferred a tick so it
  // runs during that first model's network fetch rather than before the
  // grid paints — the first card's shader compile happens inside its OBJ
  // load callback, which gives this warm-up time to win the race.
  if (threeReady) setTimeout(prewarmWebGL, 0);

  console.log(`Kayu & Kov Catalogue: ${products.length} products loaded`);
  console.log(`Profile dimensions: ${profileDimensions ? Object.keys(profileDimensions).length : 0} profiles`);
  console.log(`3D rendering: ${threeReady ? 'enabled (OBJ models)' : 'DISABLED - libraries not loaded'}`);
}

document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   V2 BRANDED CARD DOWNLOAD
   Client-approved design ported from the local V2 review tool.
   One "Download card" button per product → centred adjust panel
   (freehand / X-Y sliders / reset) → branded spec card preview →
   Download Image / PDF · WhatsApp / Email share with note.
   ============================================================ */

// ---------- scroll lock (counter-based; composes across modal → panel → overlay) ----------
let _lockY = 0, _locks = 0;
function lockScroll() {
  if (_locks++ > 0) return;
  _lockY = window.scrollY || document.documentElement.scrollTop || 0;
  const b = document.body.style;
  b.position = 'fixed'; b.top = `-${_lockY}px`;
  b.left = '0'; b.right = '0'; b.width = '100%'; b.overflow = 'hidden';
}
function unlockScroll() {
  if (_locks > 0) _locks--;
  if (_locks > 0) return;
  const b = document.body.style;
  b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.width = ''; b.overflow = '';
  // html { scroll-behavior: smooth } would animate this restore (and let a
  // same-tick lockScroll read a stale position) — force an instant jump.
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, _lockY);
  html.style.scrollBehavior = prev;
}

// ---------- toast ----------
let _kkToastTimer;
function kkToast(msg) {
  const t = document.getElementById('kkToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_kkToastTimer);
  _kkToastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- filename convention (fixed — never user-editable) ----------
function kkKebab(s) { return s.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, ''); }
function kkSizeSafe(s) { return s.replace(/\s+/g, '').replace(/[×x]/gi, 'x').replace(/[^A-Za-z0-9.\-]/g, ''); }
function kkFname(p) { return `kayuandkov_${kkKebab(p.name)}_Rs${p.price}_${kkSizeSafe(p.dimensions)}`; }
function kkNowStamp() {
  return new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------- lazy libraries (html2canvas + jsPDF load on first use, not at page load) ----------
let _cardLibsPromise = null;
function kkLoadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}
function ensureCardLibs() {
  if (!_cardLibsPromise) {
    _cardLibsPromise = Promise.all([
      (typeof html2canvas === 'undefined')
        ? kkLoadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
        : Promise.resolve(),
      (!window.jspdf)
        ? kkLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        : Promise.resolve()
    ]).catch(err => { _cardLibsPromise = null; throw err; });
  }
  return _cardLibsPromise;
}

// ---------- dedicated panel viewer (site-parity render; preserveDrawingBuffer for capture) ----------
function dlMakeViewer(host) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 2000);
  cam.position.set(120, 80, 120);
  const rnd = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  rnd.setSize(host.clientWidth, host.clientHeight);
  rnd.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(rnd.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(50, 100, 50); scene.add(key);
  const fill = new THREE.DirectionalLight(0xE8833A, 0.3); fill.position.set(-50, 50, -50); scene.add(fill);
  const mat = new THREE.MeshStandardMaterial({ color: 0xA67C52, roughness: 0.7, metalness: 0.1 });
  const ctr = new THREE.OrbitControls(cam, rnd.domElement);
  ctr.enableDamping = true; ctr.dampingFactor = 0.05; ctr.enablePan = false;
  const v = { scene, cam, rnd, mat, ctr, host, obj: null, maxDim: 100, fitRadius: null, destroyed: false };
  // The browser caps live WebGL contexts per page and silently evicts the
  // least-recent when the grid's lazy viewers push past it (big screens, or
  // opening the panel before the grid settles). An evicted context "renders"
  // nothing — every capture would come out blank — so rebuild this viewer
  // the moment its context is lost.
  rnd.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    if (v.destroyed) return;
    setTimeout(() => { if (!v.destroyed && dlViewer === v) dlRebuildViewer(); }, 60);
  });
  let raf;
  (function loop() {
    if (v.destroyed) return;
    raf = requestAnimationFrame(loop);
    ctr.update();
    try { rnd.render(scene, cam); } catch (e) { /* keep looping; capture guards separately */ }
  })();
  const ro = new ResizeObserver(() => {
    if (v.destroyed || !host.clientWidth) return;
    cam.aspect = host.clientWidth / host.clientHeight;
    cam.updateProjectionMatrix();
    rnd.setSize(host.clientWidth, host.clientHeight);
  });
  ro.observe(host);
  v.destroy = () => {
    v.destroyed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    ctr.dispose();
    if (v.obj) v.obj.traverse(c => { if (c.isMesh && c.geometry) c.geometry.dispose(); });
    mat.dispose();
    const gl = rnd.getContext();
    const ext = gl && gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    rnd.dispose();
    if (host.contains(rnd.domElement)) host.removeChild(rnd.domElement);
  };
  return v;
}

function dlLoadInto(v, id, cb) {
  new THREE.OBJLoader().load(
    'assets/models/' + objFileFor(id),
    obj => {
      if (v.destroyed) return;
      if (v.obj) v.scene.remove(v.obj);
      obj.traverse(c => { if (c.isMesh) c.material = v.mat; });
      obj.scale.set(1000, 1000, 1000);
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      obj.position.sub(box.getCenter(new THREE.Vector3()));
      v.scene.add(obj);
      v.obj = obj;
      const sz = box.getSize(new THREE.Vector3());
      v.maxDim = Math.max(sz.x, sz.y, sz.z) || 100;
      dlFit(v);
      cb && cb();
    },
    undefined,
    () => { if (!v.destroyed) kkToast('Could not load the 3D model'); }
  );
}
function dlFit(v) {
  const f = v.cam.fov * Math.PI / 180, cz = Math.abs(v.maxDim / Math.sin(f / 2)) * 0.68;
  v.fitRadius = cz;
  v.cam.position.set(cz * 0.7, cz * 0.5, cz * 0.7);
  v.ctr.target.set(0, 0, 0);
  v.cam.lookAt(0, 0, 0);
  v.ctr.update();
}
// Orbit the CAMERA around the model centre (pivots on centre, never on a corner)
function dlOrbitTo(v, polarDeg, azDeg) {
  const r = v.fitRadius || Math.abs(v.maxDim / Math.sin((v.cam.fov * Math.PI / 180) / 2)) * 0.68;
  const sph = new THREE.Spherical(r, THREE.MathUtils.degToRad(polarDeg), THREE.MathUtils.degToRad(azDeg));
  const p = new THREE.Vector3().setFromSpherical(sph);
  v.cam.position.copy(p);
  v.ctr.target.set(0, 0, 0);
  v.cam.lookAt(0, 0, 0);
  v.ctr.update();
}
function dlGrab(v) {
  v.rnd.render(v.scene, v.cam);
  return v.rnd.domElement.toDataURL('image/png');
}

// The extrusion axis of a constant-cross-section profile, found from geometry:
// side walls run PARALLEL to the extrusion, so the axis with the least
// projected face area (area-weighted |face normal · axis|) is the extrusion.
// Robust to how each OBJ happens to be oriented or how short the segment is —
// bounding-box "longest side" is NOT reliable here (some models are short
// segments, some are extruded along Y).
function dlExtrusionAxis(obj) {
  const acc = { x: 0, y: 0, z: 0 };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  obj.traverse(ch => {
    if (!ch.isMesh || !ch.geometry || !ch.geometry.attributes.position) return;
    const pos = ch.geometry.attributes.position;
    const idx = ch.geometry.index;
    const tri = idx ? idx.count / 3 : pos.count / 3;
    const gi = i => idx ? idx.getX(i) : i;
    for (let t = 0; t < tri; t++) {
      a.fromBufferAttribute(pos, gi(t * 3));
      b.fromBufferAttribute(pos, gi(t * 3 + 1));
      c.fromBufferAttribute(pos, gi(t * 3 + 2));
      ab.subVectors(b, a); ac.subVectors(c, a);
      n.crossVectors(ab, ac); // components = 2× the triangle's projected areas
      acc.x += Math.abs(n.x); acc.y += Math.abs(n.y); acc.z += Math.abs(n.z);
    }
  });
  let axis = 'x';
  if (acc.y <= acc[axis]) axis = 'y';
  if (acc.z <= acc[axis]) axis = 'z';
  return axis;
}

// Four axis-true ORTHOGRAPHIC captures for the card's view tiles.
// Replaces the old perspective orbit snaps, which fitted the bounding SPHERE —
// so a long extrusion's end-on view was shot from metres away (a speck), and
// world-fixed lights left bottom/back faces near-black. Views are chosen
// relative to the PROFILE, not the OBJ's arbitrary orientation:
//   left/right = down the extrusion axis → the true cross-section, hollow
//                chambers visible;   top/bottom = looking at the wide face.
// Each view gets its own bounding-box framing, and the pass is lit in
// isolation (scene lights hidden, neutral ambient + camera headlight) so all
// four tiles have identical, non-blown exposure. Works for all 55 shapes.
// The user's camera is a separate object and is never touched; lights,
// renderer size and pixel-ratio are restored before returning.
// v may be omitted (defaults to the live panel viewer) — used by test harnesses.
function dlOrthoViews(v, outW, outH) {
  v = v || dlViewer;
  if (!v || v.destroyed || !v.obj) return null;
  outW = outW || 320; outH = outH || 320; // square, ≈3× the square card tile —
  // with the shared fit margin every view fills the same fraction of its tile,
  // so the four thumbnails read as evenly spaced with equal padding
  const box = new THREE.Box3().setFromObject(v.obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const E = dlExtrusionAxis(v.obj);                       // along the profile
  const cross = ['x', 'y', 'z'].filter(ax => ax !== E);
  // of the two cross axes: W = the profile's width (larger), T = its thickness
  const [Wax, Tax] = size[cross[0]] >= size[cross[1]] ? cross : [cross[1], cross[0]];
  const unit = ax => new THREE.Vector3(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0);
  // The profile WIDTH runs horizontally in every tile (the segment length in
  // the OBJ is arbitrary, so it gets the vertical axis on top/bottom views) —
  // keeps all four thumbnails reading as one aligned family.
  const DEFS = {
    top:    { dir: unit(Tax),          up: unit(E).negate(), h: Wax, vv: E },   // wide face
    bottom: { dir: unit(Tax).negate(), up: unit(E).negate(), h: Wax, vv: E },
    left:   { dir: unit(E).negate(),   up: unit(Tax),        h: Wax, vv: Tax }, // cross-section
    right:  { dir: unit(E),            up: unit(Tax),        h: Wax, vv: Tax },
  };
  // Isolated neutral lighting: hide the scene's world-fixed lights (they blow
  // out whichever face they happen to hit), light with ambient + headlight only.
  const worldLights = [];
  v.scene.traverse(ch => { if (ch.isLight) worldLights.push([ch, ch.visible]); });
  worldLights.forEach(([l]) => { l.visible = false; });
  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  const head = new THREE.DirectionalLight(0xffffff, 0.7);
  v.scene.add(amb); v.scene.add(head);
  const prevPR = v.rnd.getPixelRatio();
  v.rnd.setPixelRatio(1);
  v.rnd.setSize(outW, outH, false); // attribute size only — layout untouched
  const MARGIN = 1.12, aspect = outW / outH;
  const out = {};
  for (const key of ['top', 'bottom', 'left', 'right']) {
    const d = DEFS[key];
    let halfW = (size[d.h] / 2) * MARGIN || 0.5;
    let halfH = (size[d.vv] / 2) * MARGIN || 0.5;
    if (halfW / halfH > aspect) halfH = halfW / aspect; else halfW = halfH * aspect;
    const depth = size.x * Math.abs(d.dir.x) + size.y * Math.abs(d.dir.y) + size.z * Math.abs(d.dir.z);
    const dist = depth / 2 + maxDim;
    const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, dist + depth + maxDim);
    cam.position.copy(center).addScaledVector(d.dir, dist);
    cam.up.copy(d.up);
    cam.lookAt(center);
    cam.updateProjectionMatrix();
    head.position.copy(cam.position);
    v.rnd.render(v.scene, cam);
    out[key] = v.rnd.domElement.toDataURL('image/png');
  }
  // restore everything: lights, renderer, and repaint the user's own view
  v.scene.remove(amb); v.scene.remove(head);
  worldLights.forEach(([l, vis]) => { l.visible = vis; });
  v.rnd.setPixelRatio(prevPR);
  v.rnd.setSize(v.host.clientWidth || outW, v.host.clientHeight || outH, false);
  v.rnd.render(v.scene, v.cam);
  return out;
}

// ---------- download panel lifecycle ----------
let dlViewer = null, dlProduct = null, dlMode = 'free', _dlPrevFocus = null;

// Recreate the panel viewer after its WebGL context was evicted, keeping the
// user's camera pose. The rebuilt context is the page's newest, so it wins
// any further eviction rounds against the background grid viewers.
function dlRebuildViewer() {
  if (!dlViewer || !dlProduct || dlViewer.destroyed) return;
  const host = dlViewer.host;
  const keepPos = dlViewer.cam.position.clone();
  const keepTgt = dlViewer.ctr.target.clone();
  const hadObj = !!dlViewer.obj;
  dlViewer.destroy();
  dlViewer = dlMakeViewer(host);
  dlLoadInto(dlViewer, dlProduct.id, () => {
    // dlLoadInto ends with dlFit; put the user's pose back on top of it
    if (hadObj) {
      dlViewer.cam.position.copy(keepPos);
      dlViewer.ctr.target.copy(keepTgt);
      dlViewer.cam.lookAt(keepTgt);
      dlViewer.ctr.update();
    }
  });
}

function openDownloadPanel(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const panel = document.getElementById('dlPanel');
  if (panel.classList.contains('open')) return; // double-click guard — keeps the lock counter balanced
  // Capture the restore-focus target BEFORE closing the modal (closing moves focus to <body>)
  _dlPrevFocus = document.activeElement;
  // Take the lock BEFORE closing the modal so the counter never hits zero mid-handoff
  // (unlocking would restore scroll and re-read a stale position under smooth-scroll).
  lockScroll();
  // Keep one layer of UI: leaving the detail modal open underneath just stacks scrims on a phone
  closeModal();
  dlProduct = p;
  ensureCardLibs().catch(() => { /* surfaced with a toast when Download card is pressed */ });

  document.getElementById('dlpBadge').textContent = p.id;
  document.getElementById('dlpName').textContent = p.name;
  document.getElementById('dlpMeta').textContent = `${p.dimensions} · ₹${formatPrice(p.price)}/RFT`;

  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');

  // Reset controls to defaults
  dlMode = 'free';
  document.getElementById('dlpRotX').value = 20;
  document.getElementById('dlpRotY').value = 35;
  syncDlSliderLabels();
  syncDlMode();

  // Build the viewer once the panel has laid out (stage needs real dimensions).
  // rAF alone never fires while the tab is hidden/backgrounded (compositing
  // stops but layout still works), so race it against a short timeout —
  // whichever fires first creates the viewer, the other becomes a no-op.
  let dlKicked = false;
  const dlKick = () => {
    if (dlKicked) return;
    dlKicked = true;
    if (!panel.classList.contains('open')) return; // closed before it settled
    const stage = document.getElementById('dlpStage');
    if (dlViewer) { dlViewer.destroy(); dlViewer = null; }
    stage.querySelectorAll('canvas').forEach(c => c.remove());
    const loading = stage.querySelector('.viewer-loading');
    if (loading) loading.style.display = 'flex';
    dlViewer = dlMakeViewer(stage);
    dlViewer.ctr.enabled = (dlMode === 'free');
    dlLoadInto(dlViewer, p.id, () => {
      const l = stage.querySelector('.viewer-loading');
      if (l) l.style.display = 'none';
      if (dlMode === 'slider') applyDlRot();
    });
    const x = document.getElementById('dlpClose');
    if (x) x.focus();
  };
  requestAnimationFrame(() => setTimeout(dlKick, 30));
  setTimeout(dlKick, 300); // hidden-tab fallback
}

function closeDownloadPanel() {
  const panel = document.getElementById('dlPanel');
  if (!panel || !panel.classList.contains('open')) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  if (dlViewer) { dlViewer.destroy(); dlViewer = null; }
  unlockScroll();
  if (_dlPrevFocus && _dlPrevFocus.focus) { try { _dlPrevFocus.focus(); } catch (e) { /* focus best-effort */ } }
}

function syncDlMode() {
  const slider = dlMode === 'slider';
  document.querySelectorAll('#dlpSeg button').forEach(b => {
    b.classList.toggle('on', b.dataset.m === dlMode);
    b.setAttribute('aria-pressed', b.dataset.m === dlMode ? 'true' : 'false');
  });
  document.getElementById('dlpRowX').hidden = !slider;
  document.getElementById('dlpRowY').hidden = !slider;
  if (dlViewer) {
    dlViewer.ctr.enabled = !slider;
    if (slider) applyDlRot(); else dlFit(dlViewer);
  }
}
function syncDlSliderLabels() {
  const rx = document.getElementById('dlpRotX'), ry = document.getElementById('dlpRotY');
  document.getElementById('dlpRotXv').textContent = rx.value + '°';
  document.getElementById('dlpRotYv').textContent = ry.value + '°';
  // Screen readers announce range inputs as percentages by default — speak degrees
  rx.setAttribute('aria-valuetext', rx.value + ' degrees');
  ry.setAttribute('aria-valuetext', ry.value + ' degrees');
}
function applyDlRot() {
  syncDlSliderLabels();
  if (!dlViewer || !dlViewer.obj) return;
  const rx = +document.getElementById('dlpRotX').value;
  const ry = +document.getElementById('dlpRotY').value;
  // X = elevation (polar = 90 − X), Y = azimuth — camera orbit around centre
  dlOrbitTo(dlViewer, 90 - rx, ry);
}

// ---------- building-state hand-off: one dimmed overlay + centred orange loader ----------
// Tears the adjust panel down (captures are already taken) and shows the spinner,
// reusing the panel's scroll-lock so there's no double-darkened backdrop.
function enterBuildingState() {
  const panel = document.getElementById('dlPanel');
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    if (dlViewer) { dlViewer.destroy(); dlViewer = null; }
  }
  const ov = document.getElementById('kkOv');
  const wasOpen = ov.classList.contains('open');
  ov.classList.add('open', 'building');
  ov.setAttribute('aria-hidden', 'false');
  ov.scrollTop = 0;
  if (!wasOpen && !document.body.style.position) lockScroll(); // safety: lock if nothing holds it
}
function exitBuildingState() {
  const ov = document.getElementById('kkOv');
  ov.classList.remove('open', 'building');
  ov.setAttribute('aria-hidden', 'true');
  unlockScroll();
  if (_dlPrevFocus && _dlPrevFocus.focus) { try { _dlPrevFocus.focus(); } catch (e) { /* best-effort */ } }
}

// ---------- build the branded card ----------
async function buildProfileCard() {
  if (!dlViewer || !dlViewer.obj || !dlProduct) { kkToast('Model still loading…'); return; }
  // Pin this build to the viewer + product at click time — the user can close the
  // panel or switch profiles while the awaits below run, and a stale build must
  // never mix product A's data with product B's renders.
  const p = dlProduct;
  const v = dlViewer;
  const btn = document.getElementById('dlpBuild');
  btn.disabled = true;

  // Raster libs are normally already loaded (fetched when the panel opened); await
  // to be safe while the panel is still up, so a load failure leaves the panel intact.
  try {
    await ensureCardLibs();
  } catch (e) {
    kkToast('Couldn’t load the card builder — check your connection');
    btn.disabled = false;
    return;
  }

  if (v !== dlViewer || v.destroyed || !v.obj) { btn.disabled = false; return; } // panel closed/switched mid-load

  // A lost (browser-evicted) context renders nothing — the card would come out
  // blank. Rebuild instead and let the user hit the button again in a second.
  const gl = v.rnd.getContext();
  if (gl && gl.isContextLost && gl.isContextLost()) {
    kkToast('Restoring the 3D view — try again in a moment');
    dlRebuildViewer();
    btn.disabled = false;
    return;
  }

  try {
    // 1) hero = the user's adjusted angle — captured NOW, while the panel viewer is live
    const front = dlGrab(v);
    // 2) four axis-true orthographic elevations (own framing + neutral lighting);
    //    dlOrthoViews restores the renderer and never touches the user's camera
    const views = dlOrthoViews(v);
    if (!views) { btn.disabled = false; return; }
    // captures done → hand off to the single dimmed overlay + orange loader
    enterBuildingState();
    await new Promise(r => setTimeout(r, 30)); // let the loader paint before the heavy raster pass
    // 3) inline the cross-section spec SVG
    let svg = '';
    const specFile = specFileFor(p.id);
    try { svg = specFile ? await (await fetch('assets/specs/' + specFile)).text() : ''; } catch (e) { svg = ''; }
    if (!svg) svg = '<div style="color:#7E93A6;font-size:12px;padding:30px">schematic unavailable</div>';
    // 4) assemble the card DOM off-screen
    const card = document.createElement('div');
    card.className = 'kkcard';
    card.innerHTML = `
      <div class="ch">
        <img class="kk" src="assets/logo-transparent.png" alt="Kayu & Kov">
        <span class="sep"></span>
        <span class="tipwrap"><img src="assets/tipwood-logo-white.png" alt="Tipwood"><em>Profiles</em></span>
        <span class="badge">Exterior</span>
      </div>
      <div class="hero">
        <span class="tagview">Your view</span>
        <img src="${front}" alt="front view">
      </div>
      <div class="views">
        <div class="vw"><img src="${views.top}" alt="top view"><span>Top</span></div>
        <div class="vw"><img src="${views.bottom}" alt="bottom view"><span>Bottom</span></div>
        <div class="vw"><img src="${views.left}" alt="left view"><span>Left</span></div>
        <div class="vw"><img src="${views.right}" alt="right view"><span>Right</span></div>
      </div>
      <div class="info">
        <div class="nm">${p.name}</div>
        <div class="code">Code ${p.code}</div>
        <div class="pr">
          <div class="price">₹${p.price}<small> /RFT</small></div>
          <div class="size"><div class="k">Size</div><div class="v">${p.dimensions}</div></div>
        </div>
      </div>
      <div class="schem"><div class="lab">Cross-section</div><div class="svgbox">${svg}</div></div>
      <div class="cf"><span>Generated <b>${kkNowStamp()}</b></span><span><b>kayuandkov.com</b></span></div>`;
    const stage = document.getElementById('kkCardStage');
    stage.innerHTML = '';
    stage.appendChild(card);
    // wait for the images (logos + captured data-URLs) to be ready
    await Promise.all([...card.querySelectorAll('img')].map(im => im.complete ? 1 : new Promise(r => { im.onload = im.onerror = r; })));
    await new Promise(r => setTimeout(r, 120));
    // 5) rasterize at 2× for a crisp shareable image
    const canvas = await html2canvas(card, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
    stage.innerHTML = '';
    showCardOverlay(p, canvas, canvas.toDataURL('image/png'));
  } catch (e) {
    console.error('[card] build failed:', e);
    // If we'd already shown the loader, dismiss it back to the catalogue.
    if (document.getElementById('kkOv').classList.contains('building')) exitBuildingState();
    kkToast('Card build failed — please try again');
  } finally {
    btn.disabled = false;
  }
}

// ---------- card output overlay ----------
let _kkCanvas = null, _kkPng = null, _kkProduct = null;

function showCardOverlay(p, canvas, pngUrl) {
  _kkCanvas = canvas; _kkPng = pngUrl; _kkProduct = p;
  // We normally arrive here already in the building state (panel torn down, overlay
  // open showing the loader). Handle a direct call too: tear the panel down if it's up
  // so only ONE dimmed backdrop ever shows.
  const panel = document.getElementById('dlPanel');
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    if (dlViewer) { dlViewer.destroy(); dlViewer = null; }
  }
  document.getElementById('kkNote').value = '';
  kkCloseMailMenu(); // always start a fresh card on the share row, not the mail chooser
  const sideName = document.getElementById('kkSideName');
  const sideMeta = document.getElementById('kkSideMeta');
  const sideRows = document.getElementById('kkSideRows');
  if (sideName) sideName.textContent = p.name;
  if (sideMeta) sideMeta.textContent = `${p.dimensions} · ₹${formatPrice(p.price)}/RFT`;
  if (sideRows) {
    sideRows.innerHTML = '';
    [['Code', p.code], ['Category', (p.category || '').replace(/-/g, ' ')]].forEach(([k, val]) => {
      if (!val) return;
      const row = document.createElement('div');
      row.className = 'kkov-srow';
      const kEl = document.createElement('span'); kEl.textContent = k;
      const vEl = document.createElement('b'); vEl.textContent = val;
      row.append(kEl, vEl);
      sideRows.appendChild(row);
    });
  }
  document.getElementById('kkOvPreview').innerHTML = `<img src="${pngUrl}" alt="Branded card preview — ${p.name}">`;
  const ov = document.getElementById('kkOv');
  const wasOpen = ov.classList.contains('open');
  ov.classList.remove('building'); // swap the loader for the finished card
  ov.classList.add('open');
  ov.setAttribute('aria-hidden', 'false');
  ov.scrollTop = 0;
  if (!wasOpen && !document.body.style.position) lockScroll(); // lock only if nothing already holds it
  const x = document.getElementById('kkOvX');
  if (x) x.focus();
}
function closeCardOverlay() {
  const ov = document.getElementById('kkOv');
  if (!ov || !ov.classList.contains('open')) return;
  ov.classList.remove('open');
  ov.setAttribute('aria-hidden', 'true');
  kkCloseMailMenu(); // reset the mail chooser so the next open shows the share row
  unlockScroll();
  // The panel was torn down on hand-off, so return focus to the card that opened it.
  if (_dlPrevFocus && _dlPrevFocus.focus) { try { _dlPrevFocus.focus(); } catch (e) { /* best-effort */ } }
}

// ---------- actions: download / share ----------
// msg: custom confirmation toast; pass '' to stay silent (e.g. the share flow shows its own)
function kkDlData(url, name, msg) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (msg !== '') kkToast(msg || 'Saved to your Downloads folder');
}
function kkDownloadImage() {
  if (_kkPng && _kkProduct) kkDlData(_kkPng, kkFname(_kkProduct) + '.png', 'Image saved — it’s now in your Downloads folder');
}
function kkDownloadPDF() {
  if (!_kkCanvas || !_kkProduct) return;
  if (!window.jspdf) { kkToast('PDF library not loaded — check your connection'); return; }
  const { jsPDF } = window.jspdf;
  const w = _kkCanvas.width, h = _kkCanvas.height;
  const pdf = new jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'px', format: [w, h] });
  pdf.addImage(_kkPng, 'PNG', 0, 0, w, h);
  pdf.save(kkFname(_kkProduct) + '.pdf');
  kkToast('PDF saved — it’s now in your Downloads folder');
}
// Kayu & Kov enquiry contacts — every WhatsApp / Email share is addressed HERE.
const KK_WHATSAPP = '919036058030';        // +91 90360 58030 (wa.me needs country code, digits only)
const KK_EMAIL = 'info@kayuandkov.com';

let _kkSharing = false;
// The WhatsApp / Email buttons open a message ADDRESSED TO Kayu & Kov (an enquiry
// funnel), so we target wa.me/<number> and the chosen provider's compose window
// directly — the native share sheet can't fix the recipient.
// The message body for both channels. This is a customer→Kayu & Kov enquiry, so
// it deliberately does NOT reference attaching the card image: the company
// already has its own product card, and nobody needs to send it back to them.
function kkShareText() {
  const p = _kkProduct;
  const note = (document.getElementById('kkNote').value || '').trim();
  const details = `${p.name} — ${p.dimensions} — ₹${formatPrice(p.price)}\nTipwood Exterior Profile · Kayu & Kov\nkayuandkov.com`;
  return note ? `${note}\n\n${details}` : details;
}

function kkShare(kind) {
  const p = _kkProduct;
  if (!p || _kkSharing) return; // debounce double-taps (avoid opening two tabs)
  _kkSharing = true;
  setTimeout(() => { _kkSharing = false; }, 1200);

  if (kind === 'whatsapp') {
    window.open('https://wa.me/' + KK_WHATSAPP + '?text=' +
      encodeURIComponent('Hi Kayu & Kov, I’d like to enquire about this profile:\n\n' + kkShareText()), '_blank');
    kkToast('Opening WhatsApp…');
  }
}

// Open the chosen provider's real compose window, prefilled.
// A bare mailto: is unreliable: browsers only route it when a mail app or a
// registered handler exists, so on a desktop where mail lives in a browser tab
// it silently does nothing (and window.open leaves a dead blank tab). The
// webmail deep links below always work, so we let the sender pick.
function kkOpenMail(provider) {
  const p = _kkProduct;
  if (!p) return;
  const to = KK_EMAIL;
  const subject = 'Enquiry: ' + p.name + ' — ' + p.dimensions;
  const body = kkShareText();
  const su = encodeURIComponent(subject), bd = encodeURIComponent(body), t = encodeURIComponent(to);
  if (provider === 'gmail') {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${t}&su=${su}&body=${bd}`, '_blank');
    kkToast('Opening Gmail…');
  } else if (provider === 'outlook') {
    window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${t}&subject=${su}&body=${bd}`, '_blank');
    kkToast('Opening Outlook…');
  } else {
    // Same-tab navigation hands off to the OS handler without stranding a blank tab.
    window.location.href = `mailto:${to}?subject=${su}&body=${bd}`;
  }
  kkCloseMailMenu();
}

// Swap the share row (WhatsApp/Email/Close) for the mail-provider row, in place.
function kkOpenMailMenu() {
  const share = document.getElementById('kkShareRow');
  const mail = document.getElementById('kkMailRow');
  if (!share || !mail || !mail.hidden) return;
  share.hidden = true;
  mail.hidden = false;
  document.getElementById('kkActEmail').setAttribute('aria-expanded', 'true');
  const first = mail.querySelector('.kk-mailopt');
  if (first) first.focus();
}
function kkCloseMailMenu(focusEmail) {
  const share = document.getElementById('kkShareRow');
  const mail = document.getElementById('kkMailRow');
  if (!mail || mail.hidden) return;
  mail.hidden = true;
  if (share) share.hidden = false;
  const email = document.getElementById('kkActEmail');
  if (email) {
    email.setAttribute('aria-expanded', 'false');
    if (focusEmail) email.focus();
  }
}

// ---------- wiring (idempotent; index.html only — these nodes don't exist on gallery.html) ----------
(function initDownloadUI() {
  const seg = document.getElementById('dlpSeg');
  if (!seg) return;
  seg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    dlMode = b.dataset.m;
    syncDlMode();
  });
  document.getElementById('dlpRotX').addEventListener('input', applyDlRot);
  document.getElementById('dlpRotY').addEventListener('input', applyDlRot);
  document.getElementById('dlpReset').addEventListener('click', () => {
    if (dlMode === 'slider') {
      document.getElementById('dlpRotX').value = 20;
      document.getElementById('dlpRotY').value = 35;
      applyDlRot();
    } else if (dlViewer) {
      dlFit(dlViewer);
    }
  });
  document.getElementById('dlpBuild').addEventListener('click', buildProfileCard);
  document.getElementById('dlpClose').addEventListener('click', closeDownloadPanel);
  document.getElementById('dlPanel').addEventListener('click', e => {
    if (e.target.classList.contains('dlp-backdrop')) closeDownloadPanel();
  });
  document.getElementById('kkOvX').addEventListener('click', closeCardOverlay);
  document.getElementById('kkOv').addEventListener('click', e => {
    if (e.target.id === 'kkOv') closeCardOverlay();
  });
  document.getElementById('kkActImage').addEventListener('click', kkDownloadImage);
  document.getElementById('kkActPdf').addEventListener('click', kkDownloadPDF);
  document.getElementById('kkActWa').addEventListener('click', () => kkShare('whatsapp'));
  document.getElementById('kkActClose').addEventListener('click', closeCardOverlay);
  // Email swaps the share row in place for the provider chooser (covers nothing).
  document.getElementById('kkActEmail').addEventListener('click', kkOpenMailMenu);
  document.getElementById('kkMailBack').addEventListener('click', () => kkCloseMailMenu(true));
  document.getElementById('kkMailRow').addEventListener('click', e => {
    const b = e.target.closest('button[data-mail]');
    if (b) kkOpenMail(b.dataset.mail);
  });
  // Escape backs out of the chooser first (only then does it close the overlay).
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('kkMailRow').hidden) {
      e.stopPropagation();
      kkCloseMailMenu(true);
    }
  }, true);
  // brand/contact footer pinned at the bottom of the desktop side column —
  // derived from the share constants so there is a single source of truth
  const foot = document.getElementById('kkSideFoot');
  if (foot) foot.textContent = 'kayuandkov.com · +91 ' + KK_WHATSAPP.slice(2, 7) + ' ' + KK_WHATSAPP.slice(7) + ' · ' + KK_EMAIL;
})();
