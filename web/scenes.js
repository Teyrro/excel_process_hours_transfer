"use strict";
/* Сцены фона. Каждая сцена — три SVG-слоя: фон на весь экран (bg) и два угла
   с зверьками (left, right), привязанные к краям экрана, чтобы не обрезаться.
   Зверьки помечены классом .pet; их реакции включаются классами feel-* на слое.
   Элементам с CSS-анимацией нельзя задавать атрибут transform — анимация его перекроет,
   поэтому позиция задаётся внешней группой. */

// Детерминированный генератор: пятна и травинки одинаковые при каждом показе
const seeded = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function wave(y, a, p, dur, color, opacity = 1) {
  let d = `M0,${y}`;
  for (let x = 0; x < 1600 + p * 2; x += p) d += ` q${p / 4},${-a} ${p / 2},0 t${p / 2},0`;
  d += ` L${1600 + p * 2},900 L0,900Z`;
  return `<path class="drift" style="--p:${p};--dur:${dur}s" fill="${color}" opacity="${opacity}" d="${d}"/>`;
}

function clouds(list, color = "#fff", opacity = 0.85) {
  const one = ([y, s, dur, delay]) => `
    <g class="cloud" style="--dur:${dur}s;--delay:${delay}s"><g transform="translate(0,${y}) scale(${s})">
      <ellipse cx="0" cy="0" rx="110" ry="34"/><ellipse cx="-40" cy="-22" rx="60" ry="36"/><ellipse cx="40" cy="-26" rx="70" ry="42"/>
    </g></g>`;
  return `<g filter="url(#soft)" fill="${color}" opacity="${opacity}">${list.map(one).join("")}</g>`;
}

function gulls(list, color) {
  return list.map(([y, s, dur, delay]) => `
    <g class="fly" style="--dur:${dur}s;--delay:${delay}s"><g transform="translate(0,${y}) scale(${s})">
      <path class="flap" style="--flap:${0.6 + s * 0.3}s" d="M-16,0 q8,-9 16,0 q8,-9 16,0" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    </g></g>`).join("");
}

// Маленькая круглая птичка в полёте
function flyer([y, s, dur, delay], color, wing) {
  return `
    <g class="fly" style="--dur:${dur}s;--delay:${delay}s"><g transform="translate(0,${y}) scale(${s})"><g class="glide">
      <path d="M-13,-2 L-28,-9 L-25,5Z" fill="${wing}"/>
      <ellipse cx="0" cy="0" rx="16" ry="11" fill="${color}"/>
      <ellipse cx="4" cy="4" rx="9" ry="5.5" fill="#fff" opacity=".55"/>
      <circle cx="9" cy="-3" r="2.1" fill="#2b2b36"/>
      <path d="M15,-2 L23,0.5 L15,3Z" fill="#f3a64a"/>
      <path class="wing" style="--flap:${0.22 + s * 0.08}s" d="M-6,-2 C-8,-22 6,-26 10,-4Z" fill="${wing}"/>
    </g></g></g>`;
}

function sparkles(n, x0, x1, y0, y1, seed = 7) {
  const r = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += `<ellipse class="sparkle" cx="${x0 + r() * (x1 - x0)}" cy="${y0 + r() * (y1 - y0)}" rx="${6 + r() * 10}" ry="1.5" fill="#fff" style="--dur:${4 + r() * 5}s;--delay:${-r() * 8}s"/>`;
  }
  return out;
}

function dots(n, x0, x1, y0, y1, rmin, rmax, colors, seed) {
  const r = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const c = colors[Math.floor(r() * colors.length)];
    out += `<ellipse cx="${(x0 + r() * (x1 - x0)).toFixed(1)}" cy="${(y0 + r() * (y1 - y0)).toFixed(1)}" rx="${(rmin + r() * (rmax - rmin)).toFixed(1)}" ry="${(rmin + r() * (rmax - rmin)).toFixed(1)}" fill="${c}"/>`;
  }
  return out;
}

function tufts(n, x0, x1, y0, y1, colors, seed, scale = 1) {
  const r = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), s = (0.6 + r() * 0.7) * scale;
    out += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(2)})"><path class="sway" style="--d:${(-r() * 5).toFixed(2)}s" fill="${colors[i % colors.length]}" d="M-12,0 q-4,-22 -14,-34 q14,8 18,24 q-2,-26 6,-44 q2,24 2,44 q6,-18 20,-28 q-10,16 -12,38z"/></g>`;
  }
  return out;
}

function daisy(x, y, s, petal = "#fff", center = "#ffcf4d", delay = 0) {
  const petals = [0, 60, 120, 180, 240, 300]
    .map((a) => `<ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="${petal}" transform="rotate(${a})"/>`).join("");
  return `<g transform="translate(${x},${y}) scale(${s})"><g class="sway" style="--d:${delay}s">
    <path d="M0,0 C2,-14 -2,-26 0,-40" stroke="#78b36e" stroke-width="3" fill="none"/>
    <ellipse cx="-6" cy="-14" rx="7" ry="3" fill="#86c47f" transform="rotate(-30 -6 -14)"/>
    <g transform="translate(0,-44)">${petals}<circle r="5" fill="${center}"/></g>
  </g></g>`;
}

function tree(x, y, s) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <rect x="-5" y="-40" width="10" height="42" rx="4" fill="#9a7b5f"/>
    <g class="sway-tree"><circle cx="0" cy="-66" r="34" fill="#93c584"/><circle cx="-24" cy="-50" r="22" fill="#86bb78"/><circle cx="24" cy="-52" r="24" fill="#9fcf8f"/><circle cx="-8" cy="-80" r="14" fill="#a9d79a" opacity=".8"/></g>
  </g>`;
}

function acacia(x, y, s, canopy = "#a3a35a", trunk = "#8a6a50") {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M-5,0 L5,0 L4,-60 L-4,-60Z" fill="${trunk}"/>
    <path d="M-2,-56 C-6,-80 -20,-96 -48,-112 M2,-56 C6,-84 20,-98 46,-114 M0,-60 C0,-84 2,-100 6,-122" stroke="${trunk}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <g class="sway-tree" fill="${canopy}"><ellipse cx="0" cy="-124" rx="122" ry="20"/><ellipse cx="-56" cy="-116" rx="62" ry="15"/><ellipse cx="62" cy="-118" rx="64" ry="15"/><ellipse cx="8" cy="-138" rx="76" ry="16"/><ellipse cx="-20" cy="-130" rx="40" ry="8" fill="#fff" opacity=".12"/></g>
  </g>`;
}

