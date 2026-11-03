// Scroll-driven, immersive effects for the Stay & Play page. Pure CSSOM (allowed by the CSP), no libraries.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // 1. Hero – the photo grows to full width as you scroll, like walking into the arena.
  const heroMedia = document.querySelector(".hero-media");
  // 2. Journey – a pinned section that swaps scenes as you scroll through the night.
  const journey = document.querySelector(".journey");
  const layers = journey ? [...journey.querySelectorAll(".journey-layer")] : [];
  const steps = journey ? [...journey.querySelectorAll(".journey-step")] : [];
  const dots = journey ? [...journey.querySelectorAll(".journey-progress span")] : [];
  let activeStep = -1;

  function setStep(i) {
    if (i === activeStep) return;
    activeStep = i;
    layers.forEach((el) => el.classList.toggle("is-active", Number(el.dataset.step) === i));
    steps.forEach((el) => el.classList.toggle("is-active", Number(el.dataset.step) === i));
    dots.forEach((el, k) => el.classList.toggle("is-active", k === i));
    // Load the next scene's image ahead of time.
    const next = layers[i + 1];
    if (next && next.loading === "lazy") next.loading = "eager";
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vh = window.innerHeight;
      if (heroMedia && !reduce) {
        const r = heroMedia.getBoundingClientRect();
        // 0 when the photo's top enters the lower screen, 1 once it reaches the top.
        const p = clamp((vh * 0.85 - r.top) / (vh * 0.75));
        heroMedia.style.setProperty("--zoom", p.toFixed(3));
      }
      if (journey && steps.length) {
        const r = journey.getBoundingClientRect();
        const travel = r.height - vh;
        const p = clamp(-r.top / Math.max(travel, 1));
        setStep(Math.min(steps.length - 1, Math.floor(p * steps.length)));
      }
    });
  }
  if (!reduce) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  } else {
    setStep(0);
  }

  // 3. Gallery arrows.
  const gallery = document.querySelector("#gallery");
  const move = (dir) => {
    if (!gallery) return;
    const item = gallery.querySelector(".gallery-item");
    const step = item ? item.getBoundingClientRect().width + 20 : gallery.clientWidth * 0.8;
    gallery.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };
  document.querySelector("#gallery-prev")?.addEventListener("click", () => move(-1));
  document.querySelector("#gallery-next")?.addEventListener("click", () => move(1));

  // 4. Hotel viewer – a gentle tilt that follows the pointer, so the rooms feel like a space you stand in.
  const viewer = document.querySelector("#hotel-viewer");
  if (viewer && !reduce && window.matchMedia("(pointer: fine)").matches) {
    viewer.addEventListener("pointermove", (e) => {
      if (viewer.classList.contains("is-dragging")) return;
      const r = viewer.getBoundingClientRect();
      viewer.style.setProperty("--tilt-x", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      viewer.style.setProperty("--tilt-y", (((e.clientY - r.top) / r.height) * -2 + 1).toFixed(3));
    });
    viewer.addEventListener("pointerleave", () => {
      viewer.style.setProperty("--tilt-x", "0");
      viewer.style.setProperty("--tilt-y", "0");
    });
  }

  // 5. Headings and cards ease in once, as they arrive.
  const fades = document.querySelectorAll(".section-head, .plan, .picker-copy, .picker-form, .hotel-caption");
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    fades.forEach((el) => { el.classList.add("fade-up"); io.observe(el); });
  }

})();
