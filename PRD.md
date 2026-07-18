# Product Requirements Document (PRD): Portal PDF Tools

**Nama Proyek:** Portal PDF Tools
**Tujuan:** Membuat website yang menyediakan berbagai alat manipulasi dan konversi file PDF dalam satu tempat, dengan antarmuka yang bersih dan mudah digunakan.

## Daftar Fitur Utama
Fitur dibagi menjadi empat kategori utama:

1. **Manipulasi PDF (Bisa berjalan di browser/klien):**
   - **Merge PDF:** Menggabungkan beberapa file PDF menjadi satu.
   - **Split (Pisahkan) PDF:** Memisahkan satu PDF menjadi beberapa file atau mengambil halaman tertentu.
   - **Rotate (Putar) PDF:** Memutar orientasi halaman (90, 180, 270 derajat).
   - **Sort (Sortir) PDF:** Mengubah urutan halaman dengan drag-and-drop.
   - **Crop (Potong) PDF:** Memotong margin halaman PDF.
2. **Konversi ke PDF:**
   - Word ke PDF, PowerPoint ke PDF, Excel ke PDF.
   - JPG ke PDF.
3. **Konversi dari PDF:**
   - PDF ke Word, PDF ke PowerPoint, PDF ke Excel.
   - PDF ke JPG.
4. **Optimasi & Keamanan:**
   - **Compress PDF:** Memperkecil ukuran file PDF.
   - **Protect PDF:** Menambahkan password enkripsi pada file PDF.

## Rekomendasi Teknologi (Tech Stack)
- **Frontend:** Next.js (React) dan Tailwind CSS untuk tampilan yang responsif.
- **Pengolahan PDF di Browser (Client-side):** 
  - `pdf-lib`: Sangat bagus untuk Merge, Split, Rotate, Sort, dan Protect PDF tanpa perlu server.
  - `pdf.js` & `jsPDF`: Untuk konversi PDF ke JPG dan JPG ke PDF.
- **Pengolahan di Server (Backend API):**
  - Node.js (Express) dengan pustaka seperti `libreoffice-convert` atau API pihak ketiga (seperti Cloudmersive / API2PDF) agar hasil konversi rapi.

## Alur Pengguna (User Flow)
1. Pengguna membuka halaman utama yang berisi grid (kotak-kotak) ikon untuk setiap fitur.
2. Pengguna mengklik salah satu alat (misal: "Gabungkan PDF").
3. Muncul area drag-and-drop untuk mengunggah file.
4. Pengguna mengatur opsi (misal: menyusun urutan file).
5. Pengguna menekan tombol aksi ("Proses").
6. Sistem memproses file (di browser atau dikirim ke server).
7. Tombol "Unduh" muncul, dan pengguna mengunduh hasil akhirnya.

---

# Daftar Prompt untuk AI (Cursor / ChatGPT / Claude)

**Prompt 1: Setup UI & Halaman Utama**
> "Buatkan proyek web menggunakan Next.js dan Tailwind CSS. Buat halaman utama (Homepage) yang menampilkan grid layout berisi kartu-kartu (cards) untuk alat PDF. Setiap kartu memiliki ikon dan judul: Merge PDF, Split PDF, Compress PDF, Rotate PDF, Sort PDF, Crop PDF, PDF to Word, PDF to PPT, PDF to Excel, Word to PDF, PPT to PDF, Excel to PDF, PDF to JPG, JPG to PDF, dan Protect PDF. Buatkan juga komponen layout utama dengan navbar sederhana dan footer."

**Prompt 2: Fitur Manipulasi PDF (Menggunakan pdf-lib di Frontend)**
> "Buatkan halaman dan fungsionalitas untuk fitur 'Merge PDF', 'Split PDF', 'Rotate PDF', dan 'Protect PDF'. Gunakan library `pdf-lib` agar pemrosesan berjalan di sisi klien (browser) tanpa server. Untuk Merge: Buat area upload drag-and-drop untuk banyak file, dan tombol gabungkan. Untuk Split: Pengguna bisa upload 1 PDF dan memasukkan rentang halaman (range) yang ingin diekstrak. Untuk Rotate: Tampilkan preview halaman dan berikan tombol putar. Untuk Protect: Sediakan kolom input password untuk mengenkripsi PDF."

**Prompt 3: Fitur Konversi Gambar (pdf.js & jsPDF)**
> "Buatkan halaman untuk 'PDF to JPG' dan 'JPG to PDF'. Untuk PDF to JPG: Gunakan library `pdf.js` untuk merender setiap halaman PDF ke dalam elemen HTML5 Canvas, lalu ekstrak menjadi file `.jpg` dan bungkus dalam file `.zip` agar mudah diunduh. Untuk JPG to PDF: Sediakan area upload gambar. Pengguna bisa mengatur urutan gambar (drag-and-drop). Gunakan library `jsPDF` atau `pdf-lib` untuk menempelkan gambar-gambar tersebut ke dalam halaman PDF baru, lalu unduh."

**Prompt 4: Setup Backend API untuk Konversi Dokumen**
> "Saya butuh fitur konversi dokumen (Word, Excel, PPT ke PDF dan sebaliknya). Buatkan struktur backend API menggunakan Node.js (Express) atau API route di Next.js. Gunakan middleware `multer` untuk menerima file dari frontend. Buatkan fungsi menggunakan `libreoffice-convert` (atau library Node.js serupa) untuk mengonversi format docx, xlsx, pptx menjadi pdf, dan sebaliknya. Kirim kembali file hasilnya ke frontend sebagai buffer yang bisa diunduh."

**Prompt 5: Integrasi Fitur Konversi Dokumen di Frontend**
> "Buatkan antarmuka frontend (UI) untuk fitur 'Word to PDF', 'Excel to PDF', 'PPT to PDF', dan konversi sebaliknya. Buat area upload drag-and-drop. Saat pengguna menekan tombol konversi, kirim file tersebut ke endpoint API yang sudah dibuat di prompt sebelumnya menggunakan fetch atau axios. Tampilkan indikator loading saat memproses, dan tampilkan tombol unduh setelah API mengembalikan file hasilnya."

**Prompt 6: Fitur Sortir & Potong (Drag-and-Drop & Crop)**
> "Tambahkan halaman untuk 'Sort PDF'. Saat pengguna mengunggah PDF, gunakan `pdf.js` untuk menampilkan thumbnail setiap halaman. Buat thumbnail tersebut bisa di-drag-and-drop untuk mengubah urutannya menggunakan library seperti `dnd-kit` atau `react-beautiful-dnd`. Setelah urutan baru ditentukan, gunakan `pdf-lib` untuk membuat PDF baru berdasarkan urutan tersebut. Untuk 'Crop PDF', izinkan pengguna menggambar kotak selection di atas pratinjau halaman pertama untuk menentukan area potong (margin), lalu gunakan `pdf-lib` untuk memotong (crop) bounding box seluruh halaman sesuai koordinat tersebut."