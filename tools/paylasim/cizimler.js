#!/usr/bin/env node
/*
 * Yazıların paylaşım görselleri (1200×630, assets/paylasim/<yazı>.png).
 * Her yazının kendi çizimi var: Enigma rotoru, Bombe, Knuth'un demiryolu, Gödel'in mektubu…
 * Çizimler bu dosyada SVG olarak tarif edilir; Chrome ile PNG'ye dökülür.
 *
 *   node tools/paylasim/cizimler.js            → hepsini yeniden çizer
 *   node tools/paylasim/cizimler.js enigma-2   → yalnızca birini
 *
 * Yeni bir yazıya görsel eklemek için CIZIMLER'e bir girdi ekleyin, çalıştırın ve yönetim ekranında
 * yazının arşiv kaydındaki "Paylaşım görseli" alanına assets/paylasim/<yazı>.png yazın.
 */
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'paylasim');
const W = 1200, H = 630;

const C = {
  paper: '#f2eee6', paper2: '#e7dfd0', sheet: '#fbf8f1',
  ink: '#2d2b2b', ink2: '#605d5d', mute: '#9b9797',
  gold: '#b68235', gold2: '#7d5411', gold3: '#e1ad66'
};
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ROTOR_I = 'EKMFLGDQVZNTOWYHXUSPAIBRCJ'; // Enigma I, rotor I kablolaması

const f = (x) => Math.round(x * 100) / 100;
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ───────────── çizimler (720×630'luk sağ alan) ───────────── */

function rotor(cx, cy, R) {
  const s = [];
  // tırtıllı dış kenar
  const teeth = 60, pts = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2, r = i % 2 ? R - 11 : R;
    pts.push(pol(cx, cy, r, a).map(f).join(','));
  }
  s.push(`<polygon points="${pts.join(' ')}" fill="${C.paper2}" stroke="${C.ink}" stroke-width="1.4" stroke-linejoin="round"/>`);
  s.push(`<circle cx="${cx}" cy="${cy}" r="${R - 26}" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.2"/>`);
  s.push(`<circle cx="${cx}" cy="${cy}" r="${R - 66}" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.2"/>`);
  // harf halkası
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (i / 26) * Math.PI * 2;
    const [x, y] = pol(cx, cy, R - 46, a);
    const deg = f((a * 180) / Math.PI + 90);
    s.push(`<text x="${f(x)}" y="${f(y)}" transform="rotate(${deg} ${f(x)} ${f(y)})" font-family="Lora" font-size="17" fill="${i === 0 ? C.gold2 : C.ink}" text-anchor="middle" dominant-baseline="central">${ALPHA[i]}</text>`);
    const [x1, y1] = pol(cx, cy, R - 26, a + Math.PI / 26), [x2, y2] = pol(cx, cy, R - 34, a + Math.PI / 26);
    s.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${C.ink2}" stroke-width="1"/>`);
  }
  // iç kablolama: her kontak rotor I'e göre karşısındakine bağlanır
  const pinR = R - 92, pin = (i) => pol(cx, cy, pinR, -Math.PI / 2 + (i / 26) * Math.PI * 2);
  const wire = (i, j, color, w, op) => {
    const [x1, y1] = pin(i), [x2, y2] = pin(j);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const qx = cx + (mx - cx) * 0.35, qy = cy + (my - cy) * 0.35;
    return `<path d="M${f(x1)},${f(y1)} Q${f(qx)},${f(qy)} ${f(x2)},${f(y2)}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`;
  };
  for (let i = 0; i < 26; i++) s.push(wire(i, ALPHA.indexOf(ROTOR_I[i]), C.ink2, 1, 0.55));
  // A'dan giren akım: A → E → L → T (altın)
  let k = 0;
  for (let n = 0; n < 3; n++) { const j = ALPHA.indexOf(ROTOR_I[k]); s.push(wire(k, j, C.gold, 2.6, 1)); k = j; }
  for (let i = 0; i < 26; i++) {
    const [x, y] = pin(i);
    s.push(`<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.2"/>`);
  }
  // göbek
  s.push(`<circle cx="${cx}" cy="${cy}" r="44" fill="${C.paper2}" stroke="${C.ink}" stroke-width="1.4"/>`);
  s.push(`<circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="${C.ink2}" stroke-width="1" stroke-dasharray="2 4"/>`);
  s.push(`<circle cx="${cx}" cy="${cy}" r="13" fill="${C.ink}"/>`);
  // okuma penceresi
  s.push(`<path d="M${cx - 13},${cy - R - 30} L${cx + 13},${cy - R - 30} L${cx},${cy - R - 8} Z" fill="${C.gold}"/>`);
  return s.join('\n');
}

