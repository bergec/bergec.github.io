// Tek seferlik geçiş: yazı sayfalarına data: adresi olarak gömülü görselleri
// assets/img/<yazı>/<açıklayıcı-ad>.<uzantı> dosyalarına çıkarır ve <img src>'yi o dosyaya çevirir.
// Görsellere width/height (gerçek boyut) ve — sayfanın ilk görseli dışında — loading="lazy" eklenir.
// Bayt bayt aynı dosya yazılır; görseller yeniden sıkıştırılmaz.
//
// Kullanım: node tools/extract-images.js            (depo kökünde)
//           node tools/extract-images.js --dry-run
//
// Yönetim ekranı (admin.html) bundan sonra yeni görselleri yayınlarken aynı kuralla dosyaya çıkarır
// (externalizeImages); bu betik yalnızca mevcut yazılar için.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

// Sayfadaki sırayla görsel adları (uzantısız). Aynı içerik aynı ada düşer.
const NAMES = {
  'godel-mektubu.html': [
    'kurt-godel-ve-albert-einstein', 'john-von-neumann', 'david-hilbert', 'alan-turing',
    'stephen-cook', 'p-np-yaraticilik-cizgi-roman'
  ],
  'enigma-1.html': ['enigma-m3-sifreleme-makinesi-ve-alan-turing'],
  'enigma-2.html': [
    'enigma-rotorlari', 'rotor-halka-ayari', 'rotor-baslangic-ayari', 'rotor-dis-halkasi-kerti',
    'enigma-fis-panosu-steckerbrett', 'luftwaffe-2744-gunluk-anahtar-yonergesi'
  ],
  'enigma-3.html': ['marian-rejewski'],
  'knuth-1.html': ['yigin-demiryolu-semasi'],
  'knuth-2.html': ['yigin-demiryolu-semasi'],
  'knuth-3.html': ['yigin-demiryolu-semasi', 'gereklilik-kaniti-adimlari', 'algoritma-1-yiginla-elde-edilebilir'],
  'berelim-y-ile.html': [],
  'kodlarin-seruveni.html': []
};

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
// Tırnak içindeki ">" da doğru okunsun.
const IMG_TAG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const DATA_SRC = /\ssrc\s*=\s*"(data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+))"/i;

function sizeOf(buf, mime) {
  if (mime === 'image/png') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (mime === 'image/jpeg') {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const m = buf[i + 1];
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      // SOF0..SOF15 (DHT=C4, JPG=C8, DAC=CC hariç)
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** <script> blokları dışındaki ilk <img>'nin konumu (o tembel yüklenmez). */
function firstImgIndex(html) {
  const scripts = [];
  html.replace(/<script\b[\s\S]*?<\/script>/gi, (m, at) => { scripts.push([at, at + m.length]); return m; });
  IMG_TAG.lastIndex = 0;
  for (let m; (m = IMG_TAG.exec(html));) {
    if (!scripts.some(([a, b]) => m.index >= a && m.index < b)) return m.index;
  }
  return -1;
}

function addAttr(tag, name, value) {
  if (new RegExp('\\s' + name + '\\s*=', 'i').test(tag)) return tag;
  return tag.replace(/\s*\/?>$/, ' ' + name + '="' + value + '">');
}

let totalBefore = 0, totalAfter = 0;
const rows = [];
for (const [page, names] of Object.entries(NAMES)) {
  const file = path.join(ROOT, page);
  const html = fs.readFileSync(file, 'utf8');
  const slug = page.replace(/\.html$/, '');
  const first = firstImgIndex(html);
  let n = 0;
  const written = {};
  const out = html.replace(IMG_TAG, (tag, at) => {
    const m = DATA_SRC.exec(tag);
    if (!m) return tag;
    const [, , mime, b64] = m;
    const ext = EXT[mime.toLowerCase()];
    if (!ext) throw new Error(page + ': beklenmeyen görsel türü ' + mime);
    const name = names[n++];
    if (!name) throw new Error(page + ': ' + n + '. görsel için ad yok');
    const buf = Buffer.from(b64.replace(/\s/g, ''), 'base64');
    const rel = 'assets/img/' + slug + '/' + name + '.' + ext;
    if (written[rel] && !written[rel].equals(buf)) throw new Error(rel + ': aynı ada farklı görsel');
    written[rel] = buf;
    const dim = sizeOf(buf, mime);
    let t = tag.replace(m[1], rel);
    if (dim) { t = addAttr(t, 'width', dim.w); t = addAttr(t, 'height', dim.h); }
    if (at !== first) t = addAttr(t, 'loading', 'lazy');
    rows.push('  ' + rel + '  ' + (dim ? dim.w + '×' + dim.h : '?') + '  ' + Math.round(buf.length / 1024) + ' KB');
    return t;
  });
  if (n !== names.length) throw new Error(page + ': ' + names.length + ' ad verildi, ' + n + ' gömülü görsel bulundu');
  const before = Buffer.byteLength(html), after = Buffer.byteLength(out);
  totalBefore += before; totalAfter += after;
  console.log(page.padEnd(24) + String(before).padStart(9) + ' → ' + String(after).padStart(7) + ' bayt  (' + n + ' görsel)');
  if (DRY) continue;
  for (const [rel, buf] of Object.entries(written)) {
    fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, rel), buf);
  }
  if (out !== html) fs.writeFileSync(file, out);
}
console.log('toplam'.padEnd(24) + String(totalBefore).padStart(9) + ' → ' + String(totalAfter).padStart(7) + ' bayt');
console.log(rows.join('\n'));
