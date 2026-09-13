# Website SantoSoft

Website utama SantoSoft — brand induk yang membawahi Pardi. Berisi 4 halaman: Beranda, Produk & Layanan, Harga, dan Kontak, plus link ke Dashboard Afiliator (yang merupakan sistem afiliator Pardi, bukan sistem baru).

## Struktur menu (mengikuti instruksi):
- **Produk & Layanan** — mencantumkan 3 layanan inti (Website, Aplikasi APK, Servis Software) + bagian khusus mengenalkan **Pardi** sebagai produk UMKM dari SantoSoft
- **Dashboard Afiliator** — bukan halaman baru, tapi link langsung ke sistem afiliator Pardi yang sudah dibangun sebelumnya (`https://pardi.id/afiliator.html` — **ganti dengan domain Pardi yang sebenarnya** setelah live)

## Sebelum publish — ganti dulu:
- Nomor WhatsApp (`6281200000000`) di semua file HTML dan `assets/js/main.js`
- Email (`Softwaresantoso@gmail.com`) di footer & halaman Kontak
- **URL Dashboard Afiliator** (`https://pardi.id/afiliator.html`) di `index.html`, `layanan.html`, `harga.html`, `kontak.html` — ganti dengan domain Pardi yang sesungguhnya
- Link "Kunjungi situs Pardi" di `layanan.html` (masih placeholder `https://pardi.id`)

## Deploy ke Netlify via GitHub
Sama seperti setup website Pardi sebelumnya:
1. Push folder ini ke repo GitHub baru (terpisah dari repo Pardi)
2. Di Netlify: **Add new site → Import an existing project → GitHub** → pilih repo ini
3. Build command: kosongkan. Publish directory: `.`
4. Deploy — HTTPS otomatis aktif

## Konten harga
Halaman `harga.html` sudah memakai struktur yang sudah direvisi (bukan versi awal yang ada kontradiksi Payment Gateway/Multi-cabang dobel harga). Kalau ada penyesuaian harga lagi nanti, edit langsung di `harga.html`.

## PWA
Sama seperti Pardi, situs ini sudah punya `manifest.json` + `sw.js` (service worker dengan strategi network-first untuk halaman, supaya update selalu tampil begitu di-redeploy — bukan cache-first yang sempat jadi masalah di situs Pardi).
