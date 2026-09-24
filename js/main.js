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

  items.forEach((item, i) => {
    const clone = makeFigure(data, item, i);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });

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
  let setWidth = 0;

  function measure() {
    setWidth = track.scrollWidth / 2;
  }

  function drift() {
    track.scrollLeft += DRIFT_SPEED;

    if (setWidth > 0 && track.scrollLeft >= setWidth) {
      track.scrollLeft -= setWidth;
    }

    rafId = requestAnimationFrame(drift);
  }

  function start() {
    if (rafId) return;
    measure();
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

  track.addEventListener("scroll", () => {
    if (setWidth <= 0) return;

    if (track.scrollLeft >= setWidth) track.scrollLeft -= setWidth;
    else if (track.scrollLeft < 0) track.scrollLeft += setWidth;
  });

  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);

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

function buildSplash() {
  const el = document.getElementById("splash-block");
  if (!el || !SPLASH_IMAGES?.length) return;

  const first = SPLASH_IMAGES[0];

  el.innerHTML = `
    <figure>
      <img src="${first.file}" alt="${first.caption || ""}">
      ${first.caption ? `<figcaption>${first.caption}</figcaption>` : ""}
    </figure>
  `;
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

  buildSplash();
  setFooterPhoto();
  initLightbox();
});