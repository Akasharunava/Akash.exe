const lenis = new Lenis(
    {
  lerp: 0.1,
  wheelMultiplier: 1,
}
);


function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

const strip = document.querySelector(".pixels");

lenis.on("scroll", ({ scroll }) => {
  strip.style.transform = `translateY(${scroll * -0.3}px)`;
});

const dials = document.querySelectorAll(".dial");
const dial = dials[0];
let startAngle = 90;
let target = startAngle;
let current = startAngle;
let locked = false;
const travel = 180;
const endAngle = startAngle - travel;
let prevOffset = null;
let dragging = false;
let lastY = 0;
const dragSpeed = 1;
let unlockedAt = 0;
const tickStep = 30;      // degrees between your big ticks
let snapTimer;
let velocity = 0;
let lastTime = 0;
const spokes = [...document.querySelectorAll(".spoke")];
const angles = spokes.map((s) => parseFloat(s.style.getPropertyValue("--a")));
let justDragged = false;

const project = document.querySelector("#project");
const pjTitle = project.querySelector(".pj-title");
const pjItems = project.querySelector(".pj-items");
const pjDesc = project.querySelector(".pj-desc");

const pjClose = project.querySelector(".pj-close");
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const DUR = 550;
const CLIP_R = 0.55;
const FADE_IN = { duration: 300, delay: 250, easing: "ease-out", fill: "backwards" };
let sourceBox = null, sourceItems = [], sourceRadius = 0, busy = false;

