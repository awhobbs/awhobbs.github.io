// Google Analytics 4 — custom event tracking for hobbservations.com.
// Loaded by _includes/scripts.liquid after gtag init from googletagmanager.com.
//
// gtag('config', ...) already records page_view on every page load, so site-wide
// nav (home, /projects/, /publications/, /cv/, project pages, post pages) is
// covered automatically. This file adds custom events on top:
//   - project_click: fired when a card on /projects/ is clicked. The project's
//     slug + title are sent as event params so the GA "Top events" report shows
//     which projects people actually engage with.
//   - external_link: fired when a user clicks an off-site link (any anchor whose
//     hostname differs from the current site). Helps see which outbound links
//     people follow (papers, code repos, the live map at /africa-yields/, etc).

(function () {
  if (typeof gtag !== 'function') return;

  // Project card clicks on /projects/ — al-folio renders each card as an
  // anchor with class .project-link and data-project-slug / data-project-title.
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a.project-link');
    if (!link) return;
    gtag('event', 'project_click', {
      project_slug: link.dataset.projectSlug || '',
      project_title: link.dataset.projectTitle || '',
      destination: link.getAttribute('href') || '',
    });
  });

  // Outbound link clicks — anything that leaves hobbservations.com.
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    let url;
    try { url = new URL(href, window.location.href); } catch (_) { return; }
    if (url.hostname && url.hostname !== window.location.hostname) {
      gtag('event', 'external_link', {
        outbound_url: url.href,
        outbound_host: url.hostname,
      });
    }
  });
})();
