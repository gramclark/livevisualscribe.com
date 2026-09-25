/* ==========================================================================
   Carousel engine + Image Lightbox (simplified, stable)
   Video = opens in new tab (no iframe complexity)
   ========================================================================== */

const DRIFT_SPEED = 0.25;
const RESUME_DELAY = 0;

/* ---------- helpers ---------- */

function getMediaLink(item) {
  return item.video || item.link || null;
}

/* ---------- carousel ---------- */

function makeFigure(data, item, realIndex) {
  const fig = document.createElement("figure");
  const img = document.createElement("img");

  img.src = data.folder + item.file;
  img.alt = item.caption || "";
  img.loading = "lazy";

  img.addEventListener("click", () => {
    handleItemClick(data, item, realIndex);
  });

  fig.appendChild(img);
  return fig;
}

function buildCarousel(container, data) {
  const shell = container.querySelector(".carousel-shell");
  const track = shell.querySelector(".carousel");
  const items = data.items;

  if (!items || items.length === 0) {
    track.classList.add("empty");
    const p = document.createElement("p");
    p.textContent =
      "Examples coming soon — drop pngs into images/work/" +
      data.folder.split("/").slice(-2, -1)[0] + "/";
    track.appendChild(p);
    return;
  }

  if (items.length === 1) {
    buildSingleFigure(shell, data, items[0]);
    return;
  }

  items.forEach((item, i) => track.appendChild(makeFigure(data, item, i)));

  for (let copy = 0; copy < 2; copy++) {
    items.forEach((item, i) => {
      const clone = makeFigure(data, item, i);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
  }

  initAutoDrift(container, track);
}

function buildSingleFigure(shell, data, item) {
  const wrap = document.createElement("div");
  wrap.className = "single-work";

  const fig = document.createElement("figure");
  const img = document.createElement("img");

  img.src = data.folder + item.file;
  img.alt = item.caption || "";
  img.loading = "lazy";

  img.addEventListener("click", () => {
    handleItemClick(data, item, 0);
  });

  fig.appendChild(img);
  wrap.appendChild(fig);
  shell.replaceWith(wrap);
}

/* ---------- click behavior (SIMPLE + RELIABLE) ---------- */

function handleItemClick(data, item, index) {
  const link = getMediaLink(item);

  // VIDEO → open externally (no iframe, no bugs)
  if (link) {
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }

  // IMAGE → open lightbox
  openLightbox(data, index);
}

/* ---------- auto drift ---------- */

function initAutoDrift(container, track) {
  const shell = container.querySelector(".carousel-shell") || container;

  let rafId = null;
  let resumeTimer = null;
  let setWidth = 0; // width of one full (non-duplicated) set of items

  function measure() {
    setWidth = track.scrollWidth / 3;
  }

  function centerIfNeeded() {
    // if we're not yet positioned in the middle copy (e.g. first load,
    // or content just finished loading/resizing), snap there with no
    // animation -- this is what gives room to drag either direction
    // right from the start
    if (setWidth > 0 && (track.scrollLeft < setWidth * 0.5 || track.scrollLeft > setWidth * 1.5)) {
      track.scrollLeft = setWidth;
    }
  }

  function drift() {
    track.scrollLeft += DRIFT_SPEED;

    if (setWidth > 0 && track.scrollLeft >= setWidth * 2) {
      track.scrollLeft -= setWidth;
    }

    rafId = requestAnimationFrame(drift);
  }

  function start() {
    if (rafId) return;
    measure();
    centerIfNeeded();
    rafId = requestAnimationFrame(drift);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function pauseThenResume(delay) {
    stop();
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(start, delay);
  }

  shell.addEventListener("mouseenter", stop);
  shell.addEventListener("mouseleave", () => pauseThenResume(1200));

  ["touchstart", "wheel", "pointerdown"].forEach(evt => {
    track.addEventListener(evt, () => pauseThenResume(RESUME_DELAY), {
      passive: true
    });
  });

  // dragging into either outer copy snaps back into the equivalent spot
  // in the middle copy, so the strip can be dragged forever either way
  track.addEventListener("scroll", () => {
    if (setWidth <= 0) return;

    if (track.scrollLeft >= setWidth * 2) track.scrollLeft -= setWidth;
    else if (track.scrollLeft <= 0) track.scrollLeft += setWidth;
  });

  measure();
  centerIfNeeded();

  window.addEventListener("resize", () => { measure(); centerIfNeeded(); });
  window.addEventListener("load", () => { measure(); centerIfNeeded(); });

  start();
}

/* ---------- IMAGE LIGHTBOX ONLY ---------- */

let lightboxState = { data: null, index: 0 };

function openLightbox(data, index) {
  lightboxState = { data, index };
  renderLightbox();
  openLightboxOverlay();
}

function stepLightbox(dir) {
  const { data } = lightboxState;
  if (!data) return;

  const count = data.items.length;
  lightboxState.index =
    ((lightboxState.index + dir) % count + count) % count;

  renderLightbox();
}

function renderLightbox() {
  const { data, index } = lightboxState;
  if (!data) return;

  const item = data.items[index];

  const img = document.getElementById("lightbox-img");
  const cap = document.getElementById("lightbox-caption");

  img.src = data.folder + item.file;
  img.alt = item.caption || "";
  cap.textContent = item.caption || "";

  const multi = data.items.length > 1;

  document.getElementById("lightbox-prev").style.display = multi ? "" : "none";
  document.getElementById("lightbox-next").style.display = multi ? "" : "none";
}

/* ---------- lightbox UI ---------- */

function openLightboxOverlay() {
  const lb = document.getElementById("lightbox");
  lb.classList.add("is-open");
  lb.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");

  lb.classList.remove("is-open");
  lb.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  lightboxState = { data: null, index: 0 };
}

function initLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;

  document
    .getElementById("lightbox-close")
    .addEventListener("click", closeLightbox);

  document
    .getElementById("lightbox-prev")
    .addEventListener("click", () => stepLightbox(-1));

  document
    .getElementById("lightbox-next")
    .addEventListener("click", () => stepLightbox(1));

  lb.addEventListener("click", e => {
    if (e.target === lb) closeLightbox();
  });

  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("is-open")) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
}

/* ---------- splash ---------- */

function buildSplashSlots() {
  const slots = document.querySelectorAll(".splash-band");
  if (!slots.length || !SPLASH_IMAGES?.length) return;

  slots.forEach((slot, i) => {
    const item = SPLASH_IMAGES[i];
    if (!item) return;
    const img = document.createElement("img");
    img.src = item.file;
    img.alt = item.alt || "";
    img.loading = "lazy";
    slot.appendChild(img);
  });

  initSplashReveal(slots);
}

function initSplashReveal(slots) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    slots.forEach(s => s.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  slots.forEach(s => observer.observe(s));
}

/* ---------- footer ---------- */

function setFooterPhoto() {
  const img = document.getElementById("footer-photo-img");
  if (img && typeof FOOTER_PHOTO !== "undefined") {
    img.src = FOOTER_PHOTO;
  }
}

/* ---------- boot ---------- */

document.addEventListener("DOMContentLoaded", () => {
  buildCarousel(document.getElementById("tier-live-analog"), GALLERY.liveAnalog);
  buildCarousel(document.getElementById("tier-live-digital"), GALLERY.liveDigital);
  buildCarousel(document.getElementById("tier-illustration"), GALLERY.illustration);
  buildCarousel(document.getElementById("tier-storyboard-video"), GALLERY.storyboardVideo);

  buildSplashSlots();
  setFooterPhoto();
  initLightbox();
});