const descGhost = (el) => {
  const r = rectOf(el), g = el.cloneNode(true);
  Object.assign(g.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", margin: "0", pointerEvents: "none", zIndex: "1" });
  project.append(g);
  return g;
};
const rectOf = (el) => el.getBoundingClientRect();
const insetOf = (inner, outer, radius = 0) =>
  `inset(${inner.top - outer.top}px ${outer.right - inner.right}px ${outer.bottom - inner.bottom}px ${inner.left - outer.left}px round ${radius}px)`;
const flipFrom = (from, to) =>
  `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
const grown = (r, pad) => ({ top: r.top - pad, left: r.left - pad, right: r.right + pad, bottom: r.bottom + pad });
const boxKeys = (r, radius, opacity) => ({
  left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px",
  borderRadius: radius + "px", opacity,
});
const FULL = () => ({
  left: "0px", top: "0px", width: innerWidth + "px", height: innerHeight + "px",
  borderRadius: "0px", opacity: 1,
});

function openProject(box) {
  if (busy) return;
  busy = true;
  const bg = box.querySelector(".works-bg");
  const row = box.querySelector(".works-items");
  const body = box.querySelector(".works-body");
  const originals = [...row.querySelectorAll(".item")];
  const smallDesc = box.querySelector(".works-desc");

  const bgRect = rectOf(bg), rowRect = rectOf(row);
  const firsts = originals.map(rectOf);
  const radius = parseFloat(getComputedStyle(bg).borderTopLeftRadius) || 0;
  const rowRadius = (parseFloat(getComputedStyle(row).borderTopLeftRadius) || 0) * CLIP_R;
  sourceBox = box; sourceItems = originals; sourceRadius = radius;

  pjTitle.textContent = box.dataset.title || "";
  pjItems.replaceChildren(...originals.map((i) => i.cloneNode(true)));
  const more = box.querySelector(".works-more");
  pjDesc.innerHTML = more ? more.innerHTML : smallDesc ? smallDesc.innerHTML : "";

  Object.assign(bg.style, { position: "fixed", inset: "auto", ...FULL() });
  project.prepend(bg);
  const ghost = smallDesc ? descGhost(smallDesc) : null;
  body.style.visibility = "hidden";
  pjScroll.scrollTop = 0;
  pjTarget = 0;
  project.showModal();
  if (ghost) ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" }).finished.then(() => ghost.remove());

  const clones = [...pjItems.children];
  const gridRect = rectOf(pjItems);
  const lasts = clones.map(rectOf);
  const opts = { duration: DUR, easing: EASE };
  const openClip = insetOf(grown(gridRect, innerWidth * 0.02), gridRect, rowRadius);

  bg.animate([boxKeys(bgRect, radius, 0.5), FULL()], opts);
  pjItems.animate([{ clipPath: insetOf(rowRect, gridRect, rowRadius) }, { clipPath: openClip }], opts);
  clones.forEach((c, k) => c.animate([{ transform: flipFrom(firsts[k], lasts[k]) }, { transform: "none" }], opts));
  [pjTitle, pjDesc, pjClose].forEach((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], FADE_IN));
  setTimeout(() => (busy = false), DUR);
}

async function closeProject() {
  if (busy || !project.open) return;
  busy = true;
  project.classList.add("closing");
  const box = sourceBox, originals = sourceItems;
  const bg = project.querySelector(":scope > .works-bg");
  const row = box.querySelector(".works-items");
  const body = box.querySelector(".works-body");
  const home = rectOf(box), rowRect = rectOf(row), gridRect = rectOf(pjItems);
  const rowRadius = (parseFloat(getComputedStyle(row).borderTopLeftRadius) || 0) * CLIP_R;
  const clones = [...pjItems.children];
  const lasts = clones.map(rectOf);
  const firsts = originals.map(rectOf);
  const opts = { duration: 450, easing: EASE, fill: "forwards" };
  const openClip = insetOf(grown(gridRect, innerWidth * 0.02), gridRect, rowRadius);

  const smallDesc = box.querySelector(".works-desc");
  const ghost = smallDesc ? descGhost(smallDesc) : null;
  if (ghost) ghost.style.opacity = 0;
  const anims = [
    bg.animate([FULL(), boxKeys(home, sourceRadius, 0.5)], opts),
    pjItems.animate([{ clipPath: openClip }, { clipPath: insetOf(rowRect, gridRect, rowRadius) }], opts),
    ...clones.map((c, k) => c.animate([{ transform: "none" }, { transform: flipFrom(firsts[k], lasts[k]) }], opts)),
    ...[pjTitle, pjDesc, pjClose].map((el) =>
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: "forwards" })
    ),
    ...(ghost ? [ghost.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 200, easing: "ease-out", fill: "both" })] : []),
  ];
  await Promise.all(anims.map((a) => a.finished));
  if (ghost) ghost.remove();

  bg.getAnimations().forEach((a) => a.cancel());
  box.prepend(bg);
  bg.removeAttribute("style");
  body.style.visibility = "";
  project.close();
  pjItems.replaceChildren();
  project.classList.remove("closing");
  [pjItems, pjTitle, pjDesc, pjClose, ...clones].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  busy = false;
}

const pjScroll = project.querySelector(".pj-body");
let pjTarget = 0, pjGliding = false;

function pjGlide() {
  const diff = pjTarget - pjScroll.scrollTop;
  if (Math.abs(diff) < 1) { pjScroll.scrollTop = pjTarget; pjGliding = false; return; }
  pjScroll.scrollTop += Math.sign(diff) * Math.max(1, Math.abs(diff) * 0.12);
  requestAnimationFrame(pjGlide);
}

pjScroll.addEventListener("wheel", (e) => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const max = pjScroll.scrollHeight - pjScroll.clientHeight;
  if (max <= 0) return;
  e.preventDefault();
  if (!pjGliding) pjTarget = pjScroll.scrollTop;
  pjTarget = Math.max(0, Math.min(max, pjTarget + e.deltaY));
  if (!pjGliding) { pjGliding = true; requestAnimationFrame(pjGlide); }
}, { passive: false });

project.addEventListener("cancel", (e) => { e.preventDefault(); closeProject(); });
pjClose.addEventListener("click", closeProject);

document.addEventListener("click", (e) => {
  const box = e.target.closest(".works-box");
  if (!box || e.target.closest(".item") || justDragged) return;
  openProject(box);
});

document.querySelectorAll(".item").forEach((item) => {
  if (item.querySelector("img, video")) return;
  const { type, src } = item.dataset;

  if (type === "embed") {
    const id = src.match(/(?:embed\/|v=|youtu\.be\/)([\w-]{11})/)?.[1];
    if (!id) return;
    const img = document.createElement("img");
    img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    img.alt = item.dataset.alt || "Video thumbnail";
    img.loading = "lazy";
    item.append(img);
  } else if (type === "video") {
    const v = document.createElement("video");
    v.src = src + "#t=" + (item.dataset.time || 0.5);
    v.muted = true;
    v.preload = "metadata";
    v.playsInline = true;
    item.append(v);
  } else if (type === "image") {
    const img = document.createElement("img");
    img.src = src;
    img.alt = item.dataset.alt || "Project image";
    img.loading = "lazy";
    item.append(img);
  }
});

function snapToTick() {
  if (!locked) return;
  const steps = Math.round((target - startAngle) / tickStep);
  target = startAngle + steps * tickStep;
  target = Math.min(Math.max(target, endAngle), startAngle);
}

function dialOffset() {
  let y = dial.offsetHeight / 2;
  for (let el = dial; el; el = el.offsetParent) y += el.offsetTop;
  return y - window.scrollY - window.innerHeight / 2;
}

function lock() {
  document.body.style.touchAction = "none";
  document.body.classList.add("locked");
  locked = true;
  lenis.scrollTo(lenis.scroll + dialOffset(), { immediate: true, force: true });
  lenis.stop();
}

function unlock() {
  document.body.classList.remove("locked");
  document.body.style.touchAction = "";
  locked = false;
  unlockedAt = performance.now();
  prevOffset = dialOffset();
  lenis.start();
}

lenis.on("scroll", () => {
  if (locked) return;
  const offset = dialOffset();
  if (prevOffset === null) prevOffset = offset;

  const crossedDown = prevOffset > 0 && offset <= 0;
  const crossedUp = prevOffset < 0 && offset >= 0;
  prevOffset = offset;
  if (performance.now() - unlockedAt < 400) return;
  if (crossedDown && target > endAngle) lock();
  if (crossedUp && target <= endAngle) lock();
});

let lastInput = 0;

function applyScroll(deltaY) {
  if (!locked) return;

  const now = performance.now();
  const fresh = now - lastInput > 200;
  lastInput = now;

  const atEnd = target <= endAngle;
  const atStart = target >= startAngle;

  if ((deltaY > 0 && atEnd) || (deltaY < 0 && atStart)) {
    if (fresh) unlock();
    return;
  }

  target -= deltaY * 0.3;
  target = Math.min(Math.max(target, endAngle), startAngle);
  clearTimeout(snapTimer);
  snapTimer = setTimeout(snapToTick, 120);
}

//Wheel

window.addEventListener("wheel", (e) => {
  if (lightbox.open || project.open) return;
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  applyScroll(e.deltaY);
});

document.querySelectorAll(".works-items").forEach((strip) => {
  let targetX = 0, gliding = false;
  let down = false, dragging = false, startX = 0, startScroll = 0;
  let velocity = 0, lastX = 0, lastTime = 0;
  const maxScroll = () => strip.scrollWidth - strip.clientWidth;

  function glide() {
    const diff = targetX - strip.scrollLeft;
    if (Math.abs(diff) < 1) { strip.scrollLeft = targetX; gliding = false; return; }
    strip.scrollLeft += Math.sign(diff) * Math.max(1, Math.abs(diff) * 0.12);
    requestAnimationFrame(glide);
  }

  strip.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (strip.scrollWidth <= strip.clientWidth) return;
    e.stopPropagation();
    if (!gliding) targetX = strip.scrollLeft;
    targetX = Math.max(0, Math.min(maxScroll(), targetX + e.deltaY));
    if (!gliding) { gliding = true; requestAnimationFrame(glide); }
  });

  strip.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    down = true; dragging = false;
    startX = e.clientX; startScroll = strip.scrollLeft; targetX = strip.scrollLeft;
    lastX = e.clientX; lastTime = performance.now(); velocity = 0;
  });

  strip.addEventListener("pointermove", (e) => {
    if (!down) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < 5) return;
      dragging = true;
      strip.setPointerCapture(e.pointerId);
      document.body.classList.add("grabbing");
    }
    strip.scrollLeft = startScroll - (e.clientX - startX);
    targetX = strip.scrollLeft;
    const now = performance.now();
    const dt = Math.max(now - lastTime, 1);
    velocity = velocity * 0.7 + ((e.clientX - lastX) / dt) * 0.3;
    lastX = e.clientX; lastTime = now;
  });

  const end = () => {
    if (!down) return;
    down = false;
    document.body.classList.remove("grabbing");
    if (dragging) {
      justDragged = true;
      setTimeout(() => (justDragged = false), 0);
      if (performance.now() - lastTime < 80) {
        const v = Math.max(-4, Math.min(4, velocity));
        targetX = Math.max(0, Math.min(maxScroll(), strip.scrollLeft - v * 300));
        if (!gliding) { gliding = true; requestAnimationFrame(glide); }
      }
    }
    dragging = false;
  };
  strip.addEventListener("pointerup", end);
  strip.addEventListener("pointercancel", end);
});

document.querySelectorAll(".item").forEach((item) => {
  item.addEventListener("click", () => {
    if (justDragged) return;
    
  });
});

const lightbox = document.querySelector("#lightbox");
const stage = lightbox.querySelector(".lb-stage");

function openLightbox(item) {
  const type = item.dataset.type;
  const src = item.dataset.src || item.querySelector("img")?.src;
  let el;

  if (type === "image") {
    el = document.createElement("img");
    el.src = src;
  } else if (type === "video") {
    el = document.createElement("video");
    el.src = src;
    el.controls = true;
    el.autoplay = true;
    el.playsInline = true;
  } else if (type === "embed") {
    el = document.createElement("iframe");
    el.src = src + (src.includes("?") ? "&" : "?") + "autoplay=1&rel=0";
    el.allow = "autoplay; fullscreen; picture-in-picture";
    el.allowFullscreen = true;
    el.referrerPolicy = "strict-origin-when-cross-origin";
  }

  el.className = "lb-media";
  stage.replaceChildren(el);
  lightbox.showModal();
}

lightbox.addEventListener("close", () => stage.replaceChildren());
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target === stage) lightbox.close();
});
lightbox.querySelector(".lb-close").addEventListener("click", () => lightbox.close());

document.addEventListener("click", (e) => {
  const item = e.target.closest(".item");
  if (!item || justDragged) return;
  openLightbox(item);
});

//PointerDown

window.addEventListener("pointerdown", (e) => {
  if (lightbox.open || project.open) return;
  if (e.target.closest(".works-items")) return;
  dragging = true;
  lastY = e.clientY;
  document.body.classList.add("grabbing");
  velocity = 0;
lastTime = performance.now();
if (!locked) lenis.scrollTo(lenis.scroll, { immediate: true });
});

window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dy = (lastY - e.clientY) * dragSpeed;
  lastY = e.clientY;
  const now = performance.now();
  const dt = Math.max(now - lastTime, 1);
  velocity = velocity * 0.7 + (dy / dt) * 0.3;
  lastTime = now;

  if (locked) applyScroll(dy);
  else if (e.pointerType === "mouse") lenis.scrollTo(lenis.scroll + dy, { immediate: true });
});

window.addEventListener("pointerup", (e) => {
  dragging = false;
  document.body.classList.remove("grabbing");
  snapToTick();

  const stillMoving = performance.now() - lastTime < 80;
  if (!locked && e.pointerType === "mouse" && stillMoving) {
    const v = Math.max(-4, Math.min(4, velocity));
    lenis.scrollTo(lenis.scroll + v * 200, {
      duration: 1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }
});

window.addEventListener("pointercancel", () => (dragging = false));

const boxes = [...document.querySelectorAll(".works-box")];
let activeIndex = 0;

const quickGap = 500;
let lastChange = 0;
let scrubTimer;

function setActive(next) {
  if (next === activeIndex) return;
  const now = performance.now();
  const fast = now - lastChange < quickGap;
  lastChange = now;

  const old = boxes[activeIndex];
  const nextBox = boxes[next];
  old.classList.remove("is-active");
  document.body.classList.toggle("scrubbing", fast);

  if (fast) {
    clearTimeout(scrubTimer);
    scrubTimer = setTimeout(() => document.body.classList.remove("scrubbing"), 700);
  } else {
    old.style.setProperty("--dir", next > activeIndex ? -1 : 1);
    old.classList.add("is-leaving");
  }

  nextBox.classList.remove("is-leaving");
  void nextBox.offsetWidth;
  nextBox.classList.add("is-active");
  activeIndex = next;
}

const collider = document.querySelectorAll(".collider")
const social = document.querySelectorAll(".social");
const hidden = document.querySelectorAll(".hidden-social");

collider.forEach((el, i) => {
  el.addEventListener("mouseenter", () => {
    social[i].classList.add("hidden");
    hidden[i].classList.add("show");
  });

  el.addEventListener("mouseleave", () => {
    social[i].classList.remove("hidden");
    hidden[i].classList.remove("show");
  });
});

const curve = document.querySelector(".curve");
const myPics = document.querySelector(".myPics");

let x3d = 0, y3d = 0;

const hit = document.querySelector(".curve");
let mouseX = 0, mouseY = 0;
let inside = false;
window.addEventListener("mousemove", (e) => { 
  mouseX = e.clientX; mouseY = e.clientY;
  inside = true;
});

document.addEventListener("mouseout", (e) => {
  if (!e.relatedTarget) { inside = false; }
  
});

const sun = document.querySelector("#sun");
let lastAz = 0;

function update() {
  const r = hit.getBoundingClientRect();
  if (inside) {
  x3d = Math.max(-0.9, Math.min(0.9, (mouseX - (r.left + r.width / 2)) / window.innerWidth));
  y3d = Math.max(-0.9, Math.min(0.9, (mouseY - (r.top + r.height / 2)) / window.innerHeight));
  } else {
    x3d = 0; y3d = 0;
  }
  const rotateY = x3d * 15;
  const rotateX = -y3d * 15;

  curve.style.transform = `translateZ(-60px) rotateX(${rotateX * 2}deg) rotateY(${rotateY * 2}deg)`;
  myPics.style.transform = `translateZ(60px) rotateX(${rotateX * 1.5}deg) rotateY(${rotateY * 1.5}deg)`;

  current += (target - current) * 0.1;
  dials.forEach(d => d.style.transform = `rotate(${current}deg)`);
  setActive(Math.max(0, Math.min(boxes.length - 1, Math.round((startAngle - current) / tickStep))));
  spokes.forEach((spoke, i) => {
  const closeness = Math.max(0, 1 - Math.abs(angles[i] + current) / tickStep);
  spoke.style.setProperty("--sel", closeness * closeness * (3 - 2 * closeness) );
});
  requestAnimationFrame(update);
}
update();