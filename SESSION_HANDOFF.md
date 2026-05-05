# Kayu & Kov Catalogue — Session Handoff

Drop this file into a new Claude Code session to pick up where we left off.

---

## Project Location

```
/Users/paapatype/Desktop/Sanks Repo/kayu-kov-catalogue
```

- Git remote: `https://github.com/paapatype/kayu-kov-catalogue.git`
- Branch: `main`
- Live deploy (GitHub Pages): https://paapatype.github.io/kayu-kov-catalogue/index.html

---

## How to Run Locally

The catalogue **must** be served over HTTP — opening `index.html` via `file://` will silently fail to load the OBJ 3D models because browsers block local file XHR/fetch requests for security reasons.

Start a local server from the project root:

```bash
cd "/Users/paapatype/Desktop/Sanks Repo/kayu-kov-catalogue"
python3 -m http.server 8080
```

Then open: **http://localhost:8080**

If port 8080 is taken:
```bash
# kill whatever is on 8080
kill $(lsof -ti :8080 -sTCP:LISTEN)
# or pick a different port
python3 -m http.server 3001
```

**Always hard-refresh** (`Cmd+Shift+R`) after code changes — the browser aggressively caches `app.js` and the OBJ files.

---

## What Was Done in This Session

### Problem
The user uploaded a new set of OBJ 3D model files into `assets/models/` with descriptive filenames (e.g., `profile_01_fluted_145x18.obj`), but the existing code in `app.js` was looking for files named `profile_01.obj`, `profile_02.obj`, etc. As a result, no 3D shapes loaded.

### Fix
Updated `app.js` (around line 289) to map each product ID to its actual descriptive OBJ filename via a lookup object `objFileNames`. The path construction now resolves to the real filenames on disk.

**Before:**
```js
const objPath = `assets/models/profile_${String(productId).padStart(2, '0')}.obj`;
```

**After:**
```js
const objFileNames = {
  1: 'profile_01_fluted_145x18.obj',
  2: 'profile_02_hollow_box_100x50.obj',
  // ... all 55 entries
  55: 'profile_55_round_pipe_150x10.obj'
};
const objFile = objFileNames[productId] || `profile_${String(productId).padStart(2, '0')}.obj`;
const objPath = `assets/models/${objFile}`;
```

The fallback to the old simple naming scheme is kept in case any product ID isn't in the map.

---

## Full OBJ Filename Mapping (Product ID → File)

| ID | Product | OBJ File |
|----|---------|----------|
| 1 | Fluted Profile-3 | `profile_01_fluted_145x18.obj` |
| 2 | Hollow Box Profile | `profile_02_hollow_box_100x50.obj` |
| 3 | Cladding Profile | `profile_03_cladding_112x15.obj` |
| 4 | C Channel Profile | `profile_04_C_channel_50x50x6.obj` |
| 5 | Rod Profile | `profile_05_rod_25mm.obj` |
| 6 | C Channel Profile | `profile_06_C_channel_100x30x16.obj` |
| 7 | Serrated Profile | `profile_07_serrated_100x20.obj` |
| 8 | Strip | `profile_08_strip_50x25.obj` |
| 9 | Sheet Profile | `profile_09_sheet_100x8.obj` |
| 10 | Sheet Profile | `profile_10_sheet_100x10.obj` |
| 11 | Sheet Profile | `profile_11_sheet_100x12.obj` |
| 12 | Sheet Profile | `profile_12_sheet_150x8.obj` |
| 13 | Sheet Profile | `profile_13_sheet_150x10.obj` |
| 14 | Sheet Profile | `profile_14_sheet_150x12.obj` |
| 15 | Cladding Profile | `profile_15_cladding_58x15.obj` |
| 16 | Cladding Profile | `profile_16_cladding_98x15.obj` |
| 17 | Louver | `profile_17_louver_150x35.obj` |
| 18 | Hollow Box | `profile_18_hollow_box_150x25.obj` |
| 19 | Solid Box | `profile_19_solid_box_150x25.obj` |
| 20 | Door Profile | `profile_20_door_100x20.obj` |
| 21 | Door Profile | `profile_21_door_100x20x6.obj` |
| 22 | Door Profile Solid | `profile_22_door_solid_100x20.obj` |
| 23 | Door Profile | `profile_23_door_85x31.obj` |
| 24 | Door Frame Profile | `profile_24_door_frame_85x31.obj` |
| 25 | Single Door Frame | `profile_25_single_door_frame_85x31.obj` |
| 26 | Sheet Profile | `profile_26_sheet_100x6.obj` |
| 27 | Sheet Profile | `profile_27_sheet_200x11.obj` |
| 28 | Sheet Profile | `profile_28_sheet_200x7.obj` |
| 29 | Sheet Profile | `profile_29_sheet_400x11.obj` |
| 30 | Sheet Profile | `profile_30_sheet_400x7.obj` |
| 31 | Strip | `profile_31_strip_55x10.obj` |
| 32 | Strip Profile | `profile_32_strip_80x11.obj` |
| 33 | Strip | `profile_33_strip_40x20.obj` |
| 34 | Hollow Strip Profile | `profile_34_hollow_strip_40x20.obj` |
| 35 | Hollow Strip | `profile_35_hollow_strip_50x25.obj` |
| 36 | Strip | `profile_36_strip_45x10.obj` |
| 37 | L-Angle | `profile_37_L-angle_30x30x4.obj` |
| 38 | L-Angle | `profile_38_L-angle_40x40x4.obj` |
| 39 | Louver | `profile_39_louver_75x20.obj` |
| 40 | Solid Louver | `profile_40_solid_louver_75x20.obj` |
| 41 | Round Pipe | `profile_41_round_pipe_80x10.obj` |
| 42 | C-Channel | `profile_42_C-channel_100x30x6.obj` |
| 43 | C-Channel | `profile_43_C-channel_84x30x6.obj` |
| 44 | I-Beam Profile | `profile_44_I-beam_38x6.obj` |
| 45 | Rod Profile | `profile_45_rod_9mm.obj` |
| 46 | Rod Profile | `profile_46_rod_8mm.obj` |
| 47 | Rod Profile | `profile_47_rod_6mm.obj` |
| 48 | Square Profile | `profile_48_square_50x50x6.obj` |
| 49 | Strip Profile | `profile_49_strip_80x6.obj` |
| 50 | Square Profile | `profile_50_square_100x100x8.obj` |
| 51 | Square Box Profile | `profile_51_square_box_150x150.obj` |
| 52 | Strip Profile | `profile_52_strip_60x6.obj` |
| 53 | Railing Profile | `profile_53_railing_65x32.5.obj` |
| 54 | Hollow Box Profile | `profile_54_hollow_box_150x50.obj` |
| 55 | Round Pipe Profile | `profile_55_round_pipe_150x10.obj` |

