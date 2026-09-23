/* ==========================================================================
   Contact protection
   Email/phone are stored base64-encoded in data-* attributes rather than
   as plain mailto:/tel: text in the HTML. This defeats the simple
   regex-scraping harvester bots that most spam actually comes from,
   while real visitors (and any crawler that renders JS) still get a
   normal, clickable, correctly-labeled link. Not bulletproof against a
   determined scraper — just raises the floor past "grep the page."
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-email]").forEach(el => {
    const addr = atob(el.getAttribute("data-email"));
    el.href = "mailto:" + addr;
    el.textContent = addr;
  });

  document.querySelectorAll("[data-phone]").forEach(el => {
    const num = atob(el.getAttribute("data-phone"));
    el.href = "tel:+1" + num.replace(/-/g, "");
    el.textContent = "1 " + num;
  });
});
