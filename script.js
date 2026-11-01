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

window.addEventListener("wheel", (e) => applyScroll(e.deltaY));

window.addEventListener("pointerdown", (e) => {
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