function giraffe(s, dur, delay, y) {
  return `<g class="wander" style="--dur:${dur}s;--delay:${delay}s"><g transform="translate(0,${y}) scale(${s})" fill="#d1a067">
    <path d="M-28,-40 l-2,40 h6 l3,-36z M-14,-40 l1,40 h6 l-1,-38z M16,-40 l-1,40 h6 l2,-38z M28,-40 l3,40 h6 l-3,-42z"/>
    <ellipse cx="0" cy="-50" rx="38" ry="18"/>
    <path d="M22,-58 L46,-128 L56,-124 L36,-52Z"/>
    <ellipse cx="56" cy="-130" rx="14" ry="8" transform="rotate(20 56 -130)"/>
    <path d="M48,-138 v-10 M54,-140 v-10" stroke="#a87a4a" stroke-width="3" stroke-linecap="round"/>
    <path d="M-36,-52 C-46,-46 -48,-34 -46,-26" stroke="#d1a067" stroke-width="3" fill="none"/>
    <g fill="#b57f4b"><circle cx="-14" cy="-54" r="5"/><circle cx="4" cy="-48" r="5"/><circle cx="18" cy="-56" r="4"/><circle cx="-24" cy="-44" r="4"/><circle cx="40" cy="-94" r="3.5"/><circle cx="34" cy="-74" r="3.5"/></g>
  </g></g>`;
}

const tear = (x, y) =>
  `<g class="tear"><path d="M${x},${y} q-5,9 0,13 q5,-4 0,-13z" fill="#8fd0f0"/></g>`;
const happyEyes = (list, color = "#2b2a33", w = 4.5) =>
  `<g class="eyes-happy" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round">${list
    .map(([x, y, r]) => `<path d="M${x - r},${y + 2} q${r},${-r * 1.2} ${r * 2},0"/>`).join("")}</g>`;

/* ================= Море: белёк, дельфин, кит ================= */
const sea = {
  id: "sea",
  name: "Море",
  accent: "#2f9ab3",
  base: "#cfe9ef",
  bg: () => `
  <defs>
    <linearGradient id="seaSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9dcfea"/><stop offset=".6" stop-color="#e2f1f1"/><stop offset="1" stop-color="#fde6d2"/>
    </linearGradient>
    <radialGradient id="seaSun"><stop offset="0" stop-color="#fff6d8"/><stop offset=".35" stop-color="#ffe9b8" stop-opacity=".7"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient>
    <linearGradient id="seaWhale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7896c6"/><stop offset="1" stop-color="#5677a8"/></linearGradient>
    <linearGradient id="seaJump" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ea6cc"/><stop offset="1" stop-color="#a9c8e2"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#seaSky)"/>
  <circle class="sun-glow" cx="1300" cy="210" r="190" fill="url(#seaSun)"/>
  <circle cx="1300" cy="210" r="60" fill="#fff4d0"/>
  ${clouds([[150, 1, 160, -40], [260, 0.8, 210, -150], [90, 0.7, 180, -100], [210, 0.6, 240, -20]])}
  ${gulls([[180, 1, 70, -10], [215, 0.8, 80, -30], [140, 0.7, 90, -60], [300, 0.6, 75, -45]], "#6b7a88")}

  <path d="M110,577 C170,540 240,528 300,546 C340,530 400,536 450,577Z" fill="#a9c9c2"/>
  <path d="M150,560 C200,540 250,536 290,548" stroke="#c4ded6" stroke-width="5" fill="none" stroke-linecap="round"/>
  <g transform="translate(360,500)">
    <rect x="-7" y="0" width="14" height="42" rx="3" fill="#f4f1ea"/>
    <rect x="-7" y="12" width="14" height="7" fill="#e58f86"/><rect x="-7" y="28" width="14" height="7" fill="#e58f86"/>
    <rect x="-10" y="-9" width="20" height="10" rx="3" fill="#7a8a94"/>
    <circle class="beacon" cx="0" cy="-4" r="18" fill="#fff3b0"/>
  </g>

  <rect y="575" width="1600" height="325" fill="#b4e0e6"/>
  ${wave(598, 5, 260, 28, "#b8e2e8")}
  ${wave(628, 7, 220, 21, "#9fd4de")}
  <g class="swim-slow"><g transform="translate(300,662) scale(.62)"><g class="whale-bob">
    <g class="spout" fill="#fff">
      <path d="M-70,-80 C-74,-120 -100,-140 -124,-140 M-70,-80 C-66,-120 -40,-140 -16,-140 M-70,-80 V-152" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>
      <circle cx="-126" cy="-140" r="9"/><circle cx="-14" cy="-140" r="9"/><circle cx="-70" cy="-156" r="10"/>
    </g>
    <path d="M150,-14 C185,-30 205,-70 196,-100 C214,-80 240,-74 262,-82 C246,-50 214,-18 170,4Z" fill="url(#seaWhale)"/>
    <path d="M-175,0 C-175,-55 -95,-82 0,-80 C80,-78 140,-50 172,-8 C150,24 70,40 0,40 C-90,40 -175,36 -175,0Z" fill="url(#seaWhale)"/>
    <ellipse cx="-60" cy="-58" rx="80" ry="12" fill="#fff" opacity=".2"/>
    <circle cx="-118" cy="-20" r="7.5" fill="#25303f"/><circle cx="-115.5" cy="-22.5" r="2.6" fill="#fff"/>
    <path d="M-170,0 q28,14 58,6" stroke="#3e5a85" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="-104" cy="-2" rx="11" ry="6" fill="#f2a7b8" opacity=".6"/>
  </g></g></g>
  ${wave(662, 8, 300, 17, "#8ac8d7")}
  ${jumper("M1080,780 Q1180,440 1280,780", 9, 0, 1)}
  ${jumper("M1250,790 Q1340,470 1430,790", 9, -4.2, 0.8)}
  ${wave(712, 10, 300, 15, "#78bdd0")}
  ${wave(790, 12, 340, 12, "#68b2c7")}
  ${sparkles(18, 1000, 1600, 600, 740)}
  ${sparkles(8, 0, 500, 600, 700, 3)}`,

  left: () => `
  <defs>
    <linearGradient id="seaSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e4c8"/><stop offset="1" stop-color="#ecd2ac"/></linearGradient>
    <radialGradient id="seaSeal" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3e1dd"/></radialGradient>
  </defs>
  <path class="foam" d="M-20,694 C250,684 520,754 770,910 L740,910 C500,770 240,706 -20,712Z" fill="#fff"/>
  <path d="M0,705 C250,695 520,765 760,900 L0,900Z" fill="url(#seaSand)"/>
  ${dots(26, 20, 600, 760, 890, 1.5, 3, ["#e3c79f", "#f9eedd"], 11)}
  <g transform="translate(560,862) rotate(18)"><path d="M0,-14 L4,-4 L14,-3 L6,4 L9,14 L0,8 L-9,14 L-6,4 L-14,-3 L-4,-4Z" fill="#f4a483"/><circle r="2" fill="#fbd0b6"/></g>
  <g transform="translate(110,870)"><path d="M0,0 C-14,-4 -16,-20 0,-24 C16,-20 14,-4 0,0Z" fill="#f7cfc8"/><path d="M0,0 L-6,-20 M0,0 L0,-23 M0,0 L6,-20" stroke="#e7aaa1" stroke-width="1.6"/></g>
  <g transform="translate(330,800)">
    <ellipse cx="20" cy="66" rx="160" ry="16" fill="#000" opacity=".06"/>
    <g class="pet" data-pet="seal"><g class="breathe">
      <g filter="url(#fur)" fill="url(#seaSeal)">
        <ellipse cx="160" cy="30" rx="34" ry="15" transform="rotate(-22 160 30)"/>
        <ellipse cx="160" cy="50" rx="30" ry="13" transform="rotate(16 160 50)"/>
        <ellipse cx="30" cy="12" rx="138" ry="56"/>
        <circle cx="-85" cy="-24" r="62"/>
      </g>
      <g class="flipper"><ellipse cx="-15" cy="52" rx="32" ry="13" fill="#ebe8e3" filter="url(#fur)" transform="rotate(18 -15 52)"/></g>
      <ellipse cx="-96" cy="-66" rx="30" ry="12" fill="#fff" opacity=".7"/>
      <g class="eyes"><g class="blink">
        <ellipse cx="-110" cy="-36" rx="11" ry="12.5" fill="#2b2a33"/><ellipse cx="-60" cy="-36" rx="11" ry="12.5" fill="#2b2a33"/>
        <circle cx="-106.5" cy="-40.5" r="3.8" fill="#fff"/><circle cx="-56.5" cy="-40.5" r="3.8" fill="#fff"/>
        <circle cx="-113" cy="-31" r="1.6" fill="#fff" opacity=".8"/><circle cx="-63" cy="-31" r="1.6" fill="#fff" opacity=".8"/>
      </g></g>
      ${happyEyes([[-110, -36, 11], [-60, -36, 11]])}
      <ellipse cx="-128" cy="-12" rx="12" ry="7" fill="#ffc6cf" opacity=".75"/>
      <ellipse cx="-42" cy="-12" rx="12" ry="7" fill="#ffc6cf" opacity=".75"/>
      <ellipse cx="-85" cy="-19" rx="9" ry="6" fill="#3a3540"/>
      <path d="M-95,-10 q5,6 10,0 q5,6 10,0" fill="none" stroke="#3a3540" stroke-width="2.4" stroke-linecap="round"/>
      <g fill="#b9b4ae"><circle cx="-104" cy="-8" r="1.6"/><circle cx="-108" cy="-2" r="1.6"/><circle cx="-66" cy="-8" r="1.6"/><circle cx="-62" cy="-2" r="1.6"/></g>
      <path d="M-112,-6 l-26,-4 M-112,-2 l-26,4 M-58,-6 l26,-4 M-58,-2 l26,4" stroke="#cfcac4" stroke-width="1.4" stroke-linecap="round"/>
      ${tear(-114, -24)}
    </g></g>
  </g>`,

  right: () => `
  <defs>
    <linearGradient id="seaDol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a3c5e2"/><stop offset="1" stop-color="#6f96bf"/></linearGradient>
    <clipPath id="seaDolClip"><path d="M-44,90 C-50,20 -46,-50 -22,-92 C-8,-116 22,-122 40,-104 C58,-86 60,-40 56,10 L54,90Z"/></clipPath>
  </defs>
  <path d="M1440,900 C1436,826 1482,786 1542,790 C1602,794 1622,850 1622,900Z" fill="#a5adb3"/>
  <path d="M1470,808 C1500,792 1540,790 1566,800" stroke="#fff" stroke-opacity=".35" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M1450,846 C1472,826 1500,834 1524,822" stroke="#94b88e" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M1520,900 C1520,860 1546,846 1572,850 C1600,856 1610,880 1610,900Z" fill="#8f979d"/>
  <g transform="translate(1290,826)">
    <g class="pet" data-pet="dolphin"><g class="bob">
      <path d="M52,-34 C80,-30 94,-10 92,12 C78,-2 64,-8 54,-6Z" fill="#6f96bf"/>
      <path d="M-44,90 C-50,20 -46,-50 -22,-92 C-8,-116 22,-122 40,-104 C58,-86 60,-40 56,10 L54,90Z" fill="url(#seaDol)"/>
      <g clip-path="url(#seaDolClip)"><ellipse cx="-38" cy="14" rx="28" ry="92" fill="#e6f1f8"/></g>
      <path d="M-24,-88 C-56,-90 -82,-82 -86,-72 C-82,-62 -58,-60 -26,-64Z" fill="#a3c5e2"/>
      <path d="M-84,-70 C-66,-64 -48,-64 -28,-68" stroke="#4d6f94" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="8" cy="-104" rx="22" ry="8" fill="#fff" opacity=".4"/>
      <g class="eyes"><g class="blink"><circle cx="-6" cy="-84" r="7.5" fill="#26303c"/><circle cx="-3.5" cy="-86.5" r="2.6" fill="#fff"/></g></g>
      ${happyEyes([[-6, -84, 7]], "#26303c", 4)}
      <ellipse cx="-20" cy="-64" rx="8" ry="5" fill="#f4a9bb" opacity=".7"/>
      <g class="fin"><ellipse cx="-30" cy="-8" rx="30" ry="11" fill="#7ea4c9"/></g>
      ${tear(-10, -72)}
    </g></g>
  </g>
  <ellipse class="ripple" cx="1290" cy="872" rx="72" ry="9" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>
  <path d="M880,870 ${"q30,-8 60,0 t60,0 ".repeat(7)} L1600,900 L880,900Z" fill="#68b2c7"/>`,
};

