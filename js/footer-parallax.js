/* ==========================================================================
   Footer splash reveal
   The splash badge stays fully hidden until the visitor scrolls within
   REVEAL_BUFFER px of the true bottom of the page, then slides up and
   fades in as they scroll through that last stretch, landing in place
   exactly at the bottom. Driven by distance-from-bottom rather than
   viewport intersection, so "the bottom of the page" means exactly that.
   Scroll handling is throttled to one calculation per animation frame.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const badge = document.getElementById("footer-splash-badge");
  if (!badge) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return; // CSS fallback already shows it in place

  const REVEAL_BUFFER = 260; // px of scroll, right at the end, over which it slides in
  const START_OFFSET = 160;  // matches the CSS default translateY

  let ticking = false;

  function update() {
    ticking = false;
    const doc = document.documentElement;
    const distanceFromBottom = doc.scrollHeight - (window.scrollY + window.innerHeight);
    const progress = 1 - Math.min(Math.max(distanceFromBottom / REVEAL_BUFFER, 0), 1);

    badge.style.opacity = progress;
    badge.style.transform = "rotate(-5deg) translateY(" + (START_OFFSET * (1 - progress)) + "px)";
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
});