const DRAW = {};

DRAW['enigma-2'] = () => {
  const s = [];
  // arkadaki iki rotor (yandan, ince)
  for (let i = 0; i < 2; i++) {
    const x = 628 - i * 34;
    s.push(`<rect x="${x}" y="${120 + i * 6}" width="26" height="${390 - i * 12}" rx="6" fill="${C.paper2}" stroke="${C.ink}" stroke-width="1.2"/>`);
    for (let y = 130 + i * 6; y < 506 - i * 6; y += 9) s.push(`<line x1="${x}" y1="${y}" x2="${x + 26}" y2="${y}" stroke="${C.ink2}" stroke-width="0.8"/>`);
  }
  s.push(rotor(350, 316, 226));
  s.push(`<text x="350" y="588" font-family="Cormorant Garamond" font-style="italic" font-size="22" fill="${C.ink2}" text-anchor="middle">rotor I · A → E → L → T</text>`);
  return s.join('\n');
};

DRAW['enigma-1'] = () => {
  const s = [], x0 = 78, dx = 24, yT = 150, yB = 400;
  const perm = (i) => ALPHA.indexOf(ROTOR_I[i]);
  // A'nın döngüsü
  const cyc = []; let k = 0; do { cyc.push(k); k = perm(k); } while (k !== 0);
  for (let i = 0; i < 26; i++) {
    const on = cyc.includes(i), j = perm(i);
    const x1 = x0 + i * dx, x2 = x0 + j * dx;
    s.push(`<path d="M${f(x1)},${yT + 16} C${f(x1)},${yT + 120} ${f(x2)},${yB - 120} ${f(x2)},${yB - 18}" fill="none" stroke="${on ? C.gold : C.ink2}" stroke-width="${on ? 2.4 : 1}" opacity="${on ? 1 : 0.55}"/>`);
  }
  for (let i = 0; i < 26; i++) {
    const x = x0 + i * dx, on = cyc.includes(i);
    for (const y of [yT, yB]) {
      s.push(`<circle cx="${f(x)}" cy="${y}" r="11.5" fill="${on ? C.paper2 : C.sheet}" stroke="${on ? C.gold2 : C.ink}" stroke-width="1"/>`);
      s.push(`<text x="${f(x)}" y="${y}" font-family="Lora" font-size="13" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${ALPHA[i]}</text>`);
    }
  }
  s.push(`<text x="${x0 - 22}" y="${yT}" font-family="Cormorant Garamond" font-style="italic" font-size="26" fill="${C.ink2}" text-anchor="end" dominant-baseline="central">x</text>`);
  s.push(`<text x="${x0 - 22}" y="${yB}" font-family="Cormorant Garamond" font-style="italic" font-size="26" fill="${C.ink2}" text-anchor="end" dominant-baseline="central">π(x)</text>`);
  // döngü gösterimi
  const cycles = [], seen = new Set();
  for (let i = 0; i < 26; i++) {
    if (seen.has(i)) continue;
    const c = []; let j = i; do { c.push(ALPHA[j]); seen.add(j); j = perm(j); } while (j !== i);
    cycles.push(c);
  }
  const first = '(' + cycles[0].join(' ') + ')';
  const rest = cycles.slice(1).map(c => '(' + c.join(' ') + ')').join(' ');
  s.push(`<text x="40" y="490" font-family="Cormorant Garamond" font-style="italic" font-size="30" fill="${C.ink}">π = <tspan fill="${C.gold2}">${first}</tspan></text>`);
  s.push(`<text x="86" y="532" font-family="Cormorant Garamond" font-style="italic" font-size="30" fill="${C.ink}">${esc(rest)}</text>`);
  s.push(`<text x="40" y="80" font-family="Lora" font-size="14" letter-spacing="3" fill="${C.ink2}">ROTOR I · BİR PERMÜTASYON VE DÖNGÜLERİ</text>`);
  return s.join('\n');
};

