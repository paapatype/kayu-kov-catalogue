// ========== PROFILE SPECIFICATIONS FROM PDF ANALYSIS ==========
// Each profile is defined with exact measurements from the 2D technical drawings
// All dimensions in millimeters (mm)

const PROFILE_SPECS = {
  // ============ FLUTED PROFILE (Page 1 & 6) ============
  // 145 x 18mm - 4 rounded wave humps
  // Cross-section shows: R6.5 curves, 35mm spacing, 9mm valleys, base 8mm
  'fluted': {
    defaultWidth: 145,
    defaultHeight: 18,
    baseThickness: 8,
    humpCount: 4,
    humpSpacing: 35, // ~35mm per hump
    humpRadius: 6.5, // R6.5 curves
    valleyDepth: 9,
    description: '4 rounded wave humps on flat base'
  },

  // ============ HOLLOW BOX (Page 1, 2, 5, 6) ============
  // 100 x 50mm - Rectangle with 8mm walls
  // 150 x 25mm - Has internal dividers (page 2 shows: 15|20.5|35|5|4|35|20.5|15mm)
  // 150 x 50mm - Large hollow box
  'hollow-box': {
    wallThickness: 8,
    // For 150x25mm variant with internal chambers:
    internalDividers: [15, 20.5, 35, 5, 4, 35, 20.5, 15], // widths across 150mm
    description: 'Rectangular tube with hollow center'
  },

  // ============ CLADDING (Page 1, 2 & 6, 7) ============
  // 112 x 15mm - Tongue and groove interlocking panel
  // Cross-section shows: 14.3mm | 36.3mm | 36.3mm | 9mm edges, 15mm height
  // 58 x 15mm and 98 x 15mm variants
  'cladding': {
    defaultHeight: 15,
    edgeStep: 6, // step height on edges
    tongueWidth: 14.3,
    mainSections: [14.3, 36.3, 36.3, 9], // for 112mm width
    description: 'Interlocking panel with tongue/groove edges'
  },

  // ============ C-CHANNEL (Page 1, 4 & 6, 9) ============
  // 50 x 50 x 6mm - Square C-channel
  // 100 x 30 x 16mm - Wide shallow C-channel (16mm flange depth)
  // 100 x 30 x 6mm - Wide C-channel
  // 84 x 30 x 6mm - Medium C-channel
  'c-channel': {
    wallThickness: 6,
    // Format: width x height x thickness (or flange depth for some)
    description: 'Open C-shaped bracket profile'
  },

  // ============ ROD (Page 1, 4 & 6, 9) ============
  // Solid cylinders: 25mm, 9mm, 8mm, 6mm diameter
  'rod': {
    description: 'Solid cylindrical rod'
  },

  // ============ SERRATED (Page 1 & 6) ============
  // 100 x 20mm - Rectangular teeth on top
  // Teeth: 10mm wide, 4mm tall, spaced evenly
  'serrated': {
    defaultWidth: 100,
    defaultHeight: 20,
    toothWidth: 10,
    toothHeight: 4,
    toothCount: 10,
    baseHeight: 16, // 20 - 4 = 16mm base
    description: 'Rectangular serrated teeth on flat base'
  },

  // ============ STRIP (Page 3 & 8) ============
  // Solid rectangles: 50x25, 55x10, 80x11, 40x20, 45x10, 80x6, 60x6
  'strip': {
    description: 'Solid rectangular bar'
  },

  // ============ SHEET (Page 1-3 & 6-8) ============
  // Thin flat plates: 100x8, 100x10, 100x12, 150x8, 150x10, 150x12, 100x6, 200x11, 200x7, 400x11, 400x7
  'sheet': {
    description: 'Thin flat rectangular plate'
  },

  // ============ LOUVER (Page 2, 4 & 7, 9) ============
  // 150 x 35mm - Has 4 internal hollow chambers!
  // Cross-section shows: outer rounded shape with 4 vertical gaps inside
  // 75 x 20mm - Smaller version, also hollow
  'louver': {
    defaultWidth: 150,
    defaultHeight: 35,
    wallThickness: 4,
    chamberCount: 4,
    // Internal structure: rounded exterior with 4 hollow chambers
    endRadius: 10, // rounded ends
    description: 'Rounded profile with 4 internal hollow chambers'
  },

  // ============ DOOR PROFILE (Page 2, 3 & 7, 8) ============
  // 100 x 20mm - 3 vertical channels (6mm wide each)
  // 100 x 20 x 6mm - Similar with 6mm walls
  // 85 x 31mm - Door frame profile
  'door': {
    channelWidth: 6,
    channelCount: 3,
    wallThickness: 6,
    description: 'Rectangular profile with internal channels'
  },

  // ============ SOLID BOX (Page 2 & 7) ============
  // 150 x 25mm - Solid filled rectangle
  'solid-box': {
    description: 'Solid filled rectangular bar'
  },

  // ============ L-ANGLE (Page 4 & 9) ============
  // 30 x 30 x 4mm and 40 x 40 x 4mm
  'l-angle': {
    wallThickness: 4,
    description: 'L-shaped angle bracket'
  },

  // ============ ROUND PIPE (Page 4, 5 & 9, 10) ============
  // 80 x 10mm - 80mm diameter, 10mm wall
  // 150 x 10mm - 150mm diameter, 10mm wall
  'round-pipe': {
    description: 'Hollow cylindrical pipe'
  },

  // ============ SQUARE PROFILE (Page 4, 5 & 9, 10) ============
  // 50 x 50 x 6mm - Hollow square tube
  // 100 x 100 x 8mm - Larger hollow square
  // 150 x 150mm - Large square (wall ~10mm based on PDF)
  'square': {
    description: 'Hollow square tube'
  },

  // ============ I-BEAM (Page 4 & 9) ============
  // 38 x 6mm - 38mm wide, 6mm flange thickness
  // Total height approximately equals width
  'i-beam': {
    description: 'I/H shaped structural beam'
  },

  // ============ RAILING (Page 5 & 10) ============
  // 65 x 32.5mm - T-shaped top with narrow stem
  // Stem width ~15mm, top section ~50mm wide with rounded edges
  'railing': {
    defaultWidth: 65,
    defaultHeight: 32.5,
    stemWidth: 15,
    topWidth: 50,
    topHeight: 10,
    description: 'T-shaped railing with rounded top'
  }
};

// Export for use in main app
if (typeof module !== 'undefined') {
  module.exports = PROFILE_SPECS;
}
