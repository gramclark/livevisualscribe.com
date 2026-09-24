/* ==========================================================================
   Carousel engine
   - Builds each tier's <figure> list from gallery-data.js, duplicated once
     so the strip can loop continuously and seamlessly
   - Scrolls smoothly and continuously (not a step-and-snap), looping
     forever: once it scrolls past the first full set, it silently drops
     back by exactly one set's width -- since the second set is an
     identical copy, that reset is invisible
   - Hovering (desktop) or touching/dragging (mobile) pauses it
     immediately; it quietly resumes a few seconds after you stop
   - Clicking any work image opens it fullscreen in a lightbox with
     prev/next navigation through that tier's real images; items with a
     "video" field open a video popup instead
   ========================================================================== */

const DRIFT_SPEED = 0.6;        // px per frame while auto-scrolling
const RESUME_DELAY = 3000;      // ms of no interaction before autoplay resumes

function makeFigure(data, item, realIndex) {
  const fig = document.createElement("figure");
  const img = document.createElement("img");
  img.src = data.folder + item.file;
  img.alt = item.caption || "";
  img.loading = "lazy";
  img.addEventListener("click", () => {
    if (item.video) openVideoLightbox(item);
    else openLightbox(data, realIndex);
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
    p.textContent = "Examples coming soon — drop pngs into images/work/" +
      data.folder.split("/").slice(-2, -1)[0] + "/";
    track.appendChild(p);
    return;
  }

  if (items.length === 1) {
    buildSingleFigure(shell, data, items[0]);
    return;
  }

  items.forEach((item, i) => track.appendChild(makeFigure(data, item, i)));

  // duplicate the whole set once, back to back, so the strip can drift
  // continuously and loop back to 0 the instant it crosses into the
  // (identical) copy -- invisible to the eye
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
    if (item.video) openVideoLightbox(item);
    else openLightbox(data, 0);
  });
  fig.appendChild(img);
  wrap.appendChild(fig);
  shell.replaceWith(wrap);
}

function initAutoDrift(container, track) {
  const shell = container.querySelector(".carousel-shell") || container;
  let playing = true;
  let rafId = null;
  let resumeTimer = null;
  let setWidth = 0; // width of one full (non-duplicated) set, computed below

  function measure() {
    // half of the scrollable width, since the content is duplicated once
    setWidth = track.scrollWidth / 2;
  }

  function drift() {
    if (!playing) return;
    track.scrollLeft += DRIFT_SPEED;
    if (setWidth > 0 && track.scrollLeft >= setWidth) {
      track.scrollLeft -= setWidth;
    }
    rafId = requestAnimationFrame(drift);
  }

  function start() {
    if (rafId) return;
    measure();
    playing = true;
    rafId = requestAnimationFrame(drift);
  }

  function stop() {
    playing = false;
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
    track.addEventListener(evt, () => pauseThenResume(RESUME_DELAY), { passive: true });
  });

  // if a manual drag carries scrollLeft past one set's width (or negative),
  // wrap it the same way the auto-drift does, so dragging can go on forever
  track.addEventListener("scroll", () => {
    if (setWidth <= 0) return;
    if (track.scrollLeft >= setWidth) track.scrollLeft -= setWidth;
    else if (track.scrollLeft < 0) track.scrollLeft += setWidth;
  }, { passive: true });

  window.addEventListener("resize", measure);
  // images loading changes scrollWidth, so re-measure once everything settles
  window.addEventListener("load", measure);

  start();
}

/* ---------- image lightbox ---------- */

let lightboxState = { data: null, index: 0 };

function openLightbox(data, index) {
  lightboxState = { data, index };
  renderLightbox();
  showLightboxMode("image");
  openLightboxOverlay();
}

function stepLightbox(dir) {
  const { data } = lightboxState;
  if (!data) return;
  const count = data.items.length;
  lightboxState.index = ((lightboxState.index + dir) % count + count) % count;
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

/* ---------- video lightbox ---------- */

function openVideoLightbox(item) {
  const iframe = document.getElementById("lightbox-video-frame");
  const cap = document.getElementById("lightbox-caption");
  iframe.src = item.video + (item.video.includes("?") ? "&" : "?") + "autoplay=1";
  cap.textContent = item.caption || "";
  document.getElementById("lightbox-prev").style.display = "none";
  document.getElementById("lightbox-next").style.display = "none";
  showLightboxMode("video");
  openLightboxOverlay();
}

function showLightboxMode(mode) {
  document.getElementById("lightbox-img").style.display = mode === "image" ? "" : "none";
  document.getElementById("lightbox-video").style.display = mode === "video" ? "" : "none";
}

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
  document.getElementById("lightbox-video-frame").src = ""; // stop any playing video
  lightboxState = { data: null, index: 0 };
}

function initLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev").addEventListener("click", () => stepLightbox(-1));
  document.getElementById("lightbox-next").addEventListener("click", () => stepLightbox(1));

  lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });

  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft" && lightboxState.data) stepLightbox(-1);
    if (e.key === "ArrowRight" && lightboxState.data) stepLightbox(1);
  });
}

function buildSplash() {
  const el = document.getElementById("splash-block");
  if (!el || !SPLASH_IMAGES || SPLASH_IMAGES.length === 0) return;
  const first = SPLASH_IMAGES[0];
  el.innerHTML = `
    <figure>
      <img src="${first.file}" alt="${first.caption || ""}">
      ${first.caption ? `<figcaption>${first.caption}</figcaption>` : ""}
    </figure>`;
}

function setFooterPhoto() {
  const img = document.getElementById("footer-photo-img");
  if (img && typeof FOOTER_PHOTO !== "undefined") {
    img.src = FOOTER_PHOTO;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  buildCarousel(document.getElementById("tier-live-analog"), GALLERY.liveAnalog);
  buildCarousel(document.getElementById("tier-live-digital"), GALLERY.liveDigital);
  buildCarousel(document.getElementById("tier-illustration"), GALLERY.illustration);
  buildCarousel(document.getElementById("tier-storyboard-video"), GALLERY.storyboardVideo);
  buildSplash();
  setFooterPhoto();
  initLightbox();
});
