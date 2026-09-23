/* ==========================================================================
   Carousel engine
   - Builds each tier's <figure> list from gallery-data.js
   - Auto-scrolls slowly, right to left edge, then reverses (ping-pong)
   - Any manual scroll/touch/drag/arrow-click permanently stops autoplay
     for that carousel and hands control to the user
   ========================================================================== */

function buildCarousel(container, data) {
  const track = container.querySelector(".carousel");
  const items = data.items;

  if (!items || items.length === 0) {
    track.classList.add("empty");
    const p = document.createElement("p");
    p.textContent = "Examples coming soon — drop pngs into images/work/" +
      data.folder.split("/").slice(-2, -1)[0] + "/";
    track.appendChild(p);
    return;
  }

  items.forEach(item => {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.src = data.folder + item.file;
    img.alt = item.caption || "";
    img.loading = "lazy";
    fig.appendChild(img);
    if (item.caption) {
      const cap = document.createElement("figcaption");
      cap.textContent = item.caption;
      fig.appendChild(cap);
    }
    track.appendChild(fig);
  });

  if (items.length > 1) initAutoplay(container, track);
}

function initAutoplay(container, track) {
  let direction = 1;
  let playing = true;
  let rafId = null;
  const speed = 0.45; // px per frame, gentle drift

  function step() {
    if (!playing) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 0) return;

    track.scrollLeft += speed * direction;

    if (track.scrollLeft >= maxScroll - 1) direction = -1;
    if (track.scrollLeft <= 1) direction = 1;

    rafId = requestAnimationFrame(step);
  }

  function stopForGood() {
    if (!playing) return;
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  // Any manual touch of the track stops autoplay and hands over control.
  ["wheel", "touchstart", "pointerdown"].forEach(evt => {
    track.addEventListener(evt, stopForGood, { passive: true });
  });

  const prevBtn = container.querySelector(".carousel-arrow.prev");
  const nextBtn = container.querySelector(".carousel-arrow.next");

  function pageBy(dir) {
    stopForGood();
    const amount = track.clientWidth * 0.85 * dir;
    track.scrollBy({ left: amount, behavior: "smooth" });
  }

  if (prevBtn) prevBtn.addEventListener("click", () => pageBy(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => pageBy(1));

  rafId = requestAnimationFrame(step);
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
});
