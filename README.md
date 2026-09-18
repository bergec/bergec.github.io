# Bergeç — içerik düzenleme rehberi

Site parola korumalı olarak yayınlanıyor: her sayfa istemci tarafında AES-256-GCM ile şifrelenmiş durumda, tarayıcı doğru parolayı girene kadar hiçbir metin okunamaz.

Artık iki yol var:

- **Yönetim ekranı** (`admin.html`) — tarayıcıdan yazı ekleyip düzenlersiniz, görselleri sürükleyip yerini ayarlarsınız. Şifreleme ve GitHub'a gönderme otomatik. **Normalde bunu kullanın.**
- **Elle düzenleme** — `_source_plaintext_DO_NOT_PUBLISH/` içindeki kaynakları metin editörüyle değiştirip `tools/encrypt.js` ile şifrelemek. Eski, elle yazılmış yazılar (Enigma, Knuth, Gödel…) böyle hazırlandı.

Parola şu an: `QH3S9ZtPGWGuh9z7`

---

## 1. Yönetim ekranı

Adres: **https://bergec.github.io/admin.html**

### İlk kurulum (bir kez)

1. GitHub'da [fine-grained token](https://github.com/settings/personal-access-tokens/new) oluşturun:
   - **Repository access** → *Only select repositories* → `bergec/bergec.github.io`
   - **Permissions** → *Repository permissions* → **Contents: Read and write**
   - Son kullanma tarihini istediğiniz gibi verin (süresi dolunca yenisini üretirsiniz).
2. `admin.html`'i açın, anahtarı ve site parolasını girin, **Bağlan**'a basın.

Anahtar yalnızca kendi tarayıcınızın `localStorage`'ında durur; hiçbir sunucuya gitmez. Ortak/halka açık bir bilgisayarda çalıştıysanız işiniz bitince **Anahtarı unut** düğmesine basın.

> `admin.html` herkese açık bir adres, ama anahtar + parola olmadan hiçbir şey göstermez ve hiçbir şey yapmaz.

### Yeni yazı eklemek

1. **+ Yeni yazı**.
2. Başlık, yazar, tarih, dosya adı ve arşiv özetini doldurun (dosya adı başlıktan otomatik önerilir).
3. Görselleri **Görseller** bölümünden seçin. Otomatik olarak küçültülüp (varsayılan en fazla 820 px) sayfanın içine gömülürler — böylece onlar da parolanın arkasında kalır.
   Her görselin altından **alt yazı**, **genişlik (%)** ve **hizalama** (tam / sola sarılı / sağa sarılı) ayarlanır. **Metne ekle** düğmesi imlecin olduğu yere `[[gorsel:1]]` işaretini koyar; görsel yazıda tam o noktada çıkar.
4. Metni yazın. Sağdaki önizleme sayfanın gerçek hâlini canlı gösterir.
5. **Yayınla**. Sayfa şifrelenir, yazı ve ana sayfa tek bir commit'le gönderilir, ~30 saniye sonra sitede görünür.

### Yazım kuralları

| Yazdığınız | Sonuç |
|---|---|
| `## Başlık` | bölüm başlığı |
| `### Ara başlık` | alt başlık |
| boş satır | yeni paragraf |
| `**kalın**` `*italik*` `` `kod` `` | vurgular |
| `- madde` / `1. madde` | listeler |
| `> alıntı` | alıntı bloğu |
| ` ``` ` … ` ``` ` | kod bloğu |
| `$a^2+b^2$` | satır içi formül (KaTeX) |
| `$$ … $$` | ortalanmış formül |
| `[metin](adres)` | bağlantı |
| `[[gorsel:1]]` | görseli buraya koy |
| `---` | ayraç çizgisi |

`<` ve `>` işaretlerini serbestçe kullanabilirsiniz; metin otomatik güvenli hâle getirilir.

### Var olan yazıyı düzenlemek