// Дельфин, прыгающий по дуге; большую часть цикла он под водой (keyPoints)
function jumper(path, dur, begin, scale) {
  const end = path.match(/(-?\d+),(-?\d+)$/);
  return `
  <g><g transform="scale(${scale})">
    <path d="M-40,0 l-14,-11 q5,11 0,22z" fill="#6f97bb"/>
    <path d="M-42,0 C-30,-15 0,-19 22,-13 C34,-9 44,-6 52,-2 C44,2 32,4 22,6 C0,12 -28,10 -42,0Z" fill="url(#seaJump)"/>
    <path d="M-4,-16 q6,-14 18,-16 q-6,8 -5,16z" fill="#6f97bb"/>
    <path d="M6,6 q4,8 12,10 q-2,-6 -4,-10z" fill="#6f97bb"/>
    <circle cx="27" cy="-6" r="2.4" fill="#26303c"/><circle cx="27.6" cy="-6.8" r=".9" fill="#fff"/>
    <path d="M36,1 q6,1 12,-1" stroke="#4d6f94" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </g><animateMotion path="${path}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;1" keyTimes="0;.3;1" calcMode="linear"/></g>
  <g opacity="0" fill="#fff">
    <ellipse cx="${end[1]}" cy="712" rx="30" ry="6"/><circle cx="${end[1] - 14}" cy="696" r="5"/><circle cx="${+end[1] + 12}" cy="690" r="6"/><circle cx="${end[1]}" cy="684" r="4"/>
    <animate attributeName="opacity" values="0;0;.95;0;0" keyTimes="0;.24;.27;.4;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
  </g>`;
}