DRAW['enigma-3'] = () => {
  const s = [];
  // Bombe'nin ön yüzü: üç sıra davul
  s.push(`<rect x="40" y="60" width="640" height="370" rx="6" fill="${C.paper2}" stroke="${C.ink}" stroke-width="1.4"/>`);
  s.push(`<rect x="52" y="72" width="616" height="346" rx="3" fill="none" stroke="${C.ink2}" stroke-width="0.8"/>`);
  const rot = [[3, 17, 9, 22, 12], [6, 0, 19, 14, 25], [11, 8, 2, 20, 16]];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const cx = 116 + c * 122, cy = 135 + r * 113, R = 50;
    s.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.3"/>`);
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + ((i - rot[r][c]) / 26) * Math.PI * 2;
      const [x, y] = pol(cx, cy, R - 10, a);
      s.push(`<text x="${f(x)}" y="${f(y)}" font-family="Lora" font-size="8.5" fill="${i === rot[r][c] ? C.gold2 : C.ink2}" text-anchor="middle" dominant-baseline="central">${ALPHA[i]}</text>`);
    }
    s.push(`<circle cx="${cx}" cy="${cy}" r="24" fill="${r === 1 && c === 2 ? C.gold3 : C.paper}" stroke="${C.ink}" stroke-width="1.1"/>`);
    s.push(`<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 22}" stroke="${C.ink}" stroke-width="2"/>`);
    s.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${C.ink}"/>`);
  }
  // kelime ipucu (crib) ve şifreli metin: hiçbir harf kendine şifrelenmez
  const crib = 'WETTERVORHERSAGE', ciph = 'QFZWRWIVTYRESXBF';
  const x0 = 54, dx = 38.6;
  for (let i = 0; i < crib.length; i++) {
    const x = x0 + i * dx;
    s.push(`<rect x="${f(x - 15)}" y="462" width="30" height="34" fill="${C.sheet}" stroke="${C.ink2}" stroke-width="0.9"/>`);
    s.push(`<text x="${f(x)}" y="479" font-family="Lora" font-size="18" fill="${C.ink2}" text-anchor="middle" dominant-baseline="central">${ciph[i]}</text>`);
    s.push(`<rect x="${f(x - 15)}" y="504" width="30" height="34" fill="${C.paper2}" stroke="${C.gold2}" stroke-width="0.9"/>`);
    s.push(`<text x="${f(x)}" y="521" font-family="Lora" font-size="18" font-weight="600" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${crib[i]}</text>`);
  }
  // ipucundaki bir döngü: E ↔ R ↔ … (menü)
  const loop = [1, 4, 10];
  loop.forEach((i, n) => {
    const a = x0 + i * dx, b = x0 + loop[(n + 1) % loop.length] * dx;
    s.push(`<path d="M${f(a)},540 Q${f((a + b) / 2)},${n === 2 ? 612 : 584} ${f(b)},540" fill="none" stroke="${C.gold}" stroke-width="2"/>`);
  });
  s.push(`<text x="${x0 - 8}" y="455" font-family="Lora" font-size="12" letter-spacing="2" fill="${C.ink2}">ŞİFRELİ METİN / TAHMİN EDİLEN METİN</text>`);
  return s.join('\n');
};

function wagon(x, y, n, opt) {
  opt = opt || {};
  const w = opt.vertical ? 40 : 66, h = opt.vertical ? 62 : 40;
  const s = [`<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="5" fill="${opt.fill || C.sheet}" stroke="${C.ink}" stroke-width="1.4"/>`];
  if (opt.vertical) {
    for (const dy of [-h / 2 + 12, h / 2 - 12]) for (const dx of [-w / 2, w / 2]) s.push(`<circle cx="${x + dx}" cy="${y + dy}" r="5" fill="${C.ink}"/>`);
  } else {
    for (const dx of [-w / 2 + 14, w / 2 - 14]) s.push(`<circle cx="${x + dx}" cy="${y + h / 2 + 2}" r="6" fill="${C.ink}"/>`);
  }
  s.push(`<text x="${x}" y="${y + 1}" font-family="Cormorant Garamond" font-size="28" font-weight="600" fill="${opt.color || C.ink}" text-anchor="middle" dominant-baseline="central">${n}</text>`);
  return s.join('\n');
}

