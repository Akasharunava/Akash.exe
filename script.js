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


let closing = false;
const panel = project.querySelector(".pj-panel");
let sourceBox = null, sourceItems = [], sourceShown = [], busy = false;

const vt = (fn) =>
  document.startViewTransition
    ? document.startViewTransition(fn)
    : (fn(), { finished: Promise.resolve() });

const tag = (el, name = "", group = "") => {
  el.style.viewTransitionName = name;
  el.style.viewTransitionGroup = group;
};

function visibleInRow(el) {
  const row = el.closest(".works-items").getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return r.right > row.left + 1 && r.left < row.right - 1;
}

function openProject(box) {
  if (busy) return;
  busy = true;
  const row = box.querySelector(".works-items");
  const originals = [...row.querySelectorAll(".item")];
  const shown = originals.map(visibleInRow);
  const smallDesc = box.querySelector(".works-desc");

  tag(box, "works");
  if (smallDesc) tag(smallDesc, "descold");
  tag(row, "row", "contain");
  originals.forEach((el, k) => { if (shown[k]) tag(el, "item" + k, "nearest"); });
  sourceBox = box; sourceItems = originals; sourceShown = shown;

  vt(() => {
    [box, smallDesc, row, ...originals].forEach((el) => el && tag(el));

    pjTitle.textContent = box.dataset.title || "";
    pjItems.replaceChildren(...originals.map((i) => i.cloneNode(true)));
    const more = box.querySelector(".works-more");
    pjDesc.innerHTML = more ? more.innerHTML : smallDesc ? smallDesc.innerHTML : "";

    tag(panel, "works");
    tag(pjTitle, "pj-title");
    tag(pjDesc, "pj-desc");
    tag(pjItems, "row", "contain");
    [...pjItems.children].forEach((el, k) =>
      tag(el, shown[k] ? "item" + k : "pjitem" + k, "nearest")
    );
    project.showModal();
  }).finished.finally(() => {
    [panel, pjTitle, pjDesc, pjItems, ...pjItems.children].forEach((el) => tag(el));
    busy = false;
  });
}

function closeProject() {
  if (busy || !project.open) return;
  busy = true;
  document.documentElement.classList.add("vt-closing"); 

  const box = sourceBox, originals = sourceItems, shown = sourceShown;
  const row = box.querySelector(".works-items");
  const smallDesc = box.querySelector(".works-desc");

  tag(panel, "works");
  tag(pjTitle, "pj-title");
  tag(pjDesc, "pj-desc");
  tag(pjItems, "row", "contain");
  [...pjItems.children].forEach((el, k) =>
    tag(el, shown[k] ? "item" + k : "pjitem" + k, "nearest")
  );

  vt(() => {
    [panel, pjTitle, pjDesc, pjItems, ...pjItems.children].forEach((el) => tag(el));
    project.close();
    pjItems.replaceChildren();

    tag(box, "works");
    if (smallDesc) tag(smallDesc, "descnew");
    tag(row, "row", "contain");
    originals.forEach((el, k) => { if (shown[k]) tag(el, "item" + k, "nearest"); });
  }).finished.finally(() => {
    document.documentElement.classList.remove("vt-closing");
    [box, smallDesc, row, ...originals].forEach((el) => el && tag(el));
    busy = false;
  });
}

project.addEventListener("cancel", (e) => { e.preventDefault(); closeProject(); });
project.querySelector(".pj-close").addEventListener("click", closeProject);
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