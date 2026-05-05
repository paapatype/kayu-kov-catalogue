// ===== Gallery — Kayu & Kov =====

let activeCategory = 'all';
let filteredItems = [...galleryItems];
let lightboxIndex = -1;

// Featured items — first item of each category gets a wider card on "All" view
const featuredIds = new Set([1, 33, 53, 68, 94]);

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  renderFilters();
  renderGallery();
  initScrollTop();
});

// ========== FILTERS ==========
function renderFilters() {
  const scroll = document.getElementById('galleryFilterScroll');
  scroll.innerHTML = galleryCategories.map(cat =>
    `<button class="gallery-filter-btn${cat.id === activeCategory ? ' active' : ''}"
       data-category="${cat.id}">${cat.name}</button>`
  ).join('');

  scroll.addEventListener('click', (e) => {
    const btn = e.target.closest('.gallery-filter-btn');
    if (!btn) return;
    activeCategory = btn.dataset.category;
    scroll.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGallery();
  });
}

// ========== GALLERY GRID ==========
function renderGallery() {
  filteredItems = activeCategory === 'all'
    ? [...galleryItems]
    : galleryItems.filter(item => item.category === activeCategory);

  const grid = document.getElementById('galleryGrid');

  if (filteredItems.length === 0) {
    grid.innerHTML = `
      <div class="gallery-empty">
        <h3>No items found</h3>
        <p>Try selecting a different category.</p>
      </div>`;
    document.getElementById('galleryCount').innerHTML = '';
    return;
  }

  document.getElementById('galleryCount').innerHTML =
    `<span>${filteredItems.length}</span> ${filteredItems.length === 1 ? 'image' : 'images'}`;

  grid.innerHTML = filteredItems.map((item, i) => {
    const isFeatured = featuredIds.has(item.id) && activeCategory === 'all';
    const catLabel = galleryCategories.find(c => c.id === item.category)?.name || item.category;
    const delay = Math.min(i * 0.04, 0.4);

    return `
      <article class="gallery-card${isFeatured ? ' featured' : ''}"
        onclick="openLightbox(${i})"
        style="animation-delay: ${delay}s">
        <div class="gallery-card-image">
          ${imageMarkup(item)}
        </div>
        <div class="gallery-card-info">
          <div class="gallery-card-category">${catLabel}</div>
          <div class="gallery-card-title">${item.title}</div>
        </div>
      </article>`;
  }).join('');
}

// Returns either an <img> or a placeholder depending on whether the image file exists
function imageMarkup(item) {
  // Use a real <img> tag — if the file is missing the onerror shows a placeholder
  return `<img src="${item.image}" alt="${item.title}"
    loading="lazy"
    onerror="this.outerHTML = placeholderHTML('${item.title}')">`;
}

// Placeholder SVG + label for missing images
function placeholderHTML(label) {
  return `<div class='gallery-card-placeholder'>
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.2'>
      <rect x='3' y='3' width='18' height='18' rx='2'/>
      <circle cx='8.5' cy='8.5' r='1.5'/>
      <path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/>
    </svg>
    <span>${label}</span>
  </div>`;
}

// ========== LIGHTBOX ==========
function openLightbox(index) {
  lightboxIndex = index;
  const item = filteredItems[index];
  if (!item) return;

  const wrap = document.getElementById('lightboxImageWrap');
  const catLabel = galleryCategories.find(c => c.id === item.category)?.name || item.category;

  // Try loading the image; fall back to placeholder
  wrap.innerHTML = `<img class="lightbox-image" src="${item.image}" alt="${item.title}"
    onerror="this.outerHTML = lightboxPlaceholderHTML()">`;

  document.getElementById('lbTitle').textContent = item.title;
  document.getElementById('lbMeta').textContent = catLabel;

  document.getElementById('lbPrev').style.display = index > 0 ? '' : 'none';
  document.getElementById('lbNext').style.display = index < filteredItems.length - 1 ? '' : 'none';

  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function lightboxPlaceholderHTML() {
  return `<div class='lightbox-placeholder'>
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.2' width='48' height='48'>
      <rect x='3' y='3' width='18' height='18' rx='2'/>
      <circle cx='8.5' cy='8.5' r='1.5'/>
      <path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/>
    </svg>
    <span>Image placeholder — replace with final photo</span>
  </div>`;
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function navigateLightbox(dir) {
  const next = lightboxIndex + dir;
  if (next >= 0 && next < filteredItems.length) {
    openLightbox(next);
  }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  const lb = document.getElementById('lightbox');
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

// ========== SCROLL TO TOP ==========
function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
