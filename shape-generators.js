// ========== PARAMETERIZED SHAPE GENERATORS ==========
// Generic shape generators that take dimension data from profile-dimensions.json
// Each generator creates a THREE.Shape (or cylinder descriptor) from structured params.
// All measurements in millimeters.

const ShapeGenerators = {

  // =====================================================================
  // 1. RECTANGLE - Solid rectangular profile
  //    Used by: strip, sheet, solid-box, solid door profiles
  // =====================================================================
  rectangle(dims) {
    const { width: w, height: h } = dims.dimensions;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, h);
    shape.lineTo(0, h);
    shape.closePath();

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 2. HOLLOW RECTANGLE - Rectangle with rectangular holes
  //    Used by: hollow-box, hollow-strip, square, door profiles
  //    Supports: single holes, multiple chambers, X-bracing triangles
  // =====================================================================
  hollow_rectangle(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, h);
    shape.lineTo(0, h);
    shape.closePath();

    if (p.holes) {
      p.holes.forEach(hole => {
        if (hole.type === 'triangle' && hole.points) {
          // X-bracing triangular holes (e.g., 150x150 square)
          const tri = new THREE.Path();
          tri.moveTo(hole.points[0][0], hole.points[0][1]);
          for (let i = 1; i < hole.points.length; i++) {
            tri.lineTo(hole.points[i][0], hole.points[i][1]);
          }
          tri.closePath();
          shape.holes.push(tri);
        } else {
          // Standard rectangular hole
          const rect = new THREE.Path();
          rect.moveTo(hole.x, hole.y);
          rect.lineTo(hole.x + hole.width, hole.y);
          rect.lineTo(hole.x + hole.width, hole.y + hole.height);
          rect.lineTo(hole.x, hole.y + hole.height);
          rect.closePath();
          shape.holes.push(rect);
        }
      });
    }

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 3. ELLIPSE - Elliptical profile, optionally hollow
  //    Used by: louver 75x20 (hollow), solid louver 75x20 (solid)
  // =====================================================================
  ellipse(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;
    const segments = 32;

    const outerRx = w / 2;
    const outerRy = h / 2;

    const shape = new THREE.Shape();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = w / 2 + outerRx * Math.cos(angle);
      const y = h / 2 + outerRy * Math.sin(angle);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    // Add hollow center if specified
    if (p.hollow) {
      const wallT = p.wallThickness || 4;
      const marginX = p.innerMarginX || 2;
      const innerRx = outerRx - wallT - marginX;
      const innerRy = outerRy - wallT;

      const hole = new THREE.Path();
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = w / 2 + innerRx * Math.cos(angle);
        const y = h / 2 + innerRy * Math.sin(angle);
        if (i === 0) hole.moveTo(x, y);
        else hole.lineTo(x, y);
      }
      hole.closePath();
      shape.holes.push(hole);
    }

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth, type: 'elliptical' }
    };
  },

  // =====================================================================
  // 4. PILL - Capsule/pill shape with optional internal chambers
  //    Used by: louver 150x35 (with 4 rectangular chambers)
  // =====================================================================
  pill(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;
    const endR = p.endRadius || h / 2;
    const wallT = p.wallThickness || 4;
    const chambers = p.chambers || 0;
    const midWall = p.midWallThickness || 6;

    const shape = new THREE.Shape();

    // Outer pill/capsule shape
    shape.moveTo(endR, 0);
    shape.lineTo(w - endR, 0);
    shape.absarc(w - endR, endR, endR, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(endR, h);
    shape.absarc(endR, endR, endR, Math.PI / 2, 3 * Math.PI / 2, false);

    // Internal rectangular chambers
    if (chambers > 0) {
      const straightSection = w - 2 * endR;
      const totalInternalWalls = (chambers - 1) * midWall;
      const chamberW = (straightSection - 2 * wallT - totalInternalWalls) / chambers;
      const chamberH = h - 2 * wallT;

      for (let i = 0; i < chambers; i++) {
        const hole = new THREE.Path();
        const hx = endR + wallT + i * (chamberW + midWall);
        const hy = wallT;

        hole.moveTo(hx, hy);
        hole.lineTo(hx + chamberW, hy);
        hole.lineTo(hx + chamberW, hy + chamberH);
        hole.lineTo(hx, hy + chamberH);
        hole.closePath();
        shape.holes.push(hole);
      }
    }

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: {
        width: w, height: h, depth: dims.extrudeDepth,
        endRadius: endR, chambers: chambers
      }
    };
  },

  // =====================================================================
  // 5. CYLINDER_SOLID - Solid cylindrical rod
  //    Used by: rod profiles (25mm, 9mm, 8mm, 6mm)
  // =====================================================================
  cylinder_solid(dims) {
    const d = dims.dimensions.diameter;
    return {
      type: 'cylinder',
      radius: d / 2,
      height: dims.extrudeDepth,
      hollow: false,
      specs: { diameter: d, length: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 6. CYLINDER_HOLLOW - Hollow cylindrical pipe
  //    Used by: round-pipe (80mm, 150mm)
  // =====================================================================
  cylinder_hollow(dims) {
    const d = dims.dimensions.diameter;
    const wall = dims.dimensions.wallThickness || 10;
    return {
      type: 'cylinder',
      outerRadius: d / 2,
      innerRadius: d / 2 - wall,
      height: dims.extrudeDepth,
      hollow: true,
      specs: { diameter: d, wallThickness: wall, length: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 7. L_ANGLE - L-shaped angle bracket
  //    Used by: l-angle (30x30x4, 40x40x4)
  // =====================================================================
  l_angle(dims) {
    const { width: w, height: h, thickness: t } = dims.dimensions;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, t);
    shape.lineTo(t, t);
    shape.lineTo(t, h);
    shape.lineTo(0, h);
    shape.closePath();

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth, thickness: t }
    };
  },

  // =====================================================================
  // 8. C_CHANNEL - Open C-shaped bracket profile
  //    Used by: c-channel (50x50x6, 100x30x16, 100x30x6, 84x30x6)
  //    Supports: rounded inner corners
  // =====================================================================
  c_channel(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;
    const wallT = p.wallThickness || 6;
    const flangeDepth = p.flangeDepth || wallT;
    const rounded = p.rounded || false;
    const cornerR = p.cornerRadius || 6;

    const shape = new THREE.Shape();

    if (rounded) {
      // Rounded inner corners variant (e.g., 84x30x6)
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, wallT);
      shape.lineTo(wallT + cornerR, wallT);
      shape.quadraticCurveTo(wallT, wallT, wallT, wallT + cornerR);
      shape.lineTo(wallT, h - wallT - cornerR);
      shape.quadraticCurveTo(wallT, h - wallT, wallT + cornerR, h - wallT);
      shape.lineTo(w, h - wallT);
      shape.lineTo(w, h);
      shape.lineTo(0, h);
      shape.closePath();
    } else {
      // Standard C-channel (open on right side)
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, wallT);
      shape.lineTo(flangeDepth, wallT);
      shape.lineTo(flangeDepth, h - wallT);
      shape.lineTo(w, h - wallT);
      shape.lineTo(w, h);
      shape.lineTo(0, h);
      shape.closePath();
    }

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth, thickness: wallT }
    };
  },

  // =====================================================================
  // 9. I_BEAM - I/H shaped structural beam
  //    Used by: i-beam (38x6mm)
  // =====================================================================
  i_beam(dims) {
    const { width: w, height: totalH } = dims.dimensions;
    const p = dims.params;
    const flangeH = p.flangeThickness || 2;
    const webT = p.webThickness || 4;
    const webX = (w - webT) / 2;

    const shape = new THREE.Shape();
    // Bottom flange
    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, flangeH);
    // Step in to web (right)
    shape.lineTo(webX + webT, flangeH);
    shape.lineTo(webX + webT, totalH - flangeH);
    // Top flange
    shape.lineTo(w, totalH - flangeH);
    shape.lineTo(w, totalH);
    shape.lineTo(0, totalH);
    shape.lineTo(0, totalH - flangeH);
    // Step in to web (left)
    shape.lineTo(webX, totalH - flangeH);
    shape.lineTo(webX, flangeH);
    shape.lineTo(0, flangeH);
    shape.closePath();

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: totalH, depth: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 10. FLUTED - Wave humps on flat base
  //     Used by: fluted (145x18mm, 4 humps)
  // =====================================================================
  fluted(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;
    const baseH = p.baseThickness || 8;
    const humpCount = p.humpCount || 4;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, baseH);

    const humpW = w / humpCount;
    for (let i = 0; i < humpCount; i++) {
      const startX = i * humpW;
      const peakX = startX + humpW / 2;
      const endX = startX + humpW;

      shape.quadraticCurveTo(startX + humpW * 0.25, h, peakX, h);
      shape.quadraticCurveTo(startX + humpW * 0.75, h, endX, baseH);
    }

    shape.lineTo(w, 0);
    shape.closePath();

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 11. SERRATED - Rectangular teeth on flat base
  //     Used by: serrated (100x20mm)
  // =====================================================================
  serrated(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;
    const toothW = p.toothWidth || 10;
    const toothH = p.toothHeight || 4;
    const gapW = p.gapWidth || 3;
    const baseH = p.baseHeight || (h - toothH);

    const teethCount = Math.floor(w / toothW);

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, baseH);

    for (let i = 0; i < teethCount; i++) {
      const x = i * toothW;
      const toothStart = x + (gapW / 2);
      const toothEnd = x + toothW - (gapW / 2);

      shape.lineTo(toothStart, baseH);
      shape.lineTo(toothStart, h);
      shape.lineTo(toothEnd, h);
      shape.lineTo(toothEnd, baseH);
    }

    shape.lineTo(w, baseH);
    shape.lineTo(w, 0);
    shape.closePath();

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 12. CLADDING - Tongue and groove interlocking panel
  //     Used by: cladding (112x15, 58x15, 98x15)
  // =====================================================================
  cladding(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;
    const tongueL = p.tongueLeft || w * 0.13;
    const tongueR = p.tongueRight || w * 0.08;
    const stepH = p.stepHeight || 6;
    const grooveW = p.grooveWidth || 5;

    const shape = new THREE.Shape();
    // Left tongue (lower step)
    shape.moveTo(0, 0);
    shape.lineTo(tongueL, 0);
    shape.lineTo(tongueL, stepH);
    // Left groove
    shape.lineTo(tongueL + grooveW, stepH);
    shape.lineTo(tongueL + grooveW, 0);
    // Main body bottom
    shape.lineTo(w - tongueR - grooveW, 0);
    shape.lineTo(w - tongueR - grooveW, stepH);
    // Right groove
    shape.lineTo(w - tongueR, stepH);
    shape.lineTo(w - tongueR, 0);
    // Right tongue
    shape.lineTo(w, 0);
    shape.lineTo(w, h - stepH);
    // Top edge
    shape.lineTo(0, h - stepH);
    shape.closePath();

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 13. STEPPED - L-shaped stepped profile
  //     Used by: door-frame (85x31), single-door-frame (85x31)
  // =====================================================================
  stepped(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;
    const stepX = p.stepX || 61;
    const stepY = p.stepY || 11;
    const dir = p.stepDirection || 'top-right';

    const shape = new THREE.Shape();

    if (dir === 'top-right') {
      // Main L-shaped profile: full width at bottom, step at top-right
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(stepX, h);
      shape.lineTo(stepX, h - stepY);
      shape.lineTo(0, h - stepY);
      shape.closePath();
    } else {
      // Fallback: simple step
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(stepX, h);
      shape.lineTo(stepX, stepY);
      shape.lineTo(0, stepY);
      shape.closePath();
    }

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth }
    };
  },

  // =====================================================================
  // 14. RAILING - Dome/arch shaped top with narrow stem
  //     Used by: railing (65x32.5mm)
  // =====================================================================
  railing(dims) {
    const { width: w, height: h } = dims.dimensions;
    const p = dims.params;
    const sideMargin = p.sideMargin || 7.5;
    const stemW = p.stemWidth || 20;
    const stemHRatio = p.stemHeightRatio || 0.4;
    const stemH = h * stemHRatio;
    const domeH = h - stemH;
    const stemX = (w - stemW) / 2;

    const shape = new THREE.Shape();
    shape.moveTo(stemX, 0);
    shape.lineTo(stemX + stemW, 0);
    shape.lineTo(stemX + stemW, stemH);
    // Right side widens to dome
    shape.lineTo(w - sideMargin, stemH);
    // Dome arc (right side up)
    shape.quadraticCurveTo(w, stemH + domeH * 0.5, w - sideMargin, h);
    shape.lineTo(sideMargin, h);
    // Dome arc (left side down)
    shape.quadraticCurveTo(0, stemH + domeH * 0.5, sideMargin, stemH);
    // Left side back to stem
    shape.lineTo(stemX, stemH);
    shape.closePath();

    return {
      shape,
      depth: dims.extrudeDepth,
      specs: { width: w, height: h, depth: dims.extrudeDepth }
    };
  }
};