/* ================= Саванна: гепард и сурикаты ================= */
const savanna = {
  id: "savanna",
  name: "Саванна",
  accent: "#d9823b",
  base: "#fbe2bd",
  bg: () => `
  <defs>
    <linearGradient id="savSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f5b98e"/><stop offset=".5" stop-color="#fbd8a6"/><stop offset="1" stop-color="#fff0d2"/>
    </linearGradient>
    <radialGradient id="savSun"><stop offset="0" stop-color="#fff2c4"/><stop offset=".4" stop-color="#ffd98f" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98f" stop-opacity="0"/></radialGradient>
    <linearGradient id="savGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efd093"/><stop offset="1" stop-color="#dcae6b"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#savSky)"/>
  <circle class="sun-glow" cx="1260" cy="460" r="280" fill="url(#savSun)"/>
  <circle cx="1260" cy="460" r="104" fill="#ffe6a6"/>
  <circle cx="1260" cy="460" r="104" fill="none" stroke="#fff3cf" stroke-width="6" opacity=".6"/>
  ${clouds([[130, 0.9, 200, -60], [230, 0.7, 240, -170], [80, 0.6, 260, -90]], "#fff3e6", 0.7)}
  ${gulls([[200, 0.8, 90, -20], [225, 0.6, 100, -50], [182, 0.6, 95, -70], [250, 0.5, 110, -30]], "#9a6c58")}
  <path d="M0,600 C160,560 300,575 460,590 C640,556 820,568 1000,590 C1200,556 1400,572 1600,584 L1600,620 L0,620Z" fill="#e7b688" opacity=".75"/>
  <path d="M0,612 C200,596 400,600 600,610 C800,598 1000,602 1200,612 C1400,600 1500,604 1600,608 L1600,900 L0,900Z" fill="url(#savGround)"/>
  ${acacia(1100, 610, 0.55, "#b2ad68")}
  ${giraffe(0.62, 380, -120, 618)}
  ${giraffe(0.5, 380, -150, 616)}
  ${giraffe(0.4, 420, -300, 614)}
  ${acacia(240, 640, 1.35)}
  ${acacia(1460, 630, 0.95)}
  ${dots(60, 0, 1600, 640, 880, 1.5, 3.5, ["#d8a765", "#f3d9a2"], 5)}
  ${tufts(34, 0, 1600, 660, 900, ["#d4a862", "#c99d58", "#ddb572"], 17, 0.7)}`,

  left: () => `
  <defs>
    <linearGradient id="savRock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcb990"/><stop offset="1" stop-color="#b48a63"/></linearGradient>
    <radialGradient id="savCh" cx=".45" cy=".3" r=".8"><stop offset="0" stop-color="#ffdc9c"/><stop offset="1" stop-color="#e8ad5f"/></radialGradient>
    <clipPath id="savChBody">
      <path d="M-170,-6 C-176,-50 -120,-84 -30,-84 C50,-84 110,-76 140,-52 C156,-38 152,-6 136,0 L-160,0 C-168,0 -170,-2 -170,-6Z"/>
      <ellipse cx="-116" cy="-36" rx="58" ry="40"/>
    </clipPath>
  </defs>
  <path d="M0,836 C200,818 500,826 800,846 L800,900 L0,900Z" fill="#dcae6b"/>
  <path d="M40,900 C40,810 110,770 250,762 C400,754 560,770 630,830 C660,858 668,880 668,900Z" fill="url(#savRock)"/>
  <path d="M130,792 C200,772 300,768 380,770" stroke="#fff" stroke-opacity=".35" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M470,800 l20,30 l-6,24 M200,850 l24,-12 l18,10" stroke="#9e7656" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
  ${tufts(10, 20, 700, 870, 900, ["#c7964f", "#b8874a"], 23, 1.2)}
  <g transform="translate(330,766)">
    <ellipse cx="10" cy="2" rx="210" ry="9" fill="#000" opacity=".08"/>
    <g class="pet" data-pet="cheetah"><g class="breathe">
      <g class="tail">
        <path d="M-150,-52 C-212,-52 -238,-10 -228,42 C-226,58 -208,62 -204,50 C-210,10 -196,-24 -150,-28Z" fill="url(#savCh)"/>
        <path d="M-196,-40 q8,10 -2,20 M-214,-14 q9,8 0,20 M-220,14 q9,7 0,18" stroke="#3a2a22" stroke-width="5" fill="none" stroke-linecap="round"/>
        <circle cx="-215" cy="48" r="10" fill="#fff6e6"/>
      </g>
      <path d="M-170,-6 C-176,-50 -120,-84 -30,-84 C50,-84 110,-76 140,-52 C156,-38 152,-6 136,0 L-160,0 C-168,0 -170,-2 -170,-6Z" fill="url(#savCh)"/>
      <ellipse cx="-116" cy="-36" rx="58" ry="40" fill="url(#savCh)"/>
      <g clip-path="url(#savChBody)">
        <ellipse cx="-10" cy="2" rx="150" ry="16" fill="#fbe7c4"/>
        <g fill="#6b4a2e">${spotsOn(70, -170, 150, -84, -10, 31)}</g>
      </g>
      <path d="M-170,-40 C-160,-74 -96,-80 -66,-50" stroke="#c98a45" stroke-width="2" fill="none" opacity=".5"/>
      <ellipse cx="-80" cy="-5" rx="32" ry="9" fill="#e9b165"/>
      <path d="M96,-30 L200,-30 C216,-30 218,-12 202,-12 L96,-12Z" fill="#e2a557"/>
      <path d="M90,-24 L214,-22 C232,-22 236,2 216,2 L90,2Z" fill="url(#savCh)"/>
      <g fill="#6b4a2e"><circle cx="120" cy="-14" r="3"/><circle cx="146" cy="-8" r="3"/><circle cx="170" cy="-14" r="2.6"/><circle cx="132" cy="-24" r="2.4"/></g>
      <path d="M204,-8 v8 M213,-8 v8" stroke="#c98a45" stroke-width="2" stroke-linecap="round"/>
      <g class="head-tilt">
        <circle cx="112" cy="-114" r="15" fill="#e8ad5f"/><circle cx="112" cy="-113" r="8" fill="#fbe7c4"/>
        <circle cx="188" cy="-114" r="15" fill="#e8ad5f"/><circle cx="188" cy="-113" r="8" fill="#fbe7c4"/>
        <ellipse cx="150" cy="-80" rx="50" ry="42" fill="url(#savCh)"/>
        <ellipse cx="140" cy="-108" rx="18" ry="7" fill="#fff" opacity=".3"/>
        <g fill="#6b4a2e"><circle cx="138" cy="-110" r="2.6"/><circle cx="150" cy="-114" r="2.6"/><circle cx="162" cy="-110" r="2.6"/><circle cx="144" cy="-102" r="2.2"/><circle cx="156" cy="-102" r="2.2"/><circle cx="112" cy="-84" r="2.4"/><circle cx="188" cy="-84" r="2.4"/></g>
        <ellipse cx="150" cy="-56" rx="27" ry="17" fill="#fff5e4"/>
        <path d="M127,-80 C122,-72 119,-66 116,-60 M173,-80 C178,-72 181,-66 184,-60" stroke="#4a3328" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <g class="eyes"><g class="blink">
          <ellipse cx="133" cy="-88" rx="8.5" ry="9.5" fill="#e09a3a"/><ellipse cx="167" cy="-88" rx="8.5" ry="9.5" fill="#e09a3a"/>
          <circle cx="133" cy="-87" r="5.4" fill="#2a1d18"/><circle cx="167" cy="-87" r="5.4" fill="#2a1d18"/>
          <circle cx="135.6" cy="-90" r="2.2" fill="#fff"/><circle cx="169.6" cy="-90" r="2.2" fill="#fff"/>
        </g></g>
        ${happyEyes([[133, -88, 8], [167, -88, 8]], "#3a2a22", 4)}
        <path d="M142,-64 h16 q0,6 -8,10 q-8,-4 -8,-10z" fill="#5a3a2c"/>
        <path d="M150,-54 v5 M150,-49 q-6,7 -12,2 M150,-49 q6,7 12,2" stroke="#5a3a2c" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <ellipse cx="121" cy="-62" rx="8" ry="5" fill="#f6a7a0" opacity=".6"/><ellipse cx="179" cy="-62" rx="8" ry="5" fill="#f6a7a0" opacity=".6"/>
        <g fill="#c99a6a"><circle cx="138" cy="-56" r="1.4"/><circle cx="134" cy="-51" r="1.4"/><circle cx="162" cy="-56" r="1.4"/><circle cx="166" cy="-51" r="1.4"/></g>
        ${tear(128, -76)}
      </g>
    </g></g>
  </g>`,

  right: () => `
  <defs>
    <linearGradient id="savMk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d4aa7c"/><stop offset=".5" stop-color="#e9c99f"/><stop offset="1" stop-color="#cca272"/></linearGradient>
  </defs>
  <path d="M960,900 C1040,830 1200,800 1340,804 C1480,808 1580,840 1620,900Z" fill="#e0b97c"/>
  <path d="M1080,840 C1160,816 1260,808 1340,810" stroke="#f1d29c" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="1150" cy="852" rx="46" ry="13" fill="#7a5638" opacity=".75"/>
  ${dots(20, 980, 1600, 830, 895, 1.5, 3, ["#c89a5e", "#f2d7a6"], 9)}
  ${tufts(8, 960, 1600, 860, 900, ["#c7964f", "#b8874a"], 29, 1.2)}
  ${meerkat(1352, 814, 1, 0)}
  ${meerkat(1236, 830, 0.72, -4)}`,
};

