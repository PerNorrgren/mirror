// ── brand-inject.js ──
// Fetches this deployment's brand config once and applies it wherever a page
// has opted in via data-brand attributes, so Path-A clones (a facilitator's
// own deployment, e.g. Rotterdam UAS) show their own name instead of a
// hardcoded "Deeper Mindfulness" baked into every page's HTML.
//
// USAGE — add to any page:
//   <script src="/brand-inject.js"></script>
//   <span data-brand="name">Deeper Mindfulness</span>       -- brand/marketing name
//   <span data-brand="tagline">...</span>                   -- tagline
//   <span data-brand="entity">Per Norrgren trading as...</span> -- legal trading entity (GDPR/consent copy, legal page chrome)
//   <img data-brand="logo" src="...">                       -- only swapped if a logoUrl is configured
//
// The text already in the HTML is the fallback — if the config fetch fails
// (offline, slow first load, whatever), the page still reads correctly with
// Per's own name rather than breaking or showing nothing.
//
// For pages that need the brand name in their OWN dynamic logic (e.g.
// legal.html sets document.title after an async document load, so the
// generic <title> patch below would just get overwritten) — await
// window.brandReady and use cfg.brandName directly.
window.brandReady = fetch('/api/config')
  .then(function(r) { return r.json(); })
  .then(function(cfg) {
    var name   = cfg.brandName || 'Deeper Mindfulness';
    var tagline = cfg.tagline || 'Making the practices land and last for life.';
    var entity = cfg.legalEntityName || 'Per Norrgren trading as Deeper Mindfulness';

    document.querySelectorAll('[data-brand="name"]').forEach(function(el)    { el.textContent = name; });
    document.querySelectorAll('[data-brand="tagline"]').forEach(function(el) { el.textContent = tagline; });
    document.querySelectorAll('[data-brand="entity"]').forEach(function(el)  { el.textContent = entity; });
    if (cfg.logoUrl) {
      document.querySelectorAll('[data-brand="logo"]').forEach(function(el) {
        if (el.tagName === 'IMG') el.src = cfg.logoUrl;
      });
    }
    // Static <title> tags all default to containing the literal string
    // "Deeper Mindfulness" somewhere — swap it wherever it appears rather
    // than requiring each page to mark its title specially.
    if (document.title.indexOf('Deeper Mindfulness') !== -1) {
      document.title = document.title.split('Deeper Mindfulness').join(name);
    }
    return cfg;
  })
  .catch(function(e) {
    console.error('brand-inject: could not load config, falling back to defaults', e);
    return { brandName: 'Deeper Mindfulness', tagline: 'Making the practices land and last for life.', legalEntityName: 'Per Norrgren trading as Deeper Mindfulness' };
  });
