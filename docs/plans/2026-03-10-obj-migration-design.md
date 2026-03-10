# OBJ Migration Design — Replace All 55 Procedural Shapes with Designer OBJ Files

## Problem
The current catalogue generates 3D shapes procedurally (shape-generators.js). These don't match the designer's actual Blender models. We have all 55 OBJ files ready to replace them.

## Source Files
- Location: `/Desktop/GD4/Kayu and Kov/3D_models_obj/`
- Naming: `profile_01_fluted_145x18.obj` → `profile_55_round_pipe_150x10.obj`
- Format: Blender 5.0.1, ASCII OBJ, Y-up, metres scale
- Total size: ~540KB (ranges from 900B for sheets to 121KB for louver)

## Architecture: Before → After

```
BEFORE (dual-path):
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│ product ID  │────▶│ OBJ_MODEL_OVERRIDES │──▶│ OBJLoader path │
│             │     │ (only product 17)   │   └────────────────┘
│             │     └──────────────────┘
│             │            │ (miss)
│             │            ▼
│             │     ┌──────────────────┐     ┌────────────────────┐
│             │────▶│ profile-dimensions│────▶│ shape-generators.js│
│             │     │ .json (shapeType)│     │ (15 generators)    │
└─────────────┘     └──────────────────┘     └────────────────────┘

AFTER (single-path):
┌─────────────┐     ┌──────────────────────┐     ┌────────────────┐
│ product ID  │────▶│ OBJ_MODEL_MAP        │────▶│ OBJLoader      │
│             │     │ { 1: 'profile_01.obj' │     │ scale ×1000    │
│             │     │   2: 'profile_02.obj' │     │ center         │
│             │     │   ...55 entries }     │     │ auto-fit camera│
└─────────────┘     └──────────────────────┘     └────────────────┘
```

## File Changes

### 1. assets/models/ — Copy & rename 55 OBJs
From: `profile_01_fluted_145x18.obj`
To:   `assets/models/profile_01.obj`
(strip descriptive suffix — product ID is the key)

### 2. app.js — Unified OBJ loading
- Build `OBJ_MODEL_MAP` mapping all 55 product IDs to OBJ filenames
- Replace dual-path `create3DViewer()` with single OBJ path:
  1. Load OBJ via THREE.OBJLoader
  2. Apply wood material to all meshes
  3. Scale ×1000 (Blender metres → mm)
  4. No rotation (Y-up matches Three.js)
  5. Center via bounding box
  6. Auto-fit camera: `cameraZ = maxDim / sin(fov/2) * 0.68`
  7. OrbitControls with auto-rotate on hover
- Remove: procedural generation branch, QA verifier, shape type routing

### 3. index.html — No changes
OBJLoader CDN already loaded. All other scripts stay.

### 4. Files that become unused
- shape-generators.js (15 procedural generators)
- profile-specs.js
- profile-dimensions.json shape params (keep for product metadata)

## OBJ Loading Pipeline Detail

```javascript
// For every product:
loader.load(`assets/models/profile_${id}.obj`, (object) => {
  // 1. Apply wood material
  object.traverse(child => {
    if (child.isMesh) child.material = woodMaterial;
  });

  // 2. Scale: Blender metres → mm
  object.scale.set(1000, 1000, 1000);

  // 3. No rotation needed (OBJ Y-up = Three.js Y-up)

  // 4. Center at origin
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  // 5. Auto-fit camera
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const cameraZ = maxDim / Math.sin(fov / 2) * 0.68;
  camera.position.set(cameraZ * 0.7, cameraZ * 0.5, cameraZ * 0.7);
});
```

## Performance (no changes needed)
- Lazy loading via IntersectionObserver (100px rootMargin)
- Max 8 concurrent WebGL contexts
- Snapshot caching: frozen PNG of destroyed viewers for instant scroll-back
- Deferred creation: requestAnimationFrame + 100ms setTimeout
- ResizeObserver for responsive canvas

## What stays identical
- Product data (data.js) — names, codes, prices, categories
- UI — search, filters, pagination, modal detail view
- Lighting — ambient (0.5) + directional (0.8) + fill orange (0.3)
- Material — wood brown 0xA67C52, roughness 0.7, metalness 0.1
- Controls — OrbitControls, damping, auto-rotate on hover
- WebGL context loss handling
- Mobile responsiveness
