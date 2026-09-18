const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PASSWORD = process.argv[2];
const INPUT = process.argv[3];
const OUTPUT = process.argv[4];
const ITERATIONS = 250000;

if (!PASSWORD || !INPUT || !OUTPUT) {
  console.error('usage: node encrypt.js <password> <input.html> <output.html>');
  process.exit(1);
}

const plaintext = fs.readFileSync(INPUT, 'utf8');
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);

const key = crypto.pbkdf2Sync(PASSWORD, salt, ITERATIONS, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();
// Web Crypto AES-GCM expects the auth tag appended to the ciphertext.
const ciphertext = Buffer.concat([encrypted, authTag]);

const lockPage = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bergeç — Giriş</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #f3f2f2; color: #201f1d;
    font-family: "Lora", Georgia, serif; padding: 20px;
  }
  .box { width: 100%; max-width: 360px; text-align: center; }
  .mark {
    font-family: "Cormorant Garamond", Georgia, serif; font-size: 32px; letter-spacing: 0.04em;
    margin: 0 0 6px;
  }
  .sub {
    font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7d7979; margin: 0 0 36px;
  }
  form { display: flex; flex-direction: column; gap: 12px; }
  input[type="password"] {
    font: inherit; font-size: 15px; padding: 12px 14px; border: 1px solid #201f1d; border-radius: 2px;
    background: #fff; color: #201f1d; text-align: center; letter-spacing: 0.04em;
  }
  input[type="password"]:focus { outline: 2px solid #b68235; outline-offset: 1px; }
  button {
    font: inherit; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase;
    padding: 12px 14px; border: 1px solid #201f1d; background: #201f1d; color: #f3f2f2;
    border-radius: 2px; cursor: pointer;
  }
  button:hover { background: #3a3836; }
  button:disabled { opacity: 0.6; cursor: wait; }
  #err { color: #a03a2c; font-size: 13px; margin-top: 14px; min-height: 1.2em; }
  noscript { display: block; margin-top: 20px; font-size: 13px; color: #a03a2c; }
</style>
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "acab01d6baa64c2a827dc674fcab7c85"}'></script><!-- End Cloudflare Web Analytics -->
</head>
<body>
  <div class="box">
    <p class="mark">bergeç</p>
    <p class="sub">Bu içerik parola ile korunuyor</p>
    <form id="pwform" autocomplete="off">
      <input type="password" id="pw" placeholder="Parola" autocomplete="current-password" autofocus>
      <button type="submit" id="go">Gir</button>
    </form>
    <p id="err"></p>
    <noscript>Bu sayfayı görüntülemek için JavaScript gereklidir.</noscript>
  </div>

<script>
  var SALT_B64 = ${JSON.stringify(salt.toString('base64'))};
  var IV_B64 = ${JSON.stringify(iv.toString('base64'))};
  var CIPHERTEXT_B64 = ${JSON.stringify(ciphertext.toString('base64'))};
  var ITERATIONS = ${ITERATIONS};

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  async function deriveKey(password, saltBytes) {
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  var form = document.getElementById('pwform');
  var pwInput = document.getElementById('pw');
  var err = document.getElementById('err');
  var go = document.getElementById('go');
  var SESSION_KEY = 'bergec-pw';

  async function tryDecrypt(password) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('no-subtle');
    var salt = b64ToBytes(SALT_B64);
    var iv = b64ToBytes(IV_B64);
    var ct = b64ToBytes(CIPHERTEXT_B64);
    var key = await deriveKey(password, salt);
    var plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
    return new TextDecoder().decode(plainBuf);
  }

  function reveal(html, password) {
    try { sessionStorage.setItem(SESSION_KEY, password); } catch (e) {}
    document.open();
    document.write(html);
    document.close();
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    err.textContent = '';
    go.disabled = true;
    go.textContent = 'Kontrol ediliyor…';
    try {
      var html = await tryDecrypt(pwInput.value);
      reveal(html, pwInput.value);
    } catch (ex) {
      if (ex && ex.message === 'no-subtle') {
        err.textContent = 'Tarayıcınız bu şifrelemeyi desteklemiyor (https veya localhost gerekir).';
      } else {
        err.textContent = 'Yanlış parola.';
      }
      go.disabled = false;
      go.textContent = 'Gir';
      pwInput.select();
    }
  });

  (async function autoUnlock() {
    var cached;
    try { cached = sessionStorage.getItem(SESSION_KEY); } catch (e) {}
    if (!cached) return;
    try {
      var html = await tryDecrypt(cached);
      reveal(html, cached);
    } catch (e) {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e2) {}
    }
  })();
</script>
</body>
</html>
`;

fs.writeFileSync(OUTPUT, lockPage);
console.log('Encrypted', INPUT, '->', OUTPUT, `(${plaintext.length} bytes plaintext, ${ciphertext.length} bytes ciphertext)`);