function railway(stack, input, output) {
  const s = [], y = 210, sx = 360;
  // ana hat
  for (let x = 8; x < 712; x += 17) {
    if (x > sx - 30 && x < sx + 30) continue;
    s.push(`<line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y + 14}" stroke="${C.ink2}" stroke-width="3" opacity="0.5"/>`);
  }
  s.push(`<path d="M0,${y - 7} H712 M0,${y + 7} H${sx - 26} Q${sx - 9},${y + 7} ${sx - 9},${y + 24} V590 M${sx + 9},590 V${y + 24} Q${sx + 9},${y + 7} ${sx + 26},${y + 7} H712" fill="none" stroke="${C.ink}" stroke-width="2"/>`);
  // yığın kolu
  for (let yy = y + 34; yy < 590; yy += 17) s.push(`<line x1="${sx - 22}" y1="${yy}" x2="${sx + 22}" y2="${yy}" stroke="${C.ink2}" stroke-width="3" opacity="0.5"/>`);
  // vagonlar
  input.forEach((n, i) => s.push(wagon(470 + i * 84, y - 28, n)));
  output.forEach((n, i) => s.push(wagon(250 - i * 84, y - 28, n, { fill: C.paper2 })));
  stack.forEach((n, i) => s.push(wagon(sx, 520 - i * 72, n, { vertical: true, fill: i === stack.length - 1 ? C.gold3 : C.sheet })));
  // oklar ve adlar
  const arrow = (x1, y1, x2, y2) => `<path d="M${x1},${y1} L${x2},${y2}" stroke="${C.gold}" stroke-width="2.4" marker-end="url(#ok)"/>`;
  s.push(arrow(690, 120, 560, 120), arrow(180, 120, 50, 120));
  s.push(`<path d="M${sx + 48},${y + 30} V${y + 110}" stroke="${C.gold}" stroke-width="2.4" marker-end="url(#ok)"/>`);
  s.push(`<path d="M${sx - 48},${y + 110} V${y + 30}" stroke="${C.gold}" stroke-width="2.4" marker-end="url(#ok)"/>`);
  const lab = (x, yy, t, a) => `<text x="${x}" y="${yy}" font-family="Cormorant Garamond" font-style="italic" font-size="26" fill="${C.ink2}" text-anchor="${a || 'middle'}">${t}</text>`;
  s.push(lab(625, 104, 'giriş'), lab(115, 104, 'çıkış'), lab(sx + 60, y + 170, 'yığın', 'start'));
  return s.join('\n');
}

DRAW['knuth-1'] = () => railway([2, 3], [4, 5, 6], [1]);

DRAW['knuth-2'] = () => {
  const s = [];
  // yığın yüksekliği: yukarı = vagon girer, aşağı = çıkar; sonda iki vagon yığında kalır
  const steps = 'UUDUUUDDUDDUUDUDUUDU'; // 20 adım, son yükseklik 4
  const x0 = 40, y0 = 440, d = 28;
  for (let gx = 0; gx <= steps.length; gx++) s.push(`<line x1="${x0 + gx * d}" y1="${y0 - 6 * d}" x2="${x0 + gx * d}" y2="${y0}" stroke="${C.ink2}" stroke-width="0.6" stroke-dasharray="1 5"/>`);
  for (let gy = 0; gy <= 6; gy++) s.push(`<line x1="${x0}" y1="${y0 - gy * d}" x2="${x0 + steps.length * d}" y2="${y0 - gy * d}" stroke="${C.ink2}" stroke-width="0.6" stroke-dasharray="1 5"/>`);
  let h = 0; const pts = [[x0, y0]];
  for (const c of steps) { h += c === 'U' ? 1 : -1; pts.push([x0 + pts.length * d, y0 - h * d]); }
  const line = pts.map(p => p.join(',')).join(' ');
  s.push(`<polygon points="${x0},${y0} ${line} ${pts[pts.length - 1][0]},${y0}" fill="${C.paper2}"/>`);
  // tarama
  s.push(`<clipPath id="dag"><polygon points="${x0},${y0} ${line} ${pts[pts.length - 1][0]},${y0}"/></clipPath>`);
  for (let k = -400; k < 700; k += 11) s.push(`<line x1="${x0 + k}" y1="${y0}" x2="${x0 + k + 200}" y2="${y0 - 200}" stroke="${C.ink2}" stroke-width="0.7" opacity="0.45" clip-path="url(#dag)"/>`);
  s.push(`<polyline points="${line}" fill="none" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>`);
  pts.forEach(([x, y], i) => s.push(`<circle cx="${x}" cy="${y}" r="${i === pts.length - 1 ? 7 : 3.6}" fill="${i === pts.length - 1 ? C.gold : C.ink}"/>`));
  s.push(`<line x1="${x0 - 10}" y1="${y0}" x2="${x0 + steps.length * d + 20}" y2="${y0}" stroke="${C.ink}" stroke-width="1.4"/>`);
  const [ex, ey] = pts[pts.length - 1];
  s.push(`<path d="M${ex + 16},${ey} H${ex + 30} V${y0} H${ex + 16}" fill="none" stroke="${C.gold}" stroke-width="1.6"/>`);
  s.push(`<text x="${ex + 38}" y="${(ey + y0) / 2}" font-family="Cormorant Garamond" font-style="italic" font-size="22" fill="${C.gold2}" dominant-baseline="central">kalan</text>`);
  s.push(`<text x="${x0}" y="${y0 + 34}" font-family="Lora" font-size="12" letter-spacing="2" fill="${C.ink2}">↗ VAGON YIĞINA GİRER · ↘ YIĞINDAN ÇIKAR</text>`);
  const sup = (t) => `<tspan dy="-13" font-size="22">${t}</tspan><tspan dy="13"> </tspan>`;
  s.push(`<text x="${x0}" y="110" font-family="Cormorant Garamond" font-style="italic" font-size="36" fill="${C.ink}">G(z) = 1 + z + 2z${sup(2)}+ 5z${sup(3)}+ 14z${sup(4)}+ 42z${sup(5)}+ ⋯</text>`);
  return s.join('\n');
};

