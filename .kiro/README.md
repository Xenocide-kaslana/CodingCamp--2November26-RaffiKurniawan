# Daylight — Life Dashboard

**A little progress, every day.** *(Sedikit kemajuan, setiap hari.)*

Daylight adalah dashboard produktivitas personal dengan tema pastel lembut.
Aplikasi ini menggabungkan jam digital real-time dengan sapaan dinamis, timer
fokus Pomodoro, pengelola to-do list lengkap, dan pengelola shortcut website —
semuanya dalam satu aplikasi single-page dengan mode terang dan gelap.

Semua data disimpan secara lokal di browser. Tidak ada backend, tidak ada
database, tidak ada framework.

---

## Tujuan Proyek

Tujuannya adalah membangun produk produktivitas personal yang polished (bukan
dashboard admin generic) yang memungkinkan pengguna untuk:

- Melihat waktu saat ini dan sapaan yang berubah sesuai waktu.
- Menjalankan sesi fokus dengan timer Pomodoro yang bisa dikustomisasi.
- Mengatur aktivitas harian melalui to-do list dengan sorting dan pencegahan
  duplikat.
- Menyimpan shortcut website untuk akses cepat.
- Beralih antara tema terang dan gelap.
- Menyimpan semua data pengguna secara lokal agar tetap ada setelah refresh
  browser.

---

## Fitur Wajib

### Jam Digital & Sapaan

- Jam digital real-time yang update setiap detik (HH:MM:SS).
- Tanggal hari ini ditampilkan dalam format panjang (contoh: "Friday, November 6").
- Sapaan dinamis yang berubah berdasarkan waktu lokal browser:
  - **Good Morning** (Selamat Pagi) — 05:00 sampai 11:59
  - **Good Afternoon** (Selamat Siang) — 12:00 sampai 17:59
  - **Good Evening** (Selamat Sore) — 18:00 sampai 21:59
  - **Good Night** (Selamat Malam) — 22:00 sampai 04:59
- Nama pengguna kustom yang tampil di sapaan.
- Pesan motivasi singkat yang berganti sesuai waktu.

### Timer Fokus (Pomodoro)

- Durasi default 25 menit, ditampilkan dalam format MM:SS.
- Tombol Start, Pause, dan Reset.
- Ring progress melingkar (SVG) yang terisi selama sesi berjalan.
- Akurasi timer: waktu tersisa dihitung dari timestamp `Date.now()`,
  bukan dari counter yang dikurangi terus-menerus, jadi tidak ada drift
  (penyimpangan waktu).
- Mencegah multiple interval timer yang berjalan bersamaan.
- Pause menyimpan detik tersisa; resume menghitung ulang timestamp akhir.
- Notifikasi selesai via toast dan opsional browser Notification API.
- Durasi bisa dikustomisasi (1–120 menit), disimpan ke Local Storage.

### To-Do List

- **Tambah** — lewat klik tombol atau tombol Enter. Menolak task kosong.
- **Edit** — edit inline dengan double-click atau tombol edit. Enter untuk
  simpan, Escape untuk batal. Memvalidasi input kosong dan duplikat saat simpan.
- **Selesai** — toggle lewat klik checkbox atau keyboard (Enter/Space).
  Task yang selesai memiliki text dicoret dan opacity dikurangi.
- **Hapus** — dengan dialog konfirmasi sebelum dihapus.
- Menampilkan jumlah total, selesai, dan task yang tersisa.
- Progress bar penyelesaian task dengan persentase.
- Tampilan empty-state ketika belum ada task.
- Keyboard accessibility di seluruh fitur.
- Semua task tersimpan di Local Storage setelah refresh browser.

### Quick Links (Shortcut Website)

- Tambah nama website dan URL.
- Validasi URL: menolak field kosong dan URL tidak valid. Menerima HTTP dan
  HTTPS. Auto menambahkan `https://` kalau pengguna tidak menulis protocol.
- Link tersimpan ditampilkan sebagai kartu shortcut dengan inisial website,
  nama, dan domain hostname.
- Klik shortcut membuka website di tab baru browser dengan
  `rel="noopener noreferrer"` untuk keamanan.
- Hapus link dengan konfirmasi.
- Semua link tersimpan di Local Storage setelah refresh browser.
- Tampilan empty-state ketika belum ada link.

### Dashboard Summary

- Widget ringkasan task yang menampilkan jumlah tersisa dan progress bar.
- Widget timer fokus yang menampilkan tampilan dan status saat ini.
- Widget quick links yang menampilkan jumlah link tersimpan.
- "Today at a glance" — preview mini task list (5 task teratas).
- "Your Quick Access" — menampilkan semua shortcut website tersimpan sebagai
  kartu yang bisa diklik, dengan empty state dan tombol navigasi ketika belum
  ada link.
