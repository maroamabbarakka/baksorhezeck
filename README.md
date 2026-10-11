# POS Bakso Umum

Aplikasi kasir internal Bakso Umum Khas Makassar berbasis React, TypeScript, Vite, dan penyimpanan lokal browser. Konfigurasi Firebase sudah disiapkan untuk tahap sinkronisasi berikutnya.

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

## Penyimpanan data

Pada tahap awal, data tersimpan di `localStorage` browser pada perangkat yang digunakan. Sesi login disimpan di `sessionStorage` dan berakhir ketika sesi browser ditutup.

Gunakan menu **Pengaturan → Unduh backup** secara berkala. Menghapus data situs/browser akan menghapus data lokal bila belum dicadangkan.

## Firebase

Konfigurasi Firebase dibaca dari `.env`. Salin `.env.example` menjadi `.env` pada instalasi baru. Modul tersedia di `src/lib/firebase.ts`, tetapi sinkronisasi cloud belum diaktifkan pada versi internal awal ini.

## Printer thermal

Jalur utama adalah **Web Bluetooth BLE** pada Chrome/Edge melalui HTTPS. Alur pertama kali:

1. Buka **Printer → Hubungkan Bluetooth**.
2. Pilih printer thermal.
3. Aplikasi menyambungkan GATT, mencari service dan writable characteristic, lalu menyimpan binding lokal.
4. Tekan **Test cetak Bluetooth**. Test ini mengirim byte ESC/POS langsung dan tidak membuka PDF.

Pada kunjungan berikutnya, aplikasi mencoba memulihkan perangkat melalui permission browser. Pastikan printer menyala dan Bluetooth aktif. Tombol **Cetak melalui browser** sengaja dipertahankan sebagai fallback dan memang dapat menampilkan tujuan Save as PDF.

Web Bluetooth hanya bekerja pada printer yang mengekspos BLE GATT writable characteristic. Printer Bluetooth Classic/SPP yang tidak mempunyai BLE tidak dapat dicetak langsung dari browser dan membutuhkan aplikasi native, Web Serial, atau driver sistem.

## Struktur utama

```text
src/
  context/PosStore.tsx  State dan persistensi aplikasi
  data/seed.ts          Akun dan menu awal
  lib/order.ts          Perhitungan transaksi
  lib/firebase.ts       Fondasi integrasi Firebase
  App.tsx               Halaman dan alur aplikasi
  index.css             Sistem desain responsif
```