DRAW['knuth-3'] = () => {
  const s = [], n = 8, cell = 50, x0 = 190, y0 = 70;
  const p = [2, 1, 6, 3, 8, 4, 7, 5]; // i<j<k, p_j<p_k<p_i: 6, 3, 4 → 3-1-2 örüntüsü (yazıdaki koşul)
  for (let i = 0; i <= n; i++) {
    s.push(`<line x1="${x0 + i * cell}" y1="${y0}" x2="${x0 + i * cell}" y2="${y0 + n * cell}" stroke="${C.ink2}" stroke-width="${i % n ? 0.6 : 1.4}" opacity="${i % n ? 0.6 : 1}"/>`);
    s.push(`<line x1="${x0}" y1="${y0 + i * cell}" x2="${x0 + n * cell}" y2="${y0 + i * cell}" stroke="${C.ink2}" stroke-width="${i % n ? 0.6 : 1.4}" opacity="${i % n ? 0.6 : 1}"/>`);
  }
  const at = (i) => [x0 + (i + 0.5) * cell, y0 + (n - p[i] + 0.5) * cell];
  const pat = [2, 3, 5];
  s.push(`<polyline points="${pat.map(i => at(i).join(',')).join(' ')}" fill="none" stroke="${C.gold}" stroke-width="2.6"/>`);
  for (let i = 0; i < n; i++) {
    const [x, y] = at(i), on = pat.includes(i);
    s.push(`<circle cx="${x}" cy="${y}" r="${on ? 12 : 9}" fill="${on ? C.gold : C.ink}"/>`);
    s.push(`<text x="${x}" y="${y0 + n * cell + 26}" font-family="Cormorant Garamond" font-size="24" fill="${on ? C.gold2 : C.ink}" text-anchor="middle">${p[i]}</text>`);
  }
  ['3', '1', '2'].forEach((t, k) => { const [x, y] = at(pat[k]); s.push(`<text x="${x + 16}" y="${y - 14}" font-family="Cormorant Garamond" font-style="italic" font-size="22" fill="${C.gold2}">${t}</text>`); });
  s.push(`<text x="${x0 + n * cell / 2}" y="${y0 + n * cell + 66}" font-family="Cormorant Garamond" font-style="italic" font-size="26" fill="${C.ink2}" text-anchor="middle">3-1-2 örüntüsü: bu sıralama yığınla elde edilemez</text>`);
  return s.join('\n');
};

function scribble(x, y, w, seed) {
  // el yazısı satırı: düzensiz küçük dalgalar
  let r = seed, d = `M${x},${y}`, cx = x;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  while (cx < x + w) {
    const step = 5 + rnd() * 7, amp = 2 + rnd() * 6;
    d += ` q${f(step / 2)},${f(-amp)} ${f(step)},0`;
    cx += step;
    if (rnd() < 0.12) { cx += 9; d += ` m9,0`; }
  }
  return `<path d="${d}" fill="none" stroke="${C.ink2}" stroke-width="1.3" stroke-linecap="round"/>`;
}