Listedeki **Yazıyı düzenle**'ye basın. Yönetim ekranıyla yazılmış yazılar aynı düzenleyicide (metin + görseller) açılır. Elle hazırlanmış eski yazılar ise **ham HTML** olarak açılır — doğrudan HTML'i düzenlersiniz.

**Arşiv kaydı** düğmesi yalnızca ana sayfadaki bilgiyi (başlık, tarih, özet, manşet girişi) değiştirir, yazının kendi sayfasına dokunmaz.

`↑ ↓` sıralamayı değiştirir; listenin en üstündeki yazı ana sayfanın manşetidir. **Sil** yazıyı arşivden çıkarır, isterseniz dosyasını da depodan siler.

---

## 2. Elle düzenleme

`_source_plaintext_DO_NOT_PUBLISH/` düzenlenebilir, şifresiz kaynakları tutar ve **`.gitignore`'da — asla GitHub'a gönderilmez.** Repo kökündeki `*.html` bunların şifreli hâlidir; elle düzenlemeyin.

```bash
cd "Bergeç nostalgic website redesign"
node tools/encrypt.js "QH3S9ZtPGWGuh9z7" "_source_plaintext_DO_NOT_PUBLISH/knuth-1.html" "knuth-1.html"
git add knuth-1.html && git commit -m "…" && git push
```

Yerelde denemek için: `python3 -m http.server 8000`, sonra `http://127.0.0.1:8000/knuth-1.html`.

**Dikkat:** Elle yazılan HTML'de metin veya formül içinde literal `<` ya da `>` kullanmayın (örn. "i<j") — tarayıcı bunu etiket sanıp sayfayı bozar. `&lt;` ve `&gt;` yazın. (Yönetim ekranında bu sorun yok.)

### Ana sayfadaki liste

Ana sayfa verisi `_source_plaintext_DO_NOT_PUBLISH/index.html` içindeki tek bir JSON bloğunda:

```html
<script type="application/json" id="bergec-index"> … </script>
```

`featured` manşeti, `posts` arşiv listesini tutar; "Son Postlar" kutusu bu ikisinden otomatik üretilir. Yönetim ekranı **yalnızca bu bloğu** değiştirir, sayfanın kalanına dokunmaz.

---

## 3. Parolayı değiştirmek

Tüm sayfaları yeni parolayla yeniden şifrelemeniz gerekir (hepsi aynı parolayı paylaşıyor):

```bash
for f in index godel-mektubu enigma-1 enigma-2 enigma-3 knuth-1 knuth-2 berelim-y-ile kodlarin-seruveni; do
  node tools/encrypt.js "YENİ_PAROLA" "_source_plaintext_DO_NOT_PUBLISH/$f.html" "$f.html"
done
git add *.html && git commit -m "Parolayı değiştir" && git push
```

---

## Dizin yapısı

| Yol | Ne |
|---|---|
| `index.html`, `*.html` (kök) | yayınlanan, şifreli sayfalar |
| `admin.html` | yönetim ekranı (şifresiz; anahtar + parola ister) |
| `assets/bergec.css` | sitenin tek stil dosyası — renkler, yazı tipleri, yazı sayfası düzeni |
| `.nojekyll` | GitHub Pages'in `_` ile başlayan klasörleri yok saymasını engeller |
| `_source_plaintext_DO_NOT_PUBLISH/` | düzenlenebilir kaynaklar (git'e gönderilmez) |
| `tools/encrypt.js` | şifreleme scripti (Node.js, ek kurulum gerektirmez) |
| `yazılar/` | orijinal PDF makaleler (git'e gönderilmez) |
| `_ds/` | tasarım sisteminin asıl kaynağı; `assets/bergec.css` buradan türetildi |

> **Not:** Stil dosyası önceden `_ds/…/styles.css` adresinden çekiliyordu. GitHub Pages `_` ile başlayan klasörleri yayınlamadığı için bu dosya sitede 404 veriyordu ve yazı sayfaları stilsiz görünüyordu. Stil artık `assets/bergec.css`'te.