---

## Project Structure (relevant files)

```
kayu-kov-catalogue/
├── index.html              # main catalogue page
├── gallery.html            # gallery page
├── preview.html            # preview viewer
├── visualiser.html         # visualiser
├── app.js                  # 3D viewer + product render logic (UPDATED)
├── data.js                 # the 55 product entries
├── gallery-data.js
├── gallery.js
├── styles.css
├── gallery.css
├── profile-dimensions.json # product metadata
├── profile-specs.js
├── shape-generators.js
├── assets/
│   ├── logo*.png/svg
│   ├── models/             # 55 designer OBJ files (descriptive names)
│   ├── specs/              # cross-section SVGs (profile_01_spec.svg etc.)
│   ├── profiles/
│   └── gallery/
└── SESSION_HANDOFF.md      # this file
```

---

## How the 3D Viewer Works

- Three.js r128 (loaded from CDN) + `OrbitControls` + `OBJLoader`
- Each product card has a `.profile-3d-viewer` div, lazy-loaded via `IntersectionObserver`
- Max active viewers cap: 4 on mobile, 8 on desktop. When the cap is exceeded, the oldest viewer is destroyed and replaced with a cached PNG snapshot of its last frame
- All OBJ meshes get a shared `MeshStandardMaterial` (color `0xA67C52`, roughness 0.7) — wood appearance
- OBJ models are scaled `*1000` because they were exported in metres from Blender and the scene is in millimetres
- Camera auto-fits to model bounding box after load
- WebGL context loss is handled — falls back to a snapshot or spinner
- Auto-rotate enabled only on hover (desktop) or touch (mobile)

Key function: `create3DViewer(container, productId)` in `app.js` (around line 129).

---

## Git State at End of Session

- On branch `main`, in sync with `origin/main` at commit `0809f57`
- **Uncommitted local changes:**
  - `assets/specs/profile_01_spec.svg` (modified — pre-existing before this session)
  - `app.js` (modified this session — OBJ filename mapping fix)
  - New OBJ files in `assets/models/` (uploaded by user this session, replacing the old `profile_NN.obj` files)
- Untracked: `.DS_Store`, `.vscode/`, `SESSION_HANDOFF.md` (this file)

The user has **not** asked to commit or push yet. When they do, the relevant changes are:
1. The new OBJ files in `assets/models/`
2. The `app.js` filename-mapping update

---

## Known Gotchas

1. **`file://` doesn't work** — must serve via HTTP (browser security blocks XHR for OBJ files).
2. **Browser caching is aggressive** — always `Cmd+Shift+R` after editing `app.js` or model files.
3. **Server port collisions** — if `localhost:8080` already has something on it, kill it with `kill $(lsof -ti :8080 -sTCP:LISTEN)` first, or use a different port.
4. **Old OBJ filenames are gone** — only the new descriptive filenames exist on disk now. The fallback in `app.js` to `profile_NN.obj` will never resolve, but it's kept defensively.
5. **GitHub Pages cache** — the live site at `paapatype.github.io/kayu-kov-catalogue` may serve stale content until a hard refresh after a push.

---

## Picking Up From Here

To resume work in a new Claude Code session, paste this file's contents (or just say "read SESSION_HANDOFF.md") and ask Claude to:

- Start the local server (`python3 -m http.server 8080` from the project root)
- Open `http://localhost:8080`
- Continue from whatever the next task is

If the 3D models aren't showing:
1. Confirm the server is running (`lsof -i :8080`)
2. Hard refresh the browser
3. Open DevTools → Console — look for `[3D]` log lines and any 404s on `assets/models/profile_*.obj`
4. Verify the filename mapping in `app.js` matches what's actually in `assets/models/`
