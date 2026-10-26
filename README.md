# RISKORA Backend — REST API & Risk Engine

Backend **RISKORA** (*Risk Screening & Claim Verification Platform*) merupakan layanan REST API berbasis Node.js dan Express untuk mendukung proses verifikasi klaim kesehatan BPJS, pengelolaan data klaim, serta analisis risiko melalui risk engine.

Backend ini menyediakan API yang dapat digunakan oleh aplikasi dashboard verifikator dan fasilitas kesehatan (faskes).

## 1. Teknologi

- **Node.js** v18 atau lebih baru (disarankan v20+)
- **Express.js** 4.x
- **CommonJS** module system
- **JSON file storage** untuk penyimpanan data lokal
- **Node.js Test Runner** untuk pengujian otomatis

## 2. Struktur Proyek

```text
backend/
├── docs/                            # Dokumentasi teknis API
├── src/
│   ├── controllers/                 # Penanganan request dan response
│   ├── routes/                      # Definisi endpoint API
│   ├── middleware/                  # Middleware aplikasi
│   ├── data/                        # Penyimpanan data JSON lokal
│   └── ...                          # Service dan modul lainnya
├── tests/                           # Unit dan integration tests
├── .env.example                     # Contoh konfigurasi
├── .gitignore
├── package.json
├── package-lock.json
├── mock_claims_seed_data_20_cases.md
├── riskora_graph.json
└── riskora_revised_schema.md
```

Struktur aktual dapat berbeda sesuai implementasi terbaru pada repository.

## 3. Persyaratan Sistem

Pastikan perangkat telah memiliki:

- Node.js v18 atau lebih baru
- npm v9 atau lebih baru

Periksa versi yang terpasang:

```bash
node --version
npm --version
```

## 4. Instalasi dan Menjalankan Server

Dari root repository backend, jalankan:

```bash
npm install
```

Salin `.env.example` menjadi `.env`, kemudian sesuaikan konfigurasinya.

Jalankan server dalam mode development:

```bash
npm run dev
```

Perintah tersebut mengasumsikan script `dev` tersedia di `package.json`.

Secara default, server ditujukan berjalan pada:

```text
http://localhost:5000
```

## 5. API Endpoints

Endpoint utama yang direncanakan atau digunakan untuk integrasi:

| Endpoint | Kegunaan |
|---|---|
| `GET /api/health` | Memeriksa status server |
| `GET /api/claims` | Mengakses data klaim |

Ketersediaan endpoint, metode HTTP, dan format respons mengikuti implementasi aktual pada source code.

## 6. Konfigurasi Environment

Gunakan `.env.example` sebagai referensi konfigurasi.

| Variabel | Keterangan |
|---|---|
| `PORT` | Port server; default `5000` |
| `NODE_ENV` | Mode aplikasi, misalnya `development` atau `production` |
| `CORS_ORIGIN` | Daftar origin frontend yang diizinkan |
| `DATA_DIR` | Lokasi penyimpanan data JSON; default `./src/data` |

Contoh:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DATA_DIR=./src/data
```

Sesuaikan nilai tersebut dengan konfigurasi aplikasi. Jangan mengunggah file `.env` yang berisi kredensial atau informasi rahasia ke repository.

## 7. Data Klaim Demo dan Seed

Repository dapat menggunakan data sintetis untuk pengembangan dan pengujian workflow verifikasi klaim.

Referensi data yang tersedia:

- `mock_claims_seed_data_20_cases.md` — dokumentasi atau referensi 20 kasus klaim sintetis.
- `riskora_graph.json` — definisi graph yang digunakan dalam analisis, jika sesuai dengan implementasi risk engine.
- `riskora_revised_schema.md` — referensi skema data.
- `src/data/` — lokasi penyimpanan data aplikasi sesuai konfigurasi.

Data referensi tidak otomatis dimuat oleh server hanya karena file tersedia. Mekanisme seed atau import harus mengikuti implementasi backend.

**Catatan:** seluruh data demo harus dianggap sintetis dan tidak boleh diperlakukan sebagai data klaim BPJS atau rekam medis pasien yang sebenarnya.

## 8. Menjalankan Pengujian

Jalankan seluruh pengujian backend:

```bash
npm test
```

Pastikan pengujian selesai tanpa error sebelum perubahan diintegrasikan atau dirilis.

## 9. Integrasi dengan Frontend

Frontend dapat mengakses backend melalui HTTP REST API. Secara lokal, alamat backend default adalah:

```text
http://localhost:5000
```

Pastikan server aktif, endpoint yang diperlukan tersedia, dan konfigurasi CORS mengizinkan origin aplikasi frontend.

Konfigurasi URL API pada aplikasi frontend dikelola oleh repository frontend, bukan oleh README backend ini.

## 10. Keamanan dan Batasan Penggunaan

- Jangan commit `.env`, kredensial, token, atau data pasien yang sebenarnya.
- Jangan commit `node_modules/`.
- Gunakan data sintetis untuk demo dan pengujian.
- Validasi input dan otorisasi akses sesuai kebutuhan endpoint.
- Tinjau konfigurasi penyimpanan JSON sebelum digunakan dalam lingkungan produksi.

## 11. Dokumentasi Tambahan

Lihat folder `docs/` untuk dokumentasi teknis API, arsitektur, dan implementasi risk engine yang tersedia.

---

**RISKORA Backend** — REST API dan risk engine untuk mendukung workflow verifikasi klaim kesehatan BPJS.