function spotsOn(n, x0, x1, y0, y1, seed) {
  const r = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const rx = 2.5 + r() * 3.5;
    out += `<ellipse cx="${(x0 + r() * (x1 - x0)).toFixed(1)}" cy="${(y0 + r() * (y1 - y0)).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * (0.75 + r() * 0.3)).toFixed(1)}"/>`;
  }
  return out;
}

function meerkat(x, y, s, delay) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <ellipse cx="0" cy="2" rx="40" ry="7" fill="#000" opacity=".08"/>
    <g class="pet" data-pet="meerkat"><g class="breathe" style="animation-delay:${delay}s">
      <path d="M20,-6 C46,-6 66,4 80,-4 C74,8 50,10 18,6Z" fill="#c99d6f"/><path d="M70,-2 L80,-4 C76,4 72,6 64,6Z" fill="#5a4130"/>
      <path d="M-30,0 C-40,-50 -34,-108 -16,-138 L16,-138 C34,-108 40,-50 30,0Z" fill="url(#savMk)"/>
      <ellipse cx="0" cy="-58" rx="17" ry="48" fill="#f3e0bf"/>
      <g stroke="#c99d6f" stroke-width="2" opacity=".5" stroke-linecap="round"><path d="M-26,-60 h8 M-28,-44 h8 M18,-60 h8 M20,-44 h8"/></g>
      <ellipse cx="-16" cy="-2" rx="15" ry="6" fill="#c99d6f"/><ellipse cx="16" cy="-2" rx="15" ry="6" fill="#c99d6f"/>
      <g fill="#cfa577"><ellipse cx="-13" cy="-104" rx="7" ry="15"/><ellipse cx="13" cy="-104" rx="7" ry="15"/></g>
      <g fill="#6b4c36"><ellipse cx="-13" cy="-90" rx="5" ry="3"/><ellipse cx="13" cy="-90" rx="5" ry="3"/></g>
      <g class="look" style="animation-delay:${delay}s">
        <circle cx="-27" cy="-176" r="7" fill="#5a4130"/><circle cx="27" cy="-176" r="7" fill="#5a4130"/>
        <path d="M-30,-174 C-30,-204 30,-204 30,-174 C30,-150 12,-134 0,-132 C-12,-134 -30,-150 -30,-174Z" fill="url(#savMk)"/>
        <path d="M0,-198 v14" stroke="#b98d60" stroke-width="5" stroke-linecap="round" opacity=".55"/>
        <ellipse cx="-12" cy="-170" rx="9" ry="11" fill="#5a4130" opacity=".85"/><ellipse cx="12" cy="-170" rx="9" ry="11" fill="#5a4130" opacity=".85"/>
        <g class="eyes"><g class="blink">
          <circle cx="-12" cy="-170" r="5.2" fill="#1a1310"/><circle cx="12" cy="-170" r="5.2" fill="#1a1310"/>
          <circle cx="-10.4" cy="-172" r="1.9" fill="#fff"/><circle cx="13.6" cy="-172" r="1.9" fill="#fff"/>
        </g></g>
        ${happyEyes([[-12, -170, 5], [12, -170, 5]], "#fff3dc", 3)}
        <ellipse cx="0" cy="-141" rx="5.5" ry="3.8" fill="#3a2a22"/>
        <path d="M-4,-135 q4,4 8,0" stroke="#3a2a22" stroke-width="2" fill="none" stroke-linecap="round"/>
        <ellipse cx="-20" cy="-151" rx="6" ry="4" fill="#f4a39a" opacity=".65"/><ellipse cx="20" cy="-151" rx="6" ry="4" fill="#f4a39a" opacity=".65"/>
        ${tear(-14, -158)}
      </g>
    </g></g>
  </g>`;
}

/* ================= Небо: зимородок, колибри, стаи птиц ================= */
const sky = {
  id: "sky",
  name: "Небо",
  accent: "#5b7fe0",
  base: "#d7e2fb",
  bg: () => `
  <defs>
    <linearGradient id="skySky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9cc0f2"/><stop offset=".55" stop-color="#cfdcfa"/><stop offset="1" stop-color="#fbe2ea"/>
    </linearGradient>
    <radialGradient id="skySun"><stop offset="0" stop-color="#fff8e6"/><stop offset=".4" stop-color="#ffe2ec" stop-opacity=".6"/><stop offset="1" stop-color="#ffe2ec" stop-opacity="0"/></radialGradient>
    <linearGradient id="skyBalloon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9db5"/><stop offset="1" stop-color="#f06d92"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#skySky)"/>
  <circle class="sun-glow" cx="1290" cy="180" r="220" fill="url(#skySun)"/>
  <circle cx="1290" cy="180" r="56" fill="#fff8ea"/>
  ${clouds([[120, 1.2, 170, -30], [250, 0.9, 220, -120], [360, 1.1, 200, -170], [180, 0.7, 240, -60], [420, 0.8, 260, -10]], "#fff", 0.9)}
  <g class="balloon"><g transform="translate(1380,330)">
    <path d="M0,-70 C44,-70 60,-34 56,-6 C52,22 18,46 8,60 L-8,60 C-18,46 -52,22 -56,-6 C-60,-34 -44,-70 0,-70Z" fill="url(#skyBalloon)"/>
    <path d="M0,-70 C18,-60 22,-20 20,10 C18,36 10,50 6,60 M0,-70 C-18,-60 -22,-20 -20,10 C-18,36 -10,50 -6,60" stroke="#fff" stroke-width="7" fill="none" opacity=".75"/>
    <ellipse cx="-22" cy="-40" rx="10" ry="18" fill="#fff" opacity=".3"/>
    <path d="M-7,60 L-9,78 M7,60 L9,78" stroke="#9b7b62" stroke-width="2"/>
    <rect x="-11" y="78" width="22" height="16" rx="4" fill="#b48a66"/>
  </g></g>
  <g class="fly" style="--dur:110s;--delay:-20s"><g transform="translate(0,230)">
    ${[[0, 0], [-34, -16], [-34, 16], [-68, -32], [-68, 32], [-102, -48], [-102, 48]]
      .map(([x, y], i) => `<g transform="translate(${x},${y}) scale(1.3)"><path class="flap" style="--flap:${0.9 + i * 0.05}s" d="M-16,0 q8,-9 16,0 q8,-9 16,0" fill="none" stroke="#6576a3" stroke-width="2.6" stroke-linecap="round"/></g>`).join("")}
  </g></g>
  ${flyer([150, 1.1, 46, -5], "#f28aa0", "#e46b86")}
  ${flyer([300, 0.9, 58, -30], "#f6c453", "#e7a93a")}
  ${flyer([470, 1, 52, -18], "#6cc3e8", "#4aa6d2")}
  ${flyer([390, 0.8, 64, -50], "#9fd88a", "#7fc06a")}
  ${gulls([[100, 0.6, 90, -40], [130, 0.5, 100, -70]], "#7d8bb3")}
  <path d="M0,700 L170,570 L250,616 L390,500 L540,640 L690,560 L860,670 L1010,548 L1160,628 L1300,520 L1460,640 L1600,580 L1600,900 L0,900Z" fill="#b6c4ea"/>
  <g fill="#fff" opacity=".9">
    <path d="M390,500 L358,530 L374,526 L390,540 L406,526 L420,532Z"/>
    <path d="M1300,520 L1268,550 L1284,546 L1300,560 L1316,546 L1330,552Z"/>
    <path d="M1010,548 L986,570 L1000,567 L1012,578 L1024,566 L1036,571Z"/>
    <path d="M170,570 L146,590 L160,588 L172,598 L184,588 L194,592Z"/>
  </g>
  <path d="M0,760 C200,700 400,720 600,750 C800,710 1000,720 1200,750 C1400,716 1500,726 1600,736 L1600,900 L0,900Z" fill="#a3b8e2"/>
  <path d="M0,820 C300,786 600,798 900,820 C1200,796 1400,802 1600,812 L1600,900 L0,900Z" fill="#bfe0c8"/>
  ${dots(70, 0, 1600, 830, 900, 2, 4, ["#fff", "#ffc2d1", "#ffe08a", "#c8b8ff"], 41)}`,

  left: () => `
  <defs>
    <linearGradient id="skyKf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#52b8ec"/><stop offset="1" stop-color="#2a86c8"/></linearGradient>
  </defs>
  <path d="M-30,792 C120,772 260,774 420,750 C480,742 540,726 600,710" stroke="#8a6a52" stroke-width="18" fill="none" stroke-linecap="round"/>
  <path d="M-30,792 C120,772 260,774 420,750" stroke="#a88466" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6" transform="translate(0,-5)"/>
  <path d="M200,778 C230,742 252,722 284,712 M470,740 C500,762 530,772 562,772 M90,786 C80,820 84,850 100,876" stroke="#8a6a52" stroke-width="7" fill="none" stroke-linecap="round"/>
  <g fill="#8cc68a">
    <ellipse cx="292" cy="708" rx="18" ry="7" transform="rotate(-24 292 708)"/><ellipse cx="572" cy="772" rx="18" ry="7" transform="rotate(14 572 772)"/>
    <ellipse cx="104" cy="882" rx="16" ry="6" transform="rotate(60 104 882)"/><ellipse cx="610" cy="704" rx="18" ry="7" transform="rotate(-30 610 704)"/>
    <ellipse cx="160" cy="770" rx="15" ry="6" transform="rotate(-50 160 770)" fill="#79b877"/>
  </g>
  ${blossom(250, 730, 1)}${blossom(520, 724, 0.9)}${blossom(60, 774, 0.8)}${blossom(440, 736, 0.7)}${blossom(560, 766, 0.75)}
  <g transform="translate(330,754) scale(1.25)">
    <g class="pet" data-pet="kingfisher"><g class="bob">
      <path d="M-30,-22 L-74,4 C-72,12 -64,14 -58,10 L-26,-8Z" fill="#2a7fbf"/>
      <ellipse cx="0" cy="-36" rx="38" ry="36" fill="url(#skyKf)"/>
      <path d="M-10,-40 C10,-52 38,-44 38,-28 C38,-6 16,2 0,0 C-12,-2 -18,-20 -10,-40Z" fill="#f6a65e"/>
      <path d="M-36,-44 C-26,-64 8,-62 14,-40 C10,-18 -20,-12 -40,-22Z" fill="#2b8fd3"/>
      <g fill="#a6e2ff"><circle cx="-14" cy="-46" r="2.6"/><circle cx="-2" cy="-40" r="2.6"/><circle cx="-24" cy="-36" r="2.6"/><circle cx="-10" cy="-30" r="2.6"/><circle cx="-28" cy="-48" r="2"/></g>
      <path d="M-6,-2 v7 M8,-2 v7" stroke="#ef7b5a" stroke-width="4" stroke-linecap="round"/>
      <g class="head-tilt">
        <circle cx="14" cy="-74" r="28" fill="url(#skyKf)"/>
        <path d="M-6,-96 q8,-12 20,-7 q-6,4 -5,9z" fill="#2a86c8"/>
        <ellipse cx="4" cy="-90" rx="12" ry="5" fill="#fff" opacity=".35"/>
        <ellipse cx="22" cy="-70" rx="15" ry="7" fill="#f6a65e"/>
        <ellipse cx="28" cy="-54" rx="12" ry="8" fill="#fff"/>
        <g class="eyes"><g class="blink"><circle cx="24" cy="-81" r="6.2" fill="#1e2430"/><circle cx="26.2" cy="-83.2" r="2.3" fill="#fff"/></g></g>
        ${happyEyes([[24, -81, 6]], "#1e2430", 3.4)}
        <path d="M38,-80 L74,-72 L38,-65Z" fill="#33333f"/>
        <ellipse cx="12" cy="-60" rx="6" ry="4" fill="#ff9fb0" opacity=".65"/>
        ${tear(20, -72)}
      </g>
    </g></g>
  </g>`,

  right: () => `
  <defs>
    <linearGradient id="skyHb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fd6a8"/><stop offset="1" stop-color="#2b8f74"/></linearGradient>
  </defs>
  <path d="M1460,900 C1452,840 1422,790 1402,736" stroke="#6fae6a" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M1448,830 C1490,810 1512,790 1522,768 C1492,774 1462,790 1448,830Z" fill="#86c47f"/>
  <path d="M1430,792 C1392,782 1372,762 1362,742 C1392,746 1420,762 1430,792Z" fill="#7dbb76"/>
  <g transform="translate(1400,730)"><g class="sway" style="--d:-1s">
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-28" rx="21" ry="30" fill="#f58bb0" transform="rotate(${a})"/>`).join("")}
    ${[36, 108, 180, 252, 324].map((a) => `<ellipse cx="0" cy="-20" rx="10" ry="16" fill="#ffb3cb" transform="rotate(${a})"/>`).join("")}
    <circle r="11" fill="#ffd36b"/>
    <path d="M0,0 L-26,-18" stroke="#e8507f" stroke-width="3" stroke-linecap="round"/><circle cx="-28" cy="-19" r="4" fill="#ffd36b"/>
  </g></g>
  ${daisy(1540, 900, 1.3, "#fff", "#ffcf4d", -2)}${daisy(1220, 900, 1.1, "#ffd1e0", "#ffcf4d", -3)}${daisy(1110, 900, 0.9, "#fff", "#ffcf4d", -1)}
  ${tufts(12, 900, 1600, 890, 902, ["#8fc58a", "#7db978"], 43, 1.1)}
  <g transform="translate(1268,702)">
    <g class="pet" data-pet="hummingbird"><g class="hover">
      <g class="buzz"><ellipse cx="-6" cy="-28" rx="10" ry="30" fill="#d9f4ec" opacity=".7"/></g>
      <path d="M-24,6 L-50,24 L-42,30 L-20,14Z" fill="#2f8f72"/>
      <ellipse cx="0" cy="0" rx="28" ry="15" fill="url(#skyHb)"/>
      <ellipse cx="4" cy="6" rx="18" ry="7" fill="#e8f7ef"/>
      <ellipse cx="18" cy="-4" rx="10" ry="8" fill="#e8467c"/>
      <circle cx="24" cy="-14" r="14" fill="url(#skyHb)"/>
      <ellipse cx="20" cy="-22" rx="7" ry="3" fill="#fff" opacity=".35"/>
      <g class="eyes"><g class="blink"><circle cx="28" cy="-17" r="3.8" fill="#1b2026"/><circle cx="29.4" cy="-18.4" r="1.4" fill="#fff"/></g></g>
      ${happyEyes([[28, -17, 4]], "#1b2026", 2.6)}
      <path d="M37,-14 L80,-6" stroke="#2a2a33" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="22" cy="-8" rx="4" ry="2.6" fill="#ff9fb0" opacity=".7"/>
      <g class="buzz" style="animation-delay:-.06s"><ellipse cx="-2" cy="-30" rx="11" ry="32" fill="#effffa" opacity=".85"/></g>
      ${tear(26, -10)}
    </g></g>
  </g>`,
};

function blossom(x, y, s) {
  const petals = [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="0" cy="-9" rx="7" ry="9" fill="#ffc6d6" transform="rotate(${a})"/>`).join("");
  return `<g transform="translate(${x},${y}) scale(${s})">${petals}<circle r="4.5" fill="#ff8fb0"/><circle r="2" fill="#ffe08a"/></g>`;
}

