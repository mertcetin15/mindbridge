# MindBridge — Aşama 6: oturum hedefi ve değerlendirme

Çalışan Groq sürümü korunarak kullanıcı adı/şifre, oturumlar ve kullanıcıya bağlı günlük, şükran ve ruh hâli kayıtları eklendi. SQLite yerel kurulumda otomatik çalışır; aynı SQLAlchemy veri modeli PostgreSQL ile kullanılabilir.

## Yeni özellik: bir oturum, bir hedef

Tools / Araçlar bölümünde tek oturumluk hedef ve ilk küçük adım yazılır. Başlatma mevcut zamanlayıcıyı seçilen süreyle başlatır. Mevcut çalışan sayaç ezilmez. Duraklatma/devam etme ve sıfırlama plana yansır. Süre sonunda kullanıcı tamamlandı / kısmen / tamamlanmadı sonucunu kendisi seçer; süre dolması görev başarıyla bitmiş gibi sayılmaz.

İsteğe bağlı değerlendirme **günlük taslağına** eklenir; mevcut yazı korunur. Kalıcı kayıt için günlükteki kaydet düğmesine basılmalıdır. Bu sırada normal misafir/hesap kayıt davranışı uygulanır. Oturum hedefi AI'ye gönderilmez ve otomatik saklanmaz. Açık sayfa belleğinde tutulur; yenileme/hesap değişiminde temizlenir. Hesap değişiminde plana bağlı sayaç da sıfırlanır.

Bu sürüm yeni topluluk, oda veya sosyal ağ eklemez. Genel uygulama yönünü değiştirmeden mevcut odak ve günlük araçlarını bağlar. Backend ve veritabanı şeması değişmedi.

## MacBook'ta çalıştırma

1. Eski uygulamanın Terminal'inde **Control+C** ile sunucuyu durdur.
2. Bu ZIP'i yeni bir klasöre aç; eski klasörü silme. V5 hesabın/kayıtların varsa, sunucu kapalıyken eski projenin `data` klasörünü yeni projenin içine kopyala. Önce bir yedek tut; yeni bir boş veritabanının üzerine yanlışlıkla farklı kayıtları kopyalama. Şema değişmediği için aynı SQLite dosyası kullanılır.
3. `Start-MindBridge.command` dosyasını aç. macOS doğrulama uyarısı çıkarsa **System Settings → Privacy & Security → Open Anyway** ile yalnızca bu dosyaya izin verebilirsin.
4. Çalışan Groq anahtarını gizli girişte yaz. Anahtar dosyaya kaydedilmez; her başlatmada yeniden istenir.
5. **http://127.0.0.1:8000** adresini aç. Aynı adresi kullan; `localhost` ve `127.0.0.1` farklı tarayıcı depoları/çerezleridir.
6. **Tools / Araçlar** bölümündeki **Hesabın** alanından kullanıcı adı ve en az 12 karakter şifreyle hesap oluştur. Giriş otomatik yapılır.
7. Günlük, şükran veya ruh hâli kaydı ekle; artık hesabın veritabanına yazılır. Misafir kayıtlarını istersen **Misafir kayıtlarını hesaba kopyala** düğmesiyle aktar.