DRAW['godel-mektubu'] = () => {
  const s = [];
  // zarf
  s.push(`<g transform="translate(-40 0) rotate(7 520 380)">`);
  s.push(`<rect x="300" y="250" width="400" height="250" fill="${C.paper2}" stroke="${C.ink}" stroke-width="1.3"/>`);
  s.push(`<path d="M300,250 L500,380 L700,250" fill="none" stroke="${C.ink2}" stroke-width="1.2"/>`);
  s.push(`<rect x="610" y="270" width="64" height="76" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1" stroke-dasharray="3 3"/>`);
  s.push(`<rect x="618" y="278" width="48" height="60" fill="none" stroke="${C.gold}" stroke-width="1.2"/>`);
  s.push(`<text x="642" y="314" font-family="Cormorant Garamond" font-size="22" fill="${C.gold2}" text-anchor="middle">3¢</text>`);
  s.push(`<circle cx="590" cy="320" r="34" fill="none" stroke="${C.ink2}" stroke-width="1.2"/>`);
  s.push(`<text x="590" y="316" font-family="Lora" font-size="9" letter-spacing="1" fill="${C.ink2}" text-anchor="middle">PRINCETON</text>`);
  s.push(`<text x="590" y="330" font-family="Lora" font-size="9" fill="${C.ink2}" text-anchor="middle">1956</text>`);
  for (let i = 0; i < 4; i++) s.push(`<path d="M${520 - i * 4},${300 + i * 10} q12,-6 24,0 t24,0 t24,0" fill="none" stroke="${C.ink2}" stroke-width="1"/>`);
  s.push(`</g>`);
  // mektup
  s.push(`<g transform="translate(0 16) rotate(-4 300 320)">`);
  s.push(`<rect x="90" y="56" width="400" height="514" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.3"/>`);
  s.push(`<text x="460" y="92" font-family="Cormorant Garamond" font-style="italic" font-size="22" fill="${C.ink}" text-anchor="end">Princeton, 20. III. 1956</text>`);
  s.push(`<text x="124" y="146" font-family="Cormorant Garamond" font-style="italic" font-size="27" fill="${C.ink}">Lieber Herr v. Neumann!</text>`);
  let y = 186, seed = 7;
  for (let i = 0; i < 4; i++, y += 30) s.push(scribble(i ? 124 : 150, y, i === 3 ? 200 : (i ? 330 : 304), seed += 13));
  s.push(`<text x="124" y="${y + 8}" font-family="Cormorant Garamond" font-style="italic" font-size="30" fill="${C.gold2}">φ(n) ∼ k · n ?</text>`);
  y += 52;
  for (let i = 0; i < 6; i++, y += 30) s.push(scribble(124, y, i === 5 ? 150 : 330, seed += 29));
  s.push(`<text x="460" y="${y + 22}" font-family="Cormorant Garamond" font-style="italic" font-size="26" fill="${C.ink}" text-anchor="end">Ihr Kurt Gödel</text>`);
  s.push(`</g>`);
  // P ?= NP mührü
  s.push(`<circle cx="566" cy="146" r="62" fill="${C.gold}" opacity="0.92"/>`);
  s.push(`<circle cx="566" cy="146" r="53" fill="none" stroke="${C.sheet}" stroke-width="1.2" stroke-dasharray="2 4"/>`);
  s.push(`<text x="566" y="148" font-family="Cormorant Garamond" font-size="32" font-weight="600" fill="${C.sheet}" text-anchor="middle" dominant-baseline="central">P ≟ NP</text>`);
  return s.join('\n');
};

DRAW['berelim-y-ile'] = () => {
  const s = [];
  // sarmal: f ( f ( f ( … içe doğru küçülerek
  const cx = 360, cy = 286;
  let a = 0, r = 210, size = 42;
  const tokens = [];
  while (r > 18 && size > 6) {
    const [x, y] = pol(cx, cy, r, a);
    const tok = tokens.length % 2 ? '(' : 'f';
    tokens.push(`<text x="${f(x)}" y="${f(y)}" transform="rotate(${f((a * 180) / Math.PI + 90)} ${f(x)} ${f(y)})" font-family="Cormorant Garamond" font-style="italic" font-size="${f(size)}" fill="${tokens.length < 2 ? C.gold2 : C.ink}" opacity="${f(Math.max(0.35, size / 42))}" text-anchor="middle" dominant-baseline="central">${tok}</text>`);
    const stepArc = size * 0.62;
    a += stepArc / r;
    r *= 0.9915;
    size *= 0.9915;
  }
  s.push(...tokens);
  s.push(`<circle cx="${cx}" cy="${cy}" r="96" fill="${C.paper}"/>`);
  s.push(`<text x="${cx}" y="${cy + 6}" font-family="Cormorant Garamond" font-size="190" fill="${C.gold}" text-anchor="middle" dominant-baseline="central">λ</text>`);
  s.push(`<text x="360" y="574" font-family="Cormorant Garamond" font-style="italic" font-size="31" fill="${C.ink}" text-anchor="middle">Y = λf. (λx. f (x x)) (λx. f (x x))</text>`);
  return s.join('\n');
};

