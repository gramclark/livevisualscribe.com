/* ==========================================================================
   Carousel engine + Image Lightbox (simplified, stable)
   Video = opens in new tab (no iframe complexity)
   ========================================================================== */

const DRIFT_SPEED = 0.25;
const RESUME_DELAY = 1500;   // ms of no touching/scrolling before the drift resumes

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
  // known aspect ratio keeps every figure's width stable before lazy images load
  // (needed so the three copies of the strip line up exactly)
  if (item.ar) img.style.aspectRatio = item.ar;
  else img.addEventListener("load", () => {
    if (!img.style.aspectRatio && img.naturalWidth) img.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
  });

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
  const kids = track.children;
  const n = kids.length / 3;                       // items in one copy of the strip
  const L = i => kids[i].offsetLeft - kids[0].offsetLeft;   // left edge of figure i

  let pos = 0;            // our own float position (browsers round scrollLeft)
  let expected = 0;       // what scrollLeft read back after our last write
  let raf = null, last = 0;
  let lastUser = -1e9;    // time of the visitor's last touch/scroll/hover
  let hovering = false;

  const markUser = () => { lastUser = performance.now(); };

  function setPos(v) {
    track.scrollLeft = v;
    expected = track.scrollLeft;
    pos = expected;
  }

  function indexAt(x) {
    let i = 0;
    while (i < kids.length - 1 && L(i + 1) <= x) i++;
    return i;
  }

  // The strip is three identical copies. If we drift into the 3rd (or drag into
  // the 1st), hop exactly one copy to the matching figure in the middle copy.
  // Mapping by figure (not by a fixed width) means the hop is always seamless.
  function wrap() {
    const x = track.scrollLeft;
    if (x >= L(2 * n)) {
      const i = indexAt(x);
      setPos(L(i - n) + (x - L(i)));
    } else if (x < L(n) - 0.5) {
      const i = indexAt(x);
      setPos(L(i + n) + (x - L(i)));
    }
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(ts - last, 50) : 16.7;
    last = ts;
    if (hovering || performance.now() - lastUser < RESUME_DELAY) return;
    pos += DRIFT_SPEED * (dt / 16.7);
    track.scrollLeft = pos;
    expected = track.scrollLeft;
    wrap();
  }

  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

  // visitor input: never fight it; drift resumes RESUME_DELAY ms after they stop
  ["touchstart", "touchend", "pointerdown", "pointerup", "wheel"].forEach(evt =>
    track.addEventListener(evt, markUser, { passive: true })
  );
  shell.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") hovering = true; });
  shell.addEventListener("pointerleave", () => { hovering = false; markUser(); });

  // any scroll we didn't cause is the visitor scrolling: adopt it, keep looping
  track.addEventListener("scroll", () => {
    if (Math.abs(track.scrollLeft - expected) > 1.5) {
      markUser();
      pos = expected = track.scrollLeft;
      wrap();
    }
  }, { passive: true });

  // start in the middle copy so there is room to drag either direction
  setPos(L(n));
  window.addEventListener("load", () => {
    if (performance.now() - lastUser > 1000) setPos(L(n));   // layout settled; re-center once
  });
  window.addEventListener("resize", () => requestAnimationFrame(wrap));

  // don't drift until this strip is on screen (page stays calm on first load)
  new IntersectionObserver(entries => {
    entries.forEach(entry => (entry.isIntersecting ? start() : stop()));
  }, { threshold: 0.15 }).observe(shell);
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

function buildPolaroid(item) {
  const polaroid = document.createElement("div");
  polaroid.className = "polaroid";
  const frame = document.createElement("div");
  frame.className = "polaroid-frame";
  const img = document.createElement("img");
  img.src = item.file;
  img.alt = item.caption || "";
  img.loading = "lazy";
  frame.appendChild(img);
  polaroid.appendChild(frame);
  return polaroid;
}

function buildSplashSlots() {
  if (!SPLASH_IMAGES) return;

  // the two single "title, polaroid, strip" compositions
  const digitalSlot = document.getElementById("splash-digital");
  if (digitalSlot && SPLASH_IMAGES.digital) {
    digitalSlot.appendChild(buildPolaroid(SPLASH_IMAGES.digital));
  }

  const illustrationSlot = document.getElementById("splash-illustration");
  if (illustrationSlot && SPLASH_IMAGES.illustration) {
    illustrationSlot.appendChild(buildPolaroid(SPLASH_IMAGES.illustration));
  }

  // the little stacked-photos vignette above Video / Animation
  const stackSlot = document.getElementById("splash-stack");
  if (stackSlot && SPLASH_IMAGES.stack?.length) {
    const wrap = document.createElement("div");
    wrap.className = "stack-wrap";
    const back = buildPolaroid(SPLASH_IMAGES.stack[0]);
    back.classList.add("stack-back");
    wrap.appendChild(back);
    if (SPLASH_IMAGES.stack[1]) {
      const front = buildPolaroid(SPLASH_IMAGES.stack[1]);
      front.classList.add("stack-front");
      wrap.appendChild(front);
    }
    stackSlot.appendChild(wrap);
  }

  initSplashReveal(document.querySelectorAll(".tier-splash, .tier-splash-stack"));
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