- Semua widget dashboard tersinkron real-time dengan section masing-masing.

### Settings (Pengaturan)

- Nama tampilan yang bisa diedit (langsung update sapaan, sidebar, dan header).
- Konfigurasi durasi Pomodoro (1–120 menit).
- Pilihan tema (terang/gelap) lewat tombol swatch.
- Opsi hapus semua data dengan konfirmasi.
- Section About (tentang aplikasi).

### Sidebar Navigation

- Logo Daylight, nama aplikasi, dan tagline.
- Item navigasi: Dashboard, My Tasks, Focus Timer, Quick Links, Settings.
- Indikator section aktif dengan highlight pastel.
- Area profil pengguna dengan avatar inisial.
- Responsive: berubah jadi slide-in drawer dengan toggle hamburger di mobile.

### Responsive Design

- **Desktop** — sidebar tetap, dashboard grid multi-kolom, spacing seimbang.
- **Tablet** (≤1024px) — sidebar compact, dashboard grid 2 kolom.
- **Mobile** (≤768px) — sidebar collapsible dengan overlay, layout single-column,
  tombol touch-friendly, form field bertumpuk, toast full-width.
- **Small mobile** (≤420px) — ukuran tipografi lebih kecil lagi.
- Tidak ada horizontal overflow di ukuran viewport apa pun.

---

## 5 Challenge Tambahan

### Challenge 1: Light / Dark Mode

Theme switcher yang berfungsi, bisa diakses dari tombol icon di header atau
dari opsi appearance di Settings.

- **Light mode**: background `#F8F7FC`, surface kartu putih, text gelap
  (`#353344`), accent pastel lavender.
- **Dark mode**: background charcoal gelap (`#1E1B26`) dengan undertone
  lavender, surface gelap (`#28242F`), text terang nyaman (`#ECE9F2`),
  accent pastel yang muted.
- Semua komponen beradaptasi lewat CSS custom properties yang di-override
  di `[data-theme="dark"]`.
- Pilihan tema disimpan dan dipulihkan dari Local Storage.
- Inline script di HTML `<head>` menerapkan tema tersimpan sebelum page
  di-render untuk mencegah flash tema yang salah (FOUC prevention).

### Challenge 2: Custom Name di Greeting

Pengguna bisa memasukkan nama tampilan yang diinginkan di Settings.

- Langsung update sapaan ("Good Morning, Alex"), judul header, nama profil
  sidebar, dan inisial avatar saat disimpan.
- Disimpan ke Local Storage dan dipulihkan setelah refresh.
- Tombol Enter juga memicu save.

### Challenge 3: Ubah Durasi Pomodoro

Pengguna bisa mengustomisasi durasi sesi fokus.

- Default: 25 menit.
- Range yang diizinkan: 1–120 menit. Nilai di luar range ini ditolak dengan
  toast notification.
- Bisa diatur dari section Focus Timer maupun halaman Settings. Kedua input
  selalu tersinkron.
- Saat timer tidak berjalan, menerapkan durasi baru akan reset timer ke nilai
  baru. Saat timer sedang berjalan, durasi baru berlaku saat reset berikutnya.
- Disimpan ke Local Storage dan dipulihkan setelah refresh.

### Challenge 4: Cegah Task Duplikat

Pengguna tidak bisa menambahkan task dengan nama yang sama.

- Perbandingan case-insensitive (`toLowerCase()`) dan memotong whitespace
  di awal/akhir.
- Menampilkan toast yang ramah: "That task already exists."
- Tidak ada entri duplikat yang dibuat.
- Pengecekan duplikat juga berlaku saat edit inline (mengecualikan task yang
  sedang diedit).

### Challenge 5: Sort Task

Lima opsi sorting tersedia lewat dropdown:

| Opsi | Perilaku |
|------|----------|
| Default order | Berdasarkan timestamp pembuatan, terlama dulu |
| Alphabetical A–Z | `localeCompare` ascending |
| Alphabetical Z–A | `localeCompare` descending |
| Pending first | Task belum selesai di depan yang sudah selesai, lalu by creation order |
| Completed first | Task sudah selesai di depan yang belum, lalu by creation order |

- Sorting bekerja pada copy array task (`slice()`), jadi data task yang
  disimpan tidak pernah dimutasi atau ditimpa.
- Preferensi sort disimpan ke Local Storage dan dipulihkan setelah refresh.

---

## Technology Stack

| Layer | Teknologi |
|-------|-----------|
| Struktur | HTML5 |
| Styling | CSS3 (custom properties, flexbox, grid, media queries) |
| Logic | Vanilla JavaScript (pola IIFE, kompatibel ES5) |
| Persistensi data | Browser Local Storage API |
| Font | Plus Jakarta Sans, JetBrains Mono (Google Fonts) |

Tidak ada build tools, tidak ada package manager, tidak ada bundler, tidak ada
transpiler. Aplikasi berjalan dengan membuka `index.html` langsung di browser.

---

## Implementasi Local Storage

Semua data persisten pengguna disimpan di Local Storage browser. Tidak ada
informasi sensitif yang disimpan.

| Key | Tipe | Deskripsi | Default |
|-----|------|-----------|---------|
| `daylight_tasks` | JSON array | Object task dengan `id`, `text`, `completed`, `createdAt` | `[]` |
| `daylight_links` | JSON array | Object link dengan `id`, `name`, `url` | `[]` |
| `daylight_username` | String | Nama tampilan pengguna | `''` |
| `daylight_theme` | String | `'light'` atau `'dark'` | `'light'` |
| `daylight_duration` | String | Durasi Pomodoro dalam menit (1–120) | `'25'` |
| `daylight_sort` | String | Mode sort task (`default`, `az`, `za`, `pending`, `completed`) | `'default'` |

Detail implementasi:

- **JSON parsing yang aman**: Semua baca JSON pakai `JSON.parse` yang dibungkus
  try-catch dengan fallback default, jadi data yang rusak tidak pernah bikin
  app crash.
- **JSON writing yang aman**: Semua tulis pakai `JSON.stringify` yang dibungkus
  try-catch dengan toast error kalau storage penuh atau tidak tersedia.
- **Validasi data saat load**: Task dan link di-filter dan disanitasi saat
  inisialisasi — field yang hilang dapat default, entri tidak valid dibuang.
- **Sinkronisasi state**: Object `state` di memori adalah single source of
  truth. Setiap mutasi menulis ke Local Storage, lalu me-render ulang UI yang
  terdampak. Saat page load, `init()` membaca semua key dan mengisi `state`
  sebelum rendering terjadi.

---

## Struktur Folder Proyek

```
Life-Dashboard/
│
├── index.html              Entry point (struktur HTML5)
│
├── css/
│   └── style.css            Satu-satunya stylesheet (design system + responsive)
│
├── js/
│   └── script.js            Satu-satunya script (semua logic aplikasi)
│
└── .kiro/
    └── README.md            File ini
```

Aturan yang diikuti:

- Tepat satu file CSS di dalam `css/`.
- Tepat satu file JavaScript di dalam `js/`.
- `index.html` adalah entry point di root repository.
- Folder `.kiro` dipertahankan.
- Tidak membuat file CSS atau JavaScript tambahan.
- Semua path relatif untuk kompatibilitas GitHub Pages.

---

## Constraint Development (Tugas CCSE)

Constraint berikut ditentukan oleh tugas Coding Camp Software Engineering dan
dipatuhi dengan ketat:

### Teknologi yang dilarang

- React, Vue, Angular, Next.js, Svelte, atau framework frontend lain apa pun.
- Bootstrap, Tailwind CSS, atau CSS framework lain apa pun.
- Backend server atau database server jenis apa pun.
- Build tools atau test environment yang butuh setup kompleks.

### Teknologi yang diwajibkan

- HTML5 untuk struktur page.
- CSS3 untuk styling.
- Vanilla JavaScript untuk fungsionalitas.
- Browser Local Storage API untuk persistensi data.

### Kompatibilitas browser

Aplikasi menargetkan browser modern: Google Chrome, Mozilla Firefox,
Microsoft Edge, dan Safari.

### Kompatibilitas GitHub Pages

- `index.html` berada di root repository.
- Semua path asset relatif (`css/style.css`, `js/script.js`).
- Tidak ada dependensi backend atau fungsionalitas yang butuh server.
- Folder `.kiro` dipertahankan di repository source.
- Navigasi dan interaksi berfungsi di static site yang di-deploy.

### Kualitas kode

- Source code bersih, terorganisir, mudah dibaca, dan dikomentari dengan benar.
- Setiap file punya blok komentar header yang menjelaskan tujuannya.
- JavaScript pakai IIFE untuk menghindari mencemari global scope.
- CSS pakai custom properties (design tokens) untuk theming yang konsisten.
- Animasi menghormati `prefers-reduced-motion`.

---

## Cara Menjalankan

1. Buka `index.html` di browser modern apa pun (Chrome, Firefox, Edge, Safari).
2. Tidak perlu server, build step, atau dependensi.
3. Semua data disimpan secara lokal — refresh page untuk verifikasi
   persistensi.

## Cara Deploy (GitHub Pages)

1. Push repository ke GitHub.
2. Buka **Settings → Pages**.
3. Set source ke **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Site akan tersedia di `https://<username>.github.io/<repo>/`.

