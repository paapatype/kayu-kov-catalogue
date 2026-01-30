// Kayu & Kov 2025 - Mobile Catalogue
// Data-driven 3D product viewer using profile-dimensions.json + shape-generators.js
// All measurements in millimeters matching PDF specifications exactly (123kayu.pdf)

// ========== PROFILE DIMENSIONS LOADER ==========
// Loaded from profile-dimensions.json via fetch, with inline fallback

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
    // Fallback: build minimal dimension map from products array
    profileDimensions = {};
    products.forEach(p => {
      profileDimensions[p.id] = {
        id: p.id,
        name: p.name,
        code: p.code,
        category: p.category,
        price: p.price,
        shapeType: categoryToShapeType(p.category),
        dimensions: parseDimensionString(p.dimensions),
        params: {},
        extrudeDepth: 60,
        verified: false
      };
    });
    return profileDimensions;
  }
}

// Fallback helper: map category to shape type
function categoryToShapeType(category) {
  const map = {
    'sheet': 'rectangle',
    'strip': 'rectangle',
    'solid-box': 'rectangle',
    'hollow-box': 'hollow_rectangle',
    'hollow-strip': 'hollow_rectangle',
    'square': 'hollow_rectangle',
    'door': 'hollow_rectangle',
    'louver': 'pill',
    'solid-louver': 'ellipse',
    'rod': 'cylinder_solid',
    'round-pipe': 'cylinder_hollow',
    'l-angle': 'l_angle',
    'c-channel': 'c_channel',
    'i-beam': 'i_beam',
    'fluted': 'fluted',
    'serrated': 'serrated',
    'cladding': 'cladding',
    'railing': 'railing'
  };
  return map[category] || 'rectangle';
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

// ========== QA VERIFICATION SYSTEM ==========

const qaVerifier = {
  toleranceMM: 0.5,
  results: new Map(),

  verify(mesh, productId, expectedSpecs) {
    if (!mesh || !mesh.geometry) {
      return { passed: false, error: 'Invalid mesh' };
    }

    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;

    const actual = {
      x: Math.abs(box.max.x - box.min.x),
      y: Math.abs(box.max.y - box.min.y),
      z: Math.abs(box.max.z - box.min.z)
    };

    const checks = [];
    let allPassed = true;

    if (expectedSpecs.width) {
      const diff = Math.abs(actual.x - expectedSpecs.width);
      const passed = diff <= this.toleranceMM;
      if (!passed) allPassed = false;
      checks.push({
        axis: 'X (Width)', expected: expectedSpecs.width,
        actual: actual.x.toFixed(2), diff: diff.toFixed(2), passed
      });
    }

    if (expectedSpecs.height) {
      const diff = Math.abs(actual.y - expectedSpecs.height);
      const passed = diff <= this.toleranceMM;
      if (!passed) allPassed = false;
      checks.push({
        axis: 'Y (Height)', expected: expectedSpecs.height,
        actual: actual.y.toFixed(2), diff: diff.toFixed(2), passed
      });
    }

    if (expectedSpecs.depth) {
      const diff = Math.abs(actual.z - expectedSpecs.depth);
      const passed = diff <= this.toleranceMM;
      if (!passed) allPassed = false;
      checks.push({
        axis: 'Z (Depth)', expected: expectedSpecs.depth,
        actual: actual.z.toFixed(2), diff: diff.toFixed(2), passed
      });
    }

    // Check diameter for cylindrical profiles
    if (expectedSpecs.diameter) {
      const measuredD = Math.max(actual.x, actual.z);
      const diff = Math.abs(measuredD - expectedSpecs.diameter);
      const passed = diff <= this.toleranceMM;
      if (!passed) allPassed = false;
      checks.push({
        axis: 'Diameter', expected: expectedSpecs.diameter,
        actual: measuredD.toFixed(2), diff: diff.toFixed(2), passed
      });
    }

    const result = { productId, passed: allPassed, checks, timestamp: Date.now() };
    this.results.set(productId, result);
    return result;
  },

  getReport() {
    const all = Array.from(this.results.values());
    return {
      total: all.length,
      passed: all.filter(r => r.passed).length,
      failed: all.filter(r => !r.passed).length,
      details: all
    };
  }
};

// ========== THREE.JS SCENE MANAGEMENT ==========

const viewers = new Map();

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

  // Check WebGL availability
  if (!isWebGLAvailable()) {
    console.warn('[3D] WebGL not available on this device');
    showFallbackPlaceholder(container, productId);
    return null;
  }

  console.log(`[3D] Prerequisites OK for product ${productId}`);

  // Ensure container has dimensions
  let containerRect = container.getBoundingClientRect();
  if (containerRect.width === 0 || containerRect.height === 0) {
    // Force layout calculation
    container.style.minHeight = '200px';
    containerRect = container.getBoundingClientRect();
  }

  const width = containerRect.width || 300;
  const height = containerRect.height || 200;

  // Validate dimensions
  if (width < 10 || height < 10) {
    console.warn(`Container too small: ${width}x${height}`);
    showFallbackPlaceholder(container, productId);
    return null;
  }

  // Look up profile dimensions from loaded data
  const dims = profileDimensions ? profileDimensions[productId] : null;

  if (!dims) {
    console.warn(`No profile dimensions for product ${productId}`);
    showViewerError(container, 'Profile data missing');
    return null;
  }

  // Wrap everything in try-catch for robust error handling
  try {
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A2634);

    // Create camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    // Create renderer with error handling
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) {
      console.error('WebGL renderer creation failed:', e);
      showFallbackPlaceholder(container, productId);
      return null;
    }

    // Check if context was actually created
    if (!renderer.getContext()) {
      console.error('WebGL context is null');
      renderer.dispose();
      showFallbackPlaceholder(container, productId);
      return null;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Handle WebGL context loss - show placeholder instead of white box
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.warn(`[3D] WebGL context lost for product ${productId}`);
      if (animationId) cancelAnimationFrame(animationId);

      // Hide canvas and show placeholder
      renderer.domElement.style.display = 'none';
      const lostPlaceholder = document.createElement('div');
      lostPlaceholder.className = 'viewer-paused context-lost';
      lostPlaceholder.innerHTML = '<span>3D paused</span>';
      container.appendChild(lostPlaceholder);
    });

    renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log(`[3D] WebGL context restored for product ${productId}`);
      // Remove placeholder and show canvas
      container.querySelector('.context-lost')?.remove();
      renderer.domElement.style.display = '';
      animate();
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xE8833A, 0.3);
    fillLight.position.set(-50, 50, -50);
    scene.add(fillLight);

    // Material - Wood appearance
    const material = new THREE.MeshStandardMaterial({
      color: 0xA67C52,
      roughness: 0.7,
      metalness: 0.1
    });

    // Generate mesh from profile dimensions using shape generators
    console.log(`[3D] Generating mesh for product ${productId}, shapeType: ${dims.shapeType}`);
    let mesh, profileData;
    try {
      const result = createProfileMesh(dims, material);
      mesh = result.mesh;
      profileData = result.profileData;
      console.log(`[3D] Mesh generated successfully for product ${productId}`);
    } catch (e) {
      console.error(`[3D] Mesh generation failed for product ${productId}:`, e);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      showViewerError(container, 'Shape generation failed');
      return null;
    }

    if (!mesh || !mesh.geometry) {
      console.error(`Invalid mesh for product ${productId}`);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      showViewerError(container, 'Invalid 3D model');
      return null;
    }

    scene.add(mesh);

    // Position camera to fit object
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;

    if (!box || !box.min || !box.max) {
      console.error(`Invalid bounding box for product ${productId}`);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      showViewerError(container, 'Model bounds error');
      return null;
    }

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim === 0 || !isFinite(maxDim)) {
      console.error(`Invalid model dimensions for product ${productId}`);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      showViewerError(container, 'Invalid dimensions');
      return null;
    }

    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 0.68;
    camera.position.set(cameraZ * 0.7, cameraZ * 0.5, cameraZ * 0.7);
    camera.lookAt(0, 0, 0);

    // OrbitControls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1;

    controls.addEventListener('start', () => {
      controls.autoRotate = false;
    });

    // QA Verification
    if (profileData && profileData.specs) {
      const qaResult = qaVerifier.verify(mesh, productId, profileData.specs);
      if (!qaResult.passed) {
        console.warn(`QA FAIL for product ${productId}:`, qaResult.checks);
      }
    }

    // Animation loop
    let animationId;
    let isDestroyed = false;

    function animate() {
      if (isDestroyed) return;
      animationId = requestAnimationFrame(animate);
      controls.update();
      try {
        renderer.render(scene, camera);
      } catch (e) {
        console.error('Render error:', e);
        cancelAnimationFrame(animationId);
      }
    }
    animate();

    // Handle resize
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

    console.log(`[3D] Viewer created successfully for product ${productId}`);

    return {
      scene, camera, renderer, controls, mesh,
      destroy: () => {
        isDestroyed = true;
        if (animationId) cancelAnimationFrame(animationId);
        resizeObserver.disconnect();
        controls.dispose();

        // Dispose geometry and material
        if (mesh) {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) mesh.material.dispose();
        }

        // Force lose context to free up WebGL resources immediately
        const gl = renderer.getContext();
        if (gl) {
          const ext = gl.getExtension('WEBGL_lose_context');
          if (ext) ext.loseContext();
        }

        renderer.dispose();

        // Remove canvas and any placeholders
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
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
  const dims = profileDimensions ? profileDimensions[product.id] : null;
  const verified = dims && dims.verified;
  const verifiedBadge = verified
    ? '<span class="verified-badge" title="Dimensions verified">&#10003;</span>'
    : '';

  return `
    <article class="product-card" data-id="${product.id}" data-category="${product.category}">
      <div class="card-header" onclick="openModal(${product.id})">
        <span class="serial-badge">${product.id}</span>
        <span class="category-tag">${formatCategory(product.category)} ${verifiedBadge}</span>
      </div>
      <h3 class="product-name" onclick="openModal(${product.id})">${product.name}</h3>
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
    // Only animate on hover/touch to save resources
    const MAX_ACTIVE_VIEWERS = 8;
    const activeViewerQueue = [];
    const pendingCreation = new Set();
    const snapshotCache = new Map();

    const viewerContainers = document.querySelectorAll('.profile-3d-viewer');

    function captureSnapshot(viewer, productId) {
      try {
        viewer.renderer.render(viewer.scene, viewer.camera);
        const dataUrl = viewer.renderer.domElement.toDataURL('image/png');
        snapshotCache.set(productId, dataUrl);
        return dataUrl;
      } catch (e) {
        console.warn(`[3D] Could not capture snapshot for ${productId}:`, e);
        return null;
      }
    }

    function showSnapshot(container, productId) {
      const dataUrl = snapshotCache.get(productId);
      if (dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'viewer-snapshot';
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
            if (!showSnapshot(oldContainer, oldestId)) {
              const placeholder = document.createElement('div');
              placeholder.className = 'viewer-paused';
              placeholder.innerHTML = '<span>Scroll to load</span>';
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

  // Get dimension details from JSON
  const dims = profileDimensions ? profileDimensions[productId] : null;
  const shapeInfo = dims
    ? `<div class="detail-row">
        <span class="detail-label">Shape Type</span>
        <span class="detail-value">${dims.shapeType.replace(/_/g, ' ')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Verified</span>
        <span class="detail-value">${dims.verified ? 'Yes' : 'Pending'}</span>
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
    <div class="modal-details">
      <div class="detail-row">
        <span class="detail-label">Dimensions</span>
        <span class="detail-value">${product.dimensions}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Product Code</span>
        <span class="detail-value code">${product.code}</span>
      </div>
      ${shapeInfo}
      <div class="detail-row">
        <span class="price-label">/RFT</span>
        <span class="detail-value price">&#8377;${formatPrice(product.price)}</span>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Use requestAnimationFrame + setTimeout for reliable container dimensions
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

// ========== QA CONSOLE COMMAND ==========

window.runQAReport = function() {
  const report = qaVerifier.getReport();
  console.log('=== QA VERIFICATION REPORT ===');
  console.log(`Total: ${report.total} | Passed: ${report.passed} | Failed: ${report.failed}`);
  report.details.forEach(d => {
    console.log(`Product ${d.productId}: ${d.passed ? 'PASS' : 'FAIL'}`);
    d.checks.forEach(c => {
      console.log(`  ${c.axis}: Expected ${c.expected}mm, Got ${c.actual}mm (diff: ${c.diff}mm) ${c.passed ? 'PASS' : 'FAIL'}`);
    });
  });
  return report;
};

// ========== INIT ==========

async function init() {
  // Load profile dimensions from JSON first
  await loadProfileDimensions();

  // Check if Three.js loaded
  const threeReady = typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined';

  if (!threeReady) {
    console.error('Three.js or OrbitControls not loaded - 3D viewers will show fallbacks');
  }

  // Then render the UI
  renderProducts(products);
  document.querySelector('.category-scroll').addEventListener('click', handleCategoryClick);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  createScrollToTop();

  console.log(`Kayu & Kov Catalogue: ${products.length} products loaded`);
  console.log(`Profile dimensions: ${profileDimensions ? Object.keys(profileDimensions).length : 0} profiles`);
  console.log(`3D rendering: ${threeReady ? 'enabled' : 'DISABLED - libraries not loaded'}`);
  if (threeReady) {
    console.log('Run window.runQAReport() in console to see QA verification results');
  }
}

document.addEventListener('DOMContentLoaded', init);
