// Cross-page View Transitions: the guitar you click morphs into its instrument
// page, and morphs back when you return.
//
// Mark the pieces in templates with:
//   data-vt-card="<key>"  one clickable guitar (hero slice, lineup card). The key
//                         must be unique on the page, e.g. "hero-petros".
//   data-vt-photo         its photo frame: the image plus any light or shade over
//                         it, so the overlays travel with the photo
//   data-vt-name          its name
//   data-vt-label         (optional) a caption drawn over the photo; fades on its
//                         own layer so the moving photo can't cover it
// On the instrument page, data-vt-hero wraps the matching pieces, and
// data-vt-copy marks the text over the photo.
//
// Names are given to one guitar at a time, just before the page swaps, and
// taken away afterwards. Getting that right across page loads means guarding
// against a few races, each handled below and marked RACE.
//
// Loaded in <head> without defer so the pagereveal listener exists before the
// new page's first frame. The layout also holds that first frame until the whole
// page is parsed (<link rel="expect">), so every card is in the DOM by then.
// Browsers without cross-document View Transitions just navigate.
(() => {
  /* ---------- Photo warm-up ----------
     Start loading the full-size photo when someone hovers, focuses or touches a
     guitar, so the instrument page's hero is ready when the morph runs. */
  const warming = new Map(); // keep the Image objects alive until they've loaded
  const warm = (e) => {
    const el = e.target.closest?.("[data-vt-preload]");
    const srcset = el?.dataset.vtPreload;
    if (!srcset || warming.has(srcset)) return;
    const img = new Image();
    img.sizes = "100vw";
    img.srcset = srcset;
    warming.set(srcset, img);
  };
  ["pointerover", "focusin", "touchstart"].forEach((type) =>
    document.addEventListener(type, warm, { passive: true })
  );

  /* ---------- Close button ----------
     The close link's href is a real fallback (/#lineup-<slug>) for when there's
     nothing to go back to: a shared link, a new tab, no JS. When the previous
     history entry is a page of this site (other than an instrument page), it acts
     as Back instead: the browser restores that page from its back/forward cache,
     scroll position and all, and no extra history entry piles up. Esc does the same. */
  const isInstrumentPath = (path) => /^\/instruments\/[^/]+\/$/.test(path);
  function previousIsOurs() {
    const nav = window.navigation;
    if (nav?.currentEntry && typeof nav.entries === "function") {
      const prev = nav.entries()[nav.currentEntry.index - 1];
      if (!prev?.url) return false;
      const url = new URL(prev.url);
      return url.origin === location.origin && !isInstrumentPath(url.pathname);
    }
    // No Navigation API (Safari): the referrer is the page that linked here.
    try {
      const url = new URL(document.referrer);
      return history.length > 1 && url.origin === location.origin && !isInstrumentPath(url.pathname);
    } catch (e) {
      return false;
    }
  }
  function close(e) {
    if (!previousIsOurs()) return; // follow the href
    e?.preventDefault();
    history.back();
  }
  document.addEventListener("click", (e) => {
    const link = e.target.closest?.("[data-vt-close]");
    if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    close(e);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const link = document.querySelector("[data-vt-close]");
    if (!link) return;
    if (previousIsOurs()) { e.preventDefault(); history.back(); }
    else link.click();
  });

  if (!("onpagereveal" in window)) return;

  const pathOf = (url) => new URL(url, location.href).pathname;
  const isInstrument = (path) => /^\/instruments\/[^/]+\/$/.test(path);
  const store = {
    get(k) { try { return sessionStorage.getItem(`jubal:vt:${k}`); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(`jubal:vt:${k}`, String(v)); } catch (e) {} },
  };

  /* ---------- Naming ---------- */
  const NAMES = {
    "[data-vt-photo]": "guitar-photo",
    "[data-vt-name]": "guitar-name",
    "[data-vt-copy]": "guitar-copy",
    "[data-vt-label]": "guitar-label",
    "[data-vt-close]": "guitar-close",
  };
  const ALL = Object.keys(NAMES).join(",");

  // RACE: a transition's `finished` can resolve after the next one has started
  // (Back pressed mid-morph, a quick second click), and its cleanup would then
  // strip names the new transition depends on. Each tagging bumps `generation`;
  // a cleanup only runs if it still belongs to the latest one.
  let generation = 0;

  function clearAll() {
    document.querySelectorAll(ALL).forEach((el) => { el.style.viewTransitionName = ""; });
  }

  // RACE: names left on a page frozen in the back/forward cache (its cleanup may
  // never run) would duplicate the next guitar's names, and the browser cancels
  // any transition with duplicate names. So always clear everything first.
  function tag(scope) {
    clearAll();
    const gen = ++generation;
    if (!scope) return gen;
    for (const [selector, name] of Object.entries(NAMES)) {
      const el = scope.matches(selector) ? scope : scope.querySelector(selector);
      if (el) el.style.viewTransitionName = name;
    }
    return gen;
  }
  function cleanupAfter(transition, gen) {
    transition.finished.finally(() => { if (gen === generation) clearAll(); });
  }
  window.addEventListener("pageshow", (e) => { if (e.persisted) { generation++; clearAll(); } });

  /* ---------- Choosing the guitar ---------- */
  const linkOf = (card) => (card.matches("a[href]") ? card : card.querySelector("a[href]"));
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  };

  // The element on this page that stands for the instrument page at `path`.
  // On that instrument page it's the hero; elsewhere it's a card linking there,
  // preferring the card the visitor actually clicked (`preferKey`).
  function scopeFor(path, preferKey) {
    if (location.pathname === path) return document.querySelector("[data-vt-hero]");
    const cards = [...document.querySelectorAll("[data-vt-card]")].filter((card) => {
      const link = linkOf(card);
      return link && pathOf(link.href) === path;
    });
    const visible = (card) => onScreen(card.querySelector("[data-vt-photo]") || card);
    return (
      cards.find((c) => c.dataset.vtCard === preferKey && visible(c)) ||
      cards.find(visible) ||
      null
    );
  }

  // RACE: which card did they click? With a hero slice and a lineup card both
  // linking to the same guitar, "the first one on screen" can be the wrong one.
  // Remember the actual click (keyboard Enter fires click too).
  let clickedKey = null;
  document.addEventListener("click", (e) => {
    clickedKey = e.target.closest?.("[data-vt-card]")?.dataset.vtCard ?? null;
  }, true);

  // Which side's element morphs: always the instrument page's guitar.
  function morphTarget(from, to) {
    if (isInstrument(to) && !isInstrument(from)) return to;
    if (isInstrument(from) && !isInstrument(to)) return from;
    return null; // instrument → instrument, or anything else: plain cross-fade
  }

  /* ---------- Scroll position at reveal ----------
     RACE: the new page reveals before the browser has restored scroll (Back) or
     jumped to a #fragment (the "All instruments" link). The script would pick a
     card at the top of the page, morph to it, and then the page would jump away.
     So put the page where it's going to end up *before* choosing. */
  function navigationType() {
    const nav = window.navigation?.activation?.navigationType;
    if (nav) return nav; // "push" | "replace" | "reload" | "traverse"
    const t = performance.getEntriesByType("navigation")[0]?.type;
    return t === "back_forward" ? "traverse" : t === "reload" ? "reload" : "push";
  }
  function settleScroll() {
    if (navigationType() === "traverse") {
      const saved = Number(store.get(`scroll:${location.pathname}`));
      if (Number.isFinite(saved) && Math.abs(window.scrollY - saved) > 1) {
        window.scrollTo({ top: saved, behavior: "instant" });
      }
    } else if (location.hash.length > 1) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }

  /* ---------- Old page, just before it's snapshotted ---------- */
  window.addEventListener("pageswap", (event) => {
    const from = location.pathname;
    store.set("from", from);
    store.set(`scroll:${from}`, Math.round(window.scrollY));
    if (clickedKey) store.set(`card:${from}`, clickedKey);
    const clicked = clickedKey;
    clickedKey = null; // don't let it leak into a later Back/Forward from this page

    if (!event.viewTransition || !event.activation) { clearAll(); return; }
    const target = morphTarget(from, pathOf(event.activation.entry.url));
    const scope = target ? scopeFor(target, clicked) : null;
    const gen = tag(scope); // clears stale names even when nothing should morph
    cleanupAfter(event.viewTransition, gen);
  });

  /* ---------- New page, before its first frame ---------- */
  window.addEventListener("pagereveal", (event) => {
    if (!event.viewTransition) { clearAll(); return; }
    const fromUrl = window.navigation?.activation?.from?.url ?? store.get("from");
    const target = fromUrl ? morphTarget(pathOf(fromUrl), location.pathname) : null;
    if (!target) { tag(null); return; }

    settleScroll();
    const scope = scopeFor(target, store.get(`card:${location.pathname}`));
    const gen = tag(scope);

    // RACE: a lazy or async-decoding image can miss the first frame, so the
    // morph lands on an empty frame and the photo pops in afterwards.
    scope?.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      img.decoding = "sync";
    });

    cleanupAfter(event.viewTransition, gen);
  });
})();
