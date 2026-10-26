# RISKORA — Platform Pendukung Verifikasi Klaim Kesehatan BPJS

Repositori monorepo terpadu untuk platform **RISKORA** (*Risk Screening & Claim Verification Platform*), mencakup frontend dashboard verifikator/faskes dan backend REST API berbasis risk-engine.

---

## 1. Struktur Monorepo

```
riskora-bpjs/
├── frontend/                     # Aplikasi Web (React 18 + Vite + Tailwind CSS)
│   ├── public/
│   ├── scripts/
│   ├── src/
│   ├── .env.example
│   ├── .eslintrc.cjs
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/                      # REST API Server (Node.js + Express 4.x + Risk Engine)
│   ├── docs/                     # Dokumentasi teknis API & risk scoring backend
│   ├── src/                      # Source code Express, controllers, routes, data stores
│   ├── tests/                    # Unit & integration test suites
│   ├── .env.example
│   ├── .gitignore
│   ├── mock_claims_seed_data_20_cases.md
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   ├── riskora_graph.json
│   └── riskora_revised_schema.md
├── docs/                         # Dokumen arsitektur, checklist, dan integrasi global
│   ├── backend-implementation-checklist.md
│   ├── backend-integration-plan.md
│   └── casemix-claim-submission-research.md
├── .gitignore                    # Root ignore rule untuk seluruh monorepo
└── README.md                     # Panduan utama monorepo
```

---

## 2. Persyaratan Sistem

- **Node.js**: v18.x atau lebih baru (disarankan v20+ dengan native test runner)
- **NPM**: v9.x atau lebih baru

---

## 3. Menjalankan Project Secara Lokal

Untuk menjalankan frontend dan backend secara bersamaan, buka **dua terminal terpisah**:

### Terminal 1 — Backend (Express REST API)

```bash
cd backend
npm install
npm run dev
```

* Backend berjalan secara default di: `http://localhost:5000`
* Endpoint Health Check: `http://localhost:5000/api/health`
* Endpoint Claims: `http://localhost:5000/api/claims`

### Terminal 2 — Frontend (Vite React Dashboard)

```bash
cd frontend
npm install
npm run dev
```

* Frontend berjalan secara default di: `http://localhost:5173`
* Konfigurasi akses API diatur melalui environment variable `VITE_API_BASE_URL` dan `VITE_USE_MOCK_API` di file `frontend/.env`.

---

## 4. Menjalankan Pengujian (Testing)

### Backend Tests
Menjalankan seluruh unit test, workflow analysis, dan route tests menggunakan runner bawaan Node.js:

```bash
cd backend
npm test
```

### Frontend Checks
Menjalankan validasi rule anomaly network:

```bash
cd frontend
npm run test:anomaly-network
```

---

## 5. Konfigurasi Environment Variable

### Backend (`backend/.env`)
Contoh konfigurasi standar dev dapat dilihat di `backend/.env.example`:
- `PORT`: Port server backend (default: `5000`)
- `NODE_ENV`: Mode environment (`development` / `production`)
- `CORS_ORIGIN`: Daftar origin yang diizinkan (default: `http://localhost:3000,http://localhost:5173`)
- `DATA_DIR`: Path folder penyimpanan JSON data (default: `./src/data`)

### Frontend (`frontend/.env`)
Contoh konfigurasi dapat dilihat di `frontend/.env.example`:
- `VITE_API_BASE_URL`: URL backend API (misal: `http://localhost:5000`)
- `VITE_USE_MOCK_API`: Set `false` untuk mengarahkan request ke backend live, atau `true` untuk fallback ke mock data bawaan frontend.
