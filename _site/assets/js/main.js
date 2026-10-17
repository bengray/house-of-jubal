// House of Jubal — small progressive enhancements. The page works without this file.

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Pickup cover wood picker ---------- */
  const picker = document.querySelector(".wood-picker");
  const coverImg = document.querySelector("[data-cover-img]");
  const coverName = document.querySelector("[data-cover-name]");
  const coverNote = document.querySelector("[data-cover-note]");

  function selectWood(id) {
    if (!picker || !coverImg) return;
    const btn = picker.querySelector(`[data-wood="${id}"]`);
    if (!btn || btn.getAttribute("aria-pressed") === "true") return;

    picker.querySelectorAll("[data-wood]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === btn))
    );

    const swap = () => {
      coverImg.srcset = btn.dataset.srcset;
      coverImg.src = btn.dataset.src;
      coverImg.alt = btn.dataset.alt;
      if (coverName) coverName.textContent = btn.dataset.name;
      if (coverNote) coverNote.textContent = btn.dataset.note;
    };

    if (reduceMotion) return swap();
    coverImg.classList.add("is-swapping");
    const done = () => coverImg.classList.remove("is-swapping");
    setTimeout(() => {
      swap();
      if (coverImg.complete) requestAnimationFrame(done);
      else coverImg.addEventListener("load", done, { once: true });
    }, 180);
  }

  picker?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-wood]");
    if (btn) selectWood(btn.dataset.wood);
  });

  // Hero swatches jump to the covers section with that wood picked.
  document.querySelectorAll(".swatch[data-wood]").forEach((link) => {
    link.addEventListener("click", () => selectWood(link.dataset.wood));
  });

  /* ---------- Raking light ----------
     A warm light (.rake::before/::after, positioned by --lx/--ly) eases toward
     the pointer on mouse and trackpad, and sweeps across with scroll on touch
     screens. When the pointer leaves, it drifts back to rest up and to the left. */
  const REST = { x: 22, y: 18 };
  const lights = new Map();
  const stateOf = (node) => {
    if (!lights.has(node)) lights.set(node, { x: REST.x, y: REST.y, tx: REST.x, ty: REST.y });
    return lights.get(node);
  };

  if (!reduceMotion && document.querySelector(".rake")) {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (finePointer) {
      document.addEventListener("pointermove", (e) => {
        const node = e.target.closest?.(".rake");
        if (!node) return;
        const r = node.getBoundingClientRect();
        const s = stateOf(node);
        s.tx = ((e.clientX - r.left) / r.width) * 100;
        s.ty = ((e.clientY - r.top) / r.height) * 100;
      });
      document.addEventListener("pointerout", (e) => {
        const node = e.target.closest?.(".rake");
        if (!node || node.contains(e.relatedTarget)) return;
        const s = stateOf(node);
        s.tx = REST.x;
        s.ty = REST.y;
      });
    } else {
      const sweep = () => {
        const vh = window.innerHeight || 1;
        document.querySelectorAll(".rake").forEach((node) => {
          const r = node.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
          const s = stateOf(node);
          s.tx = 10 + p * 80;
          s.ty = 15 + p * 40;
        });
      };
      window.addEventListener("scroll", sweep, { passive: true });
      sweep();
    }

    // Ease each light toward its target; skip the style write once it has settled.
    const tick = () => {
      lights.forEach((s, node) => {
        const dx = s.tx - s.x;
        const dy = s.ty - s.y;
        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return;
        s.x += dx * 0.12;
        s.y += dy * 0.12;
        node.style.setProperty("--lx", `${s.x.toFixed(2)}%`);
        node.style.setProperty("--ly", `${s.y.toFixed(2)}%`);
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();