DRAW['kodlarin-seruveni'] = () => {
  const s = [], mono = 'JetBrains Mono';
  const label = (x, y, t) => `<text x="${x}" y="${y}" font-family="Lora" font-size="12" letter-spacing="2.4" fill="${C.ink2}">${t}</text>`;
  const down = (x, y1, y2) => `<path d="M${x},${y1} V${y2}" stroke="${C.gold}" stroke-width="2.2" marker-end="url(#ok)"/>`;
  // 1. kaynak
  s.push(label(40, 58, 'KAYNAK KOD'));
  s.push(`<rect x="40" y="70" width="330" height="60" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.3"/>`);
  s.push(`<text x="60" y="101" font-family="${mono}" font-size="24" fill="${C.ink}" dominant-baseline="central">x = a + b * 2</text>`);
  s.push(down(205, 136, 176));
  // 2. sözcükler
  s.push(label(40, 196, 'SÖZCÜKLER · LEXER'));
  const toks = [['x', 'ad'], ['=', 'işl'], ['a', 'ad'], ['+', 'işl'], ['b', 'ad'], ['*', 'işl'], ['2', 'sayı']];
  toks.forEach(([t, k], i) => {
    const x = 40 + i * 50;
    s.push(`<rect x="${x}" y="208" width="42" height="42" rx="4" fill="${k === 'işl' ? C.paper2 : C.sheet}" stroke="${C.ink}" stroke-width="1.1"/>`);
    s.push(`<text x="${x + 21}" y="230" font-family="${mono}" font-size="20" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${esc(t)}</text>`);
    s.push(`<text x="${x + 21}" y="266" font-family="Lora" font-style="italic" font-size="11" fill="${C.ink2}" text-anchor="middle">${k}</text>`);
  });
  s.push(down(205, 276, 312));
  // 3. ağaç
  s.push(label(40, 330, 'SÖZDİZİM AĞACI · PARSER'));
  const N = { eq: [205, 366, '='], x: [110, 432, 'x'], plus: [300, 432, '+'], a: [240, 498, 'a'], mul: [360, 498, '*'], b: [312, 562, 'b'], two: [408, 562, '2'] };
  [['eq', 'x'], ['eq', 'plus'], ['plus', 'a'], ['plus', 'mul'], ['mul', 'b'], ['mul', 'two']].forEach(([p, c]) =>
    s.push(`<line x1="${N[p][0]}" y1="${N[p][1]}" x2="${N[c][0]}" y2="${N[c][1]}" stroke="${C.ink2}" stroke-width="1.3"/>`));
  Object.entries(N).forEach(([k, [x, y, t]]) => {
    s.push(`<circle cx="${x}" cy="${y}" r="20" fill="${['eq', 'plus', 'mul'].includes(k) ? C.paper2 : C.sheet}" stroke="${C.ink}" stroke-width="1.3"/>`);
    s.push(`<text x="${x}" y="${y + 1}" font-family="${mono}" font-size="19" fill="${C.ink}" text-anchor="middle" dominant-baseline="central">${esc(t)}</text>`);
  });
  // 4. bytecode
  s.push(`<path d="M424,432 H462" stroke="${C.gold}" stroke-width="2.2" marker-end="url(#ok)"/>`);
  s.push(label(476, 196, 'BYTECODE'));
  s.push(`<rect x="476" y="208" width="196" height="300" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.3"/>`);
  ['LOAD  a', 'LOAD  b', 'PUSH  2', 'MUL', 'ADD', 'STORE x'].forEach((t, i) => {
    s.push(`<text x="492" y="${248 + i * 44}" font-family="${mono}" font-size="14" fill="${C.gold2}">${String(i).padStart(2, '0')}</text>`);
    s.push(`<text x="524" y="${248 + i * 44}" font-family="${mono}" font-size="19" fill="${C.ink}" xml:space="preserve">${t}</text>`);
  });
  return s.join('\n');
};

/* ───────────── sayfa: sol sütunda başlık, sağda çizim ───────────── */

