# POS Bakso Umum

Aplikasi kasir internal Bakso Umum Khas Makassar berbasis React, TypeScript, Vite, dan Firebase Firestore. Data operasional tersinkron realtime antarperangkat dan tetap dapat dipakai saat koneksi internet terputus.

## Akun awal

| Akun | Peran | PIN awal |
|---|---|---:|
| Owner | Akses penuh | `1234` |
| Manager | Operasional dan pengaturan | `1234` |
| Kasir | Kasir dan riwayat transaksi | `1234` |

Owner dapat mengganti PIN semua akun. Manager dapat mengganti PIN Manager dan Kasir. PIN dapat diubah melalui menu **Pengguna**.

## Fitur

- Login berbasis akun dan PIN.
- Kasir dengan katalog, kategori, pencarian, keranjang, diskon, dan pajak.
- Pembayaran Tunai, QRIS, dan Transfer.
- Perhitungan uang diterima dan kembalian.
- Riwayat serta detail transaksi.
- Pembatalan transaksi oleh Owner atau Manager.
- Pengelolaan menu, harga, status aktif, dan gambar.
- Laporan omzet, transaksi, produk terlaris, dan metode pembayaran.
- Pengaturan profil outlet dan pajak.
- Preview dan cetak struk 58/80 mm.
- Pairing printer melalui Web Bluetooth dan fallback dialog cetak browser.
- Cetak langsung ESC/POS melalui BLE GATT tanpa membuka PDF.
- Restore binding printer, reconnect saat mencetak, dan deteksi koneksi putus.
- Auto print setelah pembayaran.
- Laporan harian, mingguan, bulanan, dan grafik tujuh hari.
- Backup seluruh data menjadi JSON.
- Pemulihan data dari file backup JSON.
- Layout responsif untuk komputer, tablet, dan telepon.
- PWA installable dengan service worker, cache aset, dan fallback offline.
- Keranjang mobile berbentuk bottom drawer agar katalog tidak terpotong atau memanjang.
- Sinkronisasi realtime produk, transaksi, akun, PIN, dan pengaturan outlet antarperangkat.
- Cache Firestore persisten: perubahan saat offline akan dikirim otomatis setelah koneksi pulih.
- Indikator status cloud pada bagian atas aplikasi.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

## Pemeriksaan kualitas

```bash
npm run lint
npm test
npm run build
```

## Penyimpanan dan sinkronisasi data

Firestore adalah sumber data bersama untuk produk, transaksi, akun, PIN, dan pengaturan. Setiap perubahan Owner atau Manager dikirim ke cloud dan diterima perangkat lain secara realtime. Firestore juga menyimpan cache persisten pada perangkat, sedangkan `localStorage` dipertahankan sebagai salinan pemulihan lokal. Sesi login tetap disimpan di `sessionStorage` dan berakhir ketika sesi browser ditutup.

Indikator pada header memperlihatkan status **Cloud aktif**, **Sinkronisasi**, **Offline**, atau **Sync gagal**. Saat offline, perubahan masuk antrean lokal Firestore dan dikirim otomatis ketika koneksi kembali. Gunakan menu **Pengaturan → Unduh backup** secara berkala sebagai cadangan tambahan.

## Firebase

Konfigurasi Firebase dibaca dari `.env`. Salin `.env.example` menjadi `.env` pada instalasi baru. Inisialisasi cache Firestore berada di `src/lib/firebase.ts`, sedangkan listener realtime dan operasi tulis berada di `src/lib/cloudStore.ts`.

Rules saat ini sengaja dibatasi ke namespace aplikasi (`pos_products`, `pos_orders`, `pos_users`, dan `pos_config`), tetapi belum mewajibkan Firebase Authentication karena aplikasi masih digunakan oleh tim internal kecil. Sebelum penggunaan publik, aktifkan Authentication dan perketat rules berdasarkan peran.

## Printer thermal

Jalur utama adalah **Web Bluetooth BLE** pada Chrome/Edge melalui HTTPS. Alur pertama kali:

1. Buka **Printer → Hubungkan Bluetooth**.
2. Pilih printer thermal.
3. Aplikasi menyambungkan GATT, mencari service dan writable characteristic, lalu menyimpan binding lokal.
4. Tekan **Test cetak Bluetooth**. Test ini mencetak format struk lengkap—logo raster, identitas outlet, tiga produk contoh, subtotal, total, pembayaran, kembalian, dan footer—langsung melalui ESC/POS tanpa membuka PDF.

Pada kunjungan berikutnya, aplikasi mencoba memulihkan perangkat melalui permission browser. Pastikan printer menyala dan Bluetooth aktif. Tombol **Cetak melalui browser** sengaja dipertahankan sebagai fallback dan memang dapat menampilkan tujuan Save as PDF.

Web Bluetooth hanya bekerja pada printer yang mengekspos BLE GATT writable characteristic. Printer Bluetooth Classic/SPP yang tidak mempunyai BLE tidak dapat dicetak langsung dari browser dan membutuhkan aplikasi native, Web Serial, atau driver sistem.

## Struktur utama

```text
src/
  context/PosStore.tsx  State dan persistensi aplikasi
  data/seed.ts          Akun dan menu awal
  lib/order.ts          Perhitungan transaksi
  lib/firebase.ts       Fondasi integrasi Firebase
  lib/cloudStore.ts     Sinkronisasi realtime dan antrean tulis Firestore
  App.tsx               Halaman dan alur aplikasi
  index.css             Sistem desain responsif
```