Python 3.11+ gerekir. Başlatıcı ilk kurulumda bağımlılıkları indirir. Terminal açık kalmalıdır. Başlatıcı açılmazsa Terminal'de proje klasörüne girip:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 run.py --ai
```

`python3 run.py` ile anahtarsız demo ve hesapları da çalıştırabilirsin. HTML'ye çift tıklayınca hesap API'si çalışmaz; sunucu adresini kullan.

## Kullanıcı davranışı

- Kullanıcı adı 3–32 karakter, Latin harfleri/rakam/alt çizgi/tire; büyük-küçük harf farkı yok. E-posta toplanmaz.
- Şifre 12–128 karakter; Argon2id hash'i saklanır. Şifre düz metin saklanmaz.
- Giriş oturumu 12 saat sonra sona erer. Çıkış sunucu oturumunu iptal eder. Şifre değişikliği bütün oturumları kapatır.
- Misafir kayıtları önceki tarayıcı yerel depolamasında kalır. Hesap kaydı ve misafir kaydı ayrı tutulur; otomatik aktarım yok.
- Aktarım açık kullanıcı eylemidir. Orijinal misafir kayıtları silinmez. Aynı kaynak ID yeniden aktarıldığında ikinci kayıt oluşmaz. Birden fazla aktarım paketi varsa önceki paketler hata öncesinde kaydedilmiş olabilir; tekrar aktarım aynı ID'lerle devam edebilir.
- Yeni hesap kayıtları sunucu veritabanında tutulur. Yerel kurulumda bu sunucu ve veritabanı MacBook'undadır; cihazlar arasında bulut eşitlemesi henüz yoktur.
- Kayıt metinleri **veritabanında şifrelenmeden** tutulur. Hesap yetkilendirmesi başka hesapların erişimini engeller; cihaz dosyasına yönetici erişimine karşı şifreleme sağlamaz. Bu aşamada hassas gerçek sağlık verisiyle kullanıma hazır olduğu iddia edilmez.
- Günlük/mood metinleri AI sağlayıcısına gönderilmez. AI sohbeti ayrı kalır; yalnızca sohbet mesajları Groq'a gider. Hesap değişiminde mevcut sohbet belleği ve günlük taslakları temizlenir.
- **Kayıtlarımı indir** JSON dışa aktarımıdır. **Hesabı ve kayıtları sil** mevcut şifreyi ve uygulama içi silme onayını ister. Veritabanındaki hesap/kayıt/oturumlar işlem olarak silinir; tarayıcı misafir kayıtları ve varsa harici yedekler silinmez.
- E-posta doğrulama, şifre sıfırlama, sosyal giriş ve iki aşamalı doğrulama henüz yoktur. Şifreni unutursan bu sürümde kurtarma akışı bulunmaz.

## Mimari

- `backend/database.py`: SQLAlchemy `users`, `login_sessions`, `entries`, `schema_version` tabloları. Kayıtlar kullanıcıya ait yabancı anahtarlarla ilişkilidir. `(user_id, client_id)` benzersizliği tekrar gönderim/aktarım için kullanılır. Hesap silmede yabancı anahtar cascade vardır.
- `backend/accounts.py`: kayıt/giriş/çıkış, parola değişikliği, hesap silme, oturum bilgisi, kayıt CRUD, import ve export uçları.
- `backend/app.py`: Groq API ve hesap router'ı, yaşam döngüsünde veritabanı açma/kapatma, hassas veri içermeyen hata cevapları.
- `frontend/accounts-v5.js`: dört dilde hesap arayüzü; mevcut kayıt düğmelerini misafir veya hesap moduna yönlendirir. Başarısız kaydetmede taslak korunur. UI sayfalı geçmiş, hesap değişiminde önbellek temizliği ve gecikmiş yanıt kontrolü içerir.
- `build_frontend.py`: mevcut tasarım, sohbet ve hesap kaynaklarından `frontend/index.html` ve `MindBridge-v6.html` üretir.

HttpOnly, SameSite=Strict oturum çerezi kullanılır; oturum token'ının yalnızca SHA-256 özeti veritabanına yazılır. JWT/session token localStorage'a konulmaz. Değiştiren işlemlerde özel istemci başlığı, aynı köken denetimi ve CSRF token gerekir. Hesap sahibi istemci verisinden alınmaz, sunucu oturumundan çözülür. Kayıtlar listeleme/silme/export sırasında kullanıcı ID'sine göre filtrelenir.

Yerel HTTP için Secure çerez kapalıdır; dış hostingde HTTPS ve `COOKIE_SECURE=1` gerekir. Auth denemeleri süreç genelinde 15/dakika ile sınırlandırılır. Hesap başına 2.000 kayıt, sayfa başına en fazla 100 kayıt vardır. Journal sınırı 10.000, gratitude 1.000 karakter; mood beş desteklenen simgeden biridir. Import tarihleri doğrulanır. Şema sürümü 1 yalnızca ilk kurulum oluşturmasını destekler; gelecekte şema değişikliği için migration gerekir, mevcut şemayı sessizce değiştirmez.

## Veritabanı ve yedek

Varsayılan dosya: `data/mindbridge.sqlite3`. Yeni ZIP'ler kullanıcı veritabanını içermez. Klasörü silmek bu dosyayı da silebilir. Güncellemeden önce uygulamayı durdurup veritabanının yedeğini al veya kayıtları export et. Bu dosyayı GitHub'a yükleme; `.gitignore` dışarıda tutar. Groq anahtarı da pakette bulunmaz.

PostgreSQL için `DATABASE_URL` desteklenir:

```text
postgresql+psycopg://USER:PASSWORD@127.0.0.1:5432/mindbridge
```

URL'de gerçek kullanıcı/parola yerel ortam değişkeni olarak ayarlanmalıdır. Varsayılan SQLite verisi PostgreSQL'e kendiliğinden taşınmaz. Geçişte dışa aktarım/aktarımı ve ayrıca yedek planını kullan. PostgreSQL sunucusu bu çalışma ortamında mevcut olmadığından canlı PostgreSQL doğrulaması yapılmadı. MacBook'ta hemen kullanmak için PostgreSQL kurman gerekmiyor.

## Testler

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m pytest -q
node tests/test_chat_frontend.cjs
node tests/test_accounts_frontend.cjs
node tests/test_focus_frontend.cjs
node tests/test_timer_integration.cjs
```

84 test: Groq/önceki API kontrolleri ve hesap kayıt, parola hash'i, çerezler, oturum yenileme/sona erme, CSRF/origin, başka hesap kayıtlarına erişim engeli, atomik import, idempotency, silme, şifre değişimi, export, sayfalama ve yeniden başlatma sonrası SQLite kalıcılığı.

18 sohbet + 10 hesap + 13 oturum hedefi + 24 ses/zamanlayıcı davranış kontrolü. Yeni timer state olaylarıyla üretilen zamanlayıcı kodu da test edilir. Bunlar simüle DOM/fetch ortamında çalışır. JavaScript sözdizimi ayrıca kontrol edilir; gerçek tarayıcı görsel/Safari/ekran okuyucu kontrolleri henüz tamamlanmadı. Yeni sürüm için canlı Groq isteği yapılmadı; önceki sürüm kullanıcı tarafından canlı denenmişti.

Bu yerel prototip internete açık yayına hazır değildir. Dağıtık rate limiting, HTTPS/hosting, üretim migration ve yedekleme, parola kurtarma, dış script/CSP incelemesi ve bağımsız güvenlik değerlendirmesi kalır. Klinik/mahremiyet/GDPR uyumluluk iddiası yoktur.

## Referanslar

- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://docs.sqlalchemy.org/en/20/core/engines.html
- https://console.groq.com/docs/text-chat