/* ================= Луг: зайка и утёнок в пруду ================= */
const meadow = {
  id: "meadow",
  name: "Луг",
  accent: "#4fa36a",
  base: "#dff1e0",
  bg: () => `
  <defs>
    <linearGradient id="mdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6dff5"/><stop offset=".7" stop-color="#e9f6f0"/><stop offset="1" stop-color="#f7f3df"/></linearGradient>
    <radialGradient id="mdSun"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#fff0b8" stop-opacity=".7"/><stop offset="1" stop-color="#fff0b8" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#mdSky)"/>
  <circle class="sun-glow" cx="1280" cy="190" r="200" fill="url(#mdSun)"/>
  <circle cx="1280" cy="190" r="58" fill="#fff6c8"/>
  ${clouds([[140, 1, 170, -50], [240, 0.8, 220, -140], [100, 0.7, 190, -90]])}
  ${gulls([[200, 0.6, 90, -20], [230, 0.5, 100, -60]], "#7a8a7a")}
  <path d="M0,600 C200,540 420,560 600,590 C800,540 1000,550 1200,585 C1380,545 1500,560 1600,575 L1600,900 L0,900Z" fill="#cfe7c3"/>
  ${tree(230, 580, 0.9)}${tree(300, 590, 0.65)}${tree(1380, 572, 0.85)}${tree(1450, 580, 0.6)}
  <path d="M0,680 C260,630 520,650 760,690 C1000,640 1300,650 1600,680 L1600,900 L0,900Z" fill="#b5daa5"/>
  ${dots(50, 0, 1600, 690, 770, 1.5, 3, ["#fff", "#ffd1e0", "#ffe58a"], 51)}
  <path d="M0,780 C300,740 600,760 900,790 C1200,750 1400,760 1600,775 L1600,900 L0,900Z" fill="#a1cf91"/>
  ${dots(60, 0, 1600, 790, 900, 2, 4, ["#fff", "#ffc2d6", "#ffe58a", "#d9c8ff"], 53)}
  ${butterfly("M120,500 C220,400 360,540 460,460 S600,380 520,520 S260,600 120,500Z", 22, "#ffb1c8", "#ff8fb0")}
  ${butterfly("M1150,460 C1250,380 1400,480 1480,420 S1560,520 1440,560 S1200,560 1150,460Z", 26, "#ffe08a", "#f7c84a")}
  ${butterfly("M300,640 C380,580 460,660 540,610 S600,700 480,720 S320,700 300,640Z", 18, "#b9d6ff", "#8fb8f5")}`,

  left: () => `
  <defs>
    <linearGradient id="mdHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9dcae"/><stop offset="1" stop-color="#90c389"/></linearGradient>
    <radialGradient id="mdBunny" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fdf6ec"/><stop offset="1" stop-color="#ecd9c3"/></radialGradient>
  </defs>
  <path d="M-20,900 C-20,820 160,770 380,770 C580,770 720,830 800,900Z" fill="url(#mdHill)"/>
  ${tufts(12, 0, 760, 820, 900, ["#86b981", "#7aae76"], 61)}
  <g transform="translate(560,850)"><rect x="-6" y="-20" width="12" height="22" rx="5" fill="#f6eee0"/><path d="M-22,-16 C-22,-38 22,-38 22,-16Z" fill="#ef7f6e"/><circle cx="-9" cy="-26" r="3.2" fill="#fff"/><circle cx="7" cy="-28" r="2.6" fill="#fff"/><circle cx="12" cy="-20" r="2" fill="#fff"/></g>
  <g transform="translate(600,862) scale(.6)"><rect x="-6" y="-20" width="12" height="22" rx="5" fill="#f6eee0"/><path d="M-22,-16 C-22,-38 22,-38 22,-16Z" fill="#f29b6e"/><circle cx="-6" cy="-26" r="3.2" fill="#fff"/></g>
  ${daisy(120, 870, 1.1, "#fff", "#ffcf4d", -1)}${daisy(170, 880, 0.8, "#ffd1e0", "#ffcf4d", -3)}${daisy(470, 880, 0.9, "#fff", "#ffcf4d", -2)}${daisy(680, 890, 1, "#fff", "#ffcf4d", -4)}
  <g transform="translate(330,790)">
    <ellipse cx="0" cy="84" rx="90" ry="12" fill="#000" opacity=".06"/>
    <g class="pet" data-pet="bunny"><g class="breathe">
      <g filter="url(#fur)" fill="url(#mdBunny)">
        <circle cx="66" cy="38" r="21" fill="#fff"/>
        <ellipse cx="0" cy="24" rx="72" ry="58"/>
      </g>
      <ellipse cx="0" cy="40" rx="40" ry="32" fill="#fffaf3" opacity=".8"/>
      <g class="ear-l">
        <ellipse cx="-22" cy="-122" rx="16" ry="50" fill="url(#mdBunny)" filter="url(#fur)"/>
        <ellipse cx="-22" cy="-116" rx="7.5" ry="35" fill="#f6c4cd"/>
      </g>
      <g class="ear-r">
        <ellipse cx="22" cy="-122" rx="16" ry="50" fill="url(#mdBunny)" filter="url(#fur)"/>
        <ellipse cx="22" cy="-116" rx="7.5" ry="35" fill="#f6c4cd"/>
      </g>
      <circle cx="0" cy="-52" r="50" fill="url(#mdBunny)" filter="url(#fur)"/>
      <ellipse cx="-14" cy="-86" rx="20" ry="8" fill="#fff" opacity=".6"/>
      <g fill="#f1e1cd" filter="url(#fur)"><ellipse cx="-36" cy="76" rx="25" ry="11"/><ellipse cx="36" cy="76" rx="25" ry="11"/></g>
      <g class="eyes"><g class="blink">
        <ellipse cx="-19" cy="-58" rx="7" ry="8.5" fill="#2b2a33"/><ellipse cx="19" cy="-58" rx="7" ry="8.5" fill="#2b2a33"/>
        <circle cx="-16.5" cy="-61" r="2.6" fill="#fff"/><circle cx="21.5" cy="-61" r="2.6" fill="#fff"/>
      </g></g>
      ${happyEyes([[-19, -58, 7], [19, -58, 7]], "#2b2a33", 3.6)}
      <ellipse cx="-31" cy="-40" rx="9" ry="5.5" fill="#ffc6cf" opacity=".75"/>
      <ellipse cx="31" cy="-40" rx="9" ry="5.5" fill="#ffc6cf" opacity=".75"/>
      <ellipse class="nose" cx="0" cy="-43" rx="6" ry="4.5" fill="#f19aac"/>
      <path d="M-7,-34 q7,6 7,-3 q0,9 7,3" fill="none" stroke="#9c8676" stroke-width="2" stroke-linecap="round"/>
      ${tear(-22, -46)}
    </g></g>
  </g>`,

  right: () => `
  <defs>
    <radialGradient id="mdDuck" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff3c0"/><stop offset="1" stop-color="#ffd76e"/></radialGradient>
    <linearGradient id="mdPond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3e2ea"/><stop offset="1" stop-color="#86c9d8"/></linearGradient>
  </defs>
  <path d="M900,900 C1040,780 1250,740 1600,740 L1600,900Z" fill="#a8d498"/>
  <ellipse cx="1310" cy="900" rx="330" ry="104" fill="#8fc6a0"/>
  <ellipse cx="1310" cy="902" rx="312" ry="92" fill="url(#mdPond)"/>
  <path d="M1080,860 C1160,840 1260,836 1330,840" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5"/>
  <g fill="#7fbf77"><path d="M1110,880 a22,10 0 1,0 40,-4 l-20,2z"/><path d="M1460,860 a26,11 0 1,0 46,-4 l-22,2z"/></g>
  <g transform="translate(1486,852)"><circle r="7" fill="#ffc6d6"/><circle r="3" fill="#ffe08a"/></g>
  <g stroke="#6fa56a" stroke-width="4" stroke-linecap="round">
    <g transform="translate(1560,880)"><g class="sway" style="--d:-1s"><path d="M0,0 V-120"/><rect x="-5" y="-150" width="10" height="34" rx="5" fill="#9b6e4e" stroke="none"/></g></g>
    <g transform="translate(1586,890)"><g class="sway" style="--d:-3s"><path d="M0,0 V-96"/><rect x="-4.5" y="-122" width="9" height="30" rx="4.5" fill="#9b6e4e" stroke="none"/></g></g>
    <g transform="translate(1536,890)"><g class="sway" style="--d:-2s"><path d="M0,0 C-4,-40 -10,-70 -24,-96" fill="none"/></g></g>
  </g>
  <g transform="translate(1268,846)">
    <ellipse class="ripple" cx="0" cy="30" rx="70" ry="9" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>
    <g class="pet" data-pet="duck"><g class="float">
      <g filter="url(#fur)" fill="url(#mdDuck)">
        <path d="M40,0 q26,-10 30,-26 q-2,22 -20,36z"/>
        <ellipse cx="5" cy="10" rx="50" ry="28"/>
        <circle cx="-28" cy="-24" r="27"/>
      </g>
      <path d="M-30,-50 q4,-12 12,-10 q-6,4 -6,10z" fill="#ffd76e"/>
      <ellipse cx="16" cy="6" rx="22" ry="13" fill="#ffd05e" transform="rotate(-12 16 6)"/>
      <path d="M2,8 q12,6 26,0" stroke="#f5bf45" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="-36" cy="-40" rx="10" ry="5" fill="#fff" opacity=".6"/>
      <ellipse cx="-56" cy="-19" rx="13" ry="6.5" fill="#ffad63"/>
      <ellipse cx="-58" cy="-21" rx="7" ry="2" fill="#ffd2a3"/>
      <g class="eyes"><g class="blink"><circle cx="-35" cy="-29" r="4.8" fill="#2f2d36"/><circle cx="-33.5" cy="-30.5" r="1.6" fill="#fff"/></g></g>
      ${happyEyes([[-35, -29, 5]], "#2f2d36", 3)}
      <ellipse cx="-24" cy="-16" rx="7" ry="4" fill="#ffb3a7" opacity=".7"/>
      ${tear(-34, -20)}
    </g></g>
  </g>`,
};

function butterfly(path, dur, color, edge) {
  return `<g><g class="bfly">
    <g class="wing-l"><path d="M0,0 C-16,-18 -26,-4 -16,4 C-20,13 -6,15 0,4Z" fill="${color}" stroke="${edge}" stroke-width="1.5"/></g>
    <g class="wing-r"><path d="M0,0 C16,-18 26,-4 16,4 C20,13 6,15 0,4Z" fill="${color}" stroke="${edge}" stroke-width="1.5"/></g>
    <ellipse cx="0" cy="3" rx="1.8" ry="7" fill="#4b3b4a"/>
    <path d="M0,-4 q-3,-6 -6,-8 M0,-4 q3,-6 6,-8" stroke="#4b3b4a" stroke-width="1" fill="none"/>
  </g><animateMotion path="${path}" dur="${dur}s" begin="0s" repeatCount="indefinite"/></g>`;
}

window.SCENES = [sea, savanna, sky, meadow];