// ========== MESH FACTORY ==========
// Creates a THREE.Mesh from profile dimension data

function createProfileMesh(profileDims, material) {
  const generator = ShapeGenerators[profileDims.shapeType];
  if (!generator) {
    console.warn(`No generator for shape type: ${profileDims.shapeType}`);
    // Fallback to rectangle
    return createProfileMesh(
      { ...profileDims, shapeType: 'rectangle' },
      material
    );
  }

  const profileData = generator(profileDims);

  let mesh;

  if (profileData.type === 'cylinder') {
    if (profileData.hollow) {
      // Hollow pipe via extruded annular shape
      const tubeShape = new THREE.Shape();
      tubeShape.absarc(0, 0, profileData.outerRadius, 0, Math.PI * 2, false);
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, profileData.innerRadius, 0, Math.PI * 2, true);
      tubeShape.holes.push(holePath);

      const geometry = new THREE.ExtrudeGeometry(tubeShape, {
        depth: profileData.height,
        bevelEnabled: false
      });
      geometry.rotateX(Math.PI / 2);
      mesh = new THREE.Mesh(geometry, material);
    } else {
      // Solid rod
      const geometry = new THREE.CylinderGeometry(
        profileData.radius, profileData.radius, profileData.height, 32
      );
      mesh = new THREE.Mesh(geometry, material);
    }
  } else {
    // Extruded profile shape
    const geometry = new THREE.ExtrudeGeometry(profileData.shape, {
      depth: profileData.depth,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.3,
      bevelSegments: 2
    });
    mesh = new THREE.Mesh(geometry, material);
  }

  // Center the mesh
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  mesh.geometry.translate(-center.x, -center.y, -center.z);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return { mesh, profileData };
}

// Export for module usage
if (typeof module !== 'undefined') {
  module.exports = { ShapeGenerators, createProfileMesh };
}
