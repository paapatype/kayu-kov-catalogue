const galleryItems = [
  // ===== CONSTRUCTION — Facade, cladding, screens, louvers =====
  // PDF page 2 — Modern villa with vertical fins and cladding panels
  { id: 1,  title: "Villa Facade with Vertical Fins",     category: "construction", application: "Cladding",       image: "assets/gallery/construction-01.jpg" },
  { id: 2,  title: "Facade Cladding Detail",              category: "construction", application: "Cladding",       image: "assets/gallery/construction-02.jpg" },
  // PDF page 3 — Fence/gate detail, apartment horizontal louver screens
  { id: 3,  title: "Boundary Fence & Glass Facade",       category: "construction", application: "Fence",          image: "assets/gallery/construction-03.jpg" },
  { id: 4,  title: "Apartment Louver Screens",            category: "construction", application: "Screen",         image: "assets/gallery/construction-04.jpg" },
  // PDF page 4 — Facade cladding with window screens
  { id: 5,  title: "Cladding Panel Facade",               category: "construction", application: "Cladding",       image: "assets/gallery/construction-05.jpg" },
  // PDF page 5 — Tall vertical fin screen
  { id: 6,  title: "Vertical Fin Privacy Screen",         category: "construction", application: "Screen",         image: "assets/gallery/construction-06.jpg" },
  // PDF page 10 — Modern building with louver accents
  { id: 7,  title: "Louver Accent Facade",                category: "construction", application: "Louver",         image: "assets/gallery/construction-07.jpg" },
  // PDF page 13 — Building with vertical louver screens
  { id: 8,  title: "Vertical Louver Facade",              category: "construction", application: "Louver",         image: "assets/gallery/construction-08.jpg" },
  // PDF page 15 — Facades with vertical fins and gate
  { id: 9,  title: "Fins & Balcony Screen",               category: "construction", application: "Screen",         image: "assets/gallery/construction-09.jpg" },
  { id: 10, title: "Full Cladding Elevation",             category: "construction", application: "Cladding",       image: "assets/gallery/construction-10.jpg" },
  // PDF page 17 — Facades with vertical fins and cladding
  { id: 11, title: "Fin Screen with Gate",                category: "construction", application: "Screen",         image: "assets/gallery/construction-11.jpg" },
  { id: 12, title: "Floor-to-Roof Cladding",              category: "construction", application: "Cladding",       image: "assets/gallery/construction-12.jpg" },
  // PDF page 18 left — Roofing louver structure
  { id: 13, title: "Roofing Louver Structure",            category: "construction", application: "Roofing",        image: "assets/gallery/construction-13.jpg" },
  // PDF page 19 — Facades day and night
  { id: 14, title: "Facade with Gate & Fins",             category: "construction", application: "Cladding",       image: "assets/gallery/construction-14.jpg" },
  { id: 15, title: "Louver Screen at Night",              category: "construction", application: "Screen",         image: "assets/gallery/construction-15.jpg" },
  // PDF page 20 — Villa at dusk with louver shutters
  { id: 16, title: "Villa at Dusk — Window Shutters",     category: "construction", application: "Window",         image: "assets/gallery/construction-16.jpg" },
  // PDF page 22 — Louver shutters with planter
  { id: 17, title: "Louver Shutters with Planter",        category: "construction", application: "Louver",         image: "assets/gallery/construction-17.jpg" },
  // PDF page 23 — Louver shutters closeup and building facade
  { id: 18, title: "Window Shutter Detail",               category: "construction", application: "Window",         image: "assets/gallery/construction-18.jpg" },
  { id: 19, title: "Cascading Louver Facade",             category: "construction", application: "Louver",         image: "assets/gallery/construction-19.jpg" },

  // ===== LANDSCAPING — Pergolas, fences, screens, pool enclosures =====
  // PDF page 7 — Pergola structures
  { id: 20, title: "Pergola Canopy",                      category: "landscaping",  application: "Pergola",        image: "assets/gallery/landscaping-01.jpg" },
  { id: 21, title: "Pergola Top View",                    category: "landscaping",  application: "Pergola",        image: "assets/gallery/landscaping-02.jpg" },
  // PDF page 8 — Rooftop pergola with bench, underside detail
  { id: 22, title: "Rooftop Pergola & Bench",             category: "landscaping",  application: "Pergola",        image: "assets/gallery/landscaping-03.jpg" },
  { id: 23, title: "Pergola Underside Detail",            category: "landscaping",  application: "Pergola",        image: "assets/gallery/landscaping-04.jpg" },
  // PDF page 9 — Louver privacy wall, pool enclosure
  { id: 24, title: "Louver Privacy Wall",                 category: "landscaping",  application: "Screen",         image: "assets/gallery/landscaping-05.jpg" },
  { id: 25, title: "Pool Enclosure",                      category: "landscaping",  application: "Structure",      image: "assets/gallery/landscaping-06.jpg" },
  // PDF page 12 — Aerial pergola views
  { id: 26, title: "Garden Pergola — Aerial",             category: "landscaping",  application: "Pergola",        image: "assets/gallery/landscaping-07.jpg" },
  { id: 27, title: "Garden Pergola — Wide View",          category: "landscaping",  application: "Pergola",        image: "assets/gallery/landscaping-08.jpg" },
  // PDF page 14 — Restaurant facade screen
  { id: 28, title: "Restaurant Fin Screen",               category: "landscaping",  application: "Screen",         image: "assets/gallery/landscaping-09.jpg" },
  // PDF page 11 — Trellis/pergola detail
  { id: 29, title: "Trellis Detail",                      category: "landscaping",  application: "Trellis",        image: "assets/gallery/landscaping-10.jpg" },

  // ===== FURNITURE — Patio benches, tables, planters =====
  // PDF page 18 right — Rooftop patio furniture
  { id: 30, title: "Rooftop Patio Set",                   category: "furniture",    application: "Patio",          image: "assets/gallery/furniture-01.jpg" },
  // PDF page 21 — Patio furniture detail
  { id: 31, title: "Patio Bench & Planters",              category: "furniture",    application: "Bench",          image: "assets/gallery/furniture-02.jpg" },
];

const galleryCategories = [
  { id: "all",          name: "All" },
  { id: "landscaping",  name: "Landscaping" },
  { id: "construction", name: "Construction" },
  { id: "furniture",    name: "Furniture" },
];