const CIZIMLER = {
  'enigma-1': { ust: 'Enigma · Bölüm 1', baslik: 'Matematiksel Ön Hazırlık', alt: 'Permütasyonlar ve döngüler', yazar: 'Yasin Aydın' },
  'enigma-2': { ust: 'Enigma · Bölüm 2', baslik: 'Enigma’nın Çalışma Prensibi', alt: 'Rotorlar, yansıtıcı ve fiş panosu', yazar: 'Yasin Aydın' },
  'enigma-3': { ust: 'Enigma · Bölüm 3', baslik: 'Enigma’nın Çözülmesi', alt: 'Rejewski’den Turing’in Bombe’sine', yazar: 'Yasin Aydın' },
  'knuth-1': { ust: 'Knuth’un Kitabından Bir Soru · I', baslik: 'Vagon Sıralamaları', alt: 've Catalan sayıları', yazar: 'Yasin Aydın' },
  'knuth-2': { ust: 'Knuth’un Kitabından Bir Soru · II', baslik: 'Yığında Kalan Vagonlar', alt: 'Üreteç fonksiyonlarla sayma', yazar: 'Yasin Aydın' },
  'knuth-3': { ust: 'Knuth’un Kitabından Bir Soru · III', baslik: 'Yığınla Elde Edilen Permütasyonlar', alt: 'Ve kaçınılan örüntü', yazar: 'Yasin Aydın' },
  'godel-mektubu': { ust: 'Deneme · Hesaplama Kuramı', baslik: 'Kurt Amca’dan Mektup Var', alt: 'Milyon dolarlık bir problemin öyküsü', yazar: 'Yasin Aydın' },
  'berelim-y-ile': { ust: 'Lambda hesabı', baslikHtml: 'Berelim <i>Y</i> ile', alt: 'Özyinelemenin sabit noktası', yazar: 'Cem Bozşahin' },
  'kodlarin-seruveni': { ust: 'Programlama dilleri', baslik: 'Kodların Serüveni', alt: 'Programlama dilleri nasıl çalışır?', yazar: 'Kaan Emir Eröz' }
};

function pageHtml(slug) {
  const m = CIZIMLER[slug];
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Lora:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono&display=block">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.paper}; }
  .col { position: absolute; left: 72px; top: 0; bottom: 0; width: 380px; display: flex; flex-direction: column; justify-content: center; }
  .brand { position: absolute; left: 72px; top: 62px; font: 600 15px Lora; letter-spacing: .34em; color: ${C.gold2}; }
  .ust { font: 13px Lora; letter-spacing: .22em; text-transform: uppercase; color: ${C.ink2}; margin-bottom: 18px; }
  h1 { font: 400 58px/1.04 'Cormorant Garamond'; color: ${C.ink}; margin: 0; }
  .alt { font: italic 400 26px/1.25 'Cormorant Garamond'; color: ${C.ink2}; margin-top: 16px; }
  .rule { width: 56px; height: 2px; background: ${C.gold}; margin: 26px 0 0; }
  .foot { position: absolute; left: 72px; bottom: 58px; font: 13px Lora; letter-spacing: .12em; color: ${C.ink2}; }
  svg { position: absolute; }
  svg text { font-variant-numeric: lining-nums; }
</style></head><body>
<svg width="${W}" height="${H}" style="left:0;top:0">
  <defs><marker id="ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.gold}"/></marker></defs>
  <line x1="470" y1="70" x2="470" y2="560" stroke="${C.ink2}" stroke-width="0.8" opacity="0.5"/>
</svg>
<svg width="720" height="630" viewBox="0 0 720 630" style="left:480px;top:0">
  <defs><marker id="ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.gold}"/></marker></defs>
  <clipPath id="cerceve"><rect x="0" y="28" width="692" height="574"/></clipPath>
  <g clip-path="url(#cerceve)">
  ${DRAW[slug]()}
  </g>
</svg>
<div class="brand">BERGEÇ</div>
<div class="col"><div class="ust">${esc(m.ust)}</div><h1>${m.baslikHtml || esc(m.baslik)}</h1><div class="alt">${esc(m.alt)}</div><div class="rule"></div></div>
<div class="foot">${esc(m.yazar)} · bergec.github.io</div>
<svg width="${W}" height="${H}" style="left:0;top:0;pointer-events:none">
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="${C.ink}" stroke-width="1.2"/>
  <rect x="27" y="27" width="${W - 54}" height="${H - 54}" fill="none" stroke="${C.gold}" stroke-width="0.8"/>
</svg>
</body></html>`;
}

function chrome() {
  for (const c of ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable']) {
    try { execFileSync('which', [c], { stdio: 'ignore' }); return c; } catch (e) {}
  }
  throw new Error('Chrome bulunamadı.');
}

const only = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bergec-paylasim-'));
fs.mkdirSync(OUT, { recursive: true });
const bin = chrome();
for (const slug of Object.keys(CIZIMLER)) {
  if (only.length && !only.includes(slug)) continue;
  const html = path.join(tmp, slug + '.html');
  fs.writeFileSync(html, pageHtml(slug));
  const png = path.join(OUT, slug + '.png');
  execFileSync(bin, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--virtual-time-budget=8000', `--window-size=${W},${H}`, `--screenshot=${png}`, 'file://' + html], { stdio: 'ignore' });
  console.log(path.relative(ROOT, png));
}
fs.rmSync(tmp, { recursive: true, force: true });
