# RISKORA Frontend API Requirements

> **Status dokumen:** seluruh endpoint di dokumen ini adalah **PROPOSED, NOT IMPLEMENTED**. Dokumen ini merekam kebutuhan frontend saat ini; bukan bukti bahwa backend atau integrasi BPJS tersedia.

## 1. Batas Sistem dan Bahasa Domain

Alur bisnis yang menjadi batas frontend:

`SIMRS → E-Claim → RISKORA Pre-screening → VClaim → Purifikasi Awal → JKN Drive → BPJS Verification`

- **Batch Klaim**: kumpulan klaim satu Faskes untuk satu periode yang diimpor dari keluaran E-Claim.
- **Pre-screening RISKORA**: pemeriksaan awal kelengkapan dan konsistensi. Bukan penerimaan VClaim atau persetujuan BPJS.
- **Temuan Screening**: alasan terstruktur mengapa klaim perlu koreksi atau perhatian.
- **Finalisasi Batch**: penguncian hasil pre-screening internal setelah semua koreksi selesai.
- **Handoff VClaim**: pencatatan bahwa pengguna meneruskan batch melalui proses resmi di luar RISKORA. Bukan upload otomatis ke BPJS.
- **Review Verifikator**: keputusan internal Verifikator atas klaim yang telah masuk ke workspace Verifikator melalui proses backend yang sah.
- **Relasi Klaim**: hubungan berbasis bukti antar-klaim. Tidak otomatis berarti fraud.

Nilai status kanonis yang saat ini dipakai frontend:

- Screening klaim: `not_screened | passed | needs_correction`
- Koreksi: `not_started | in_progress | ready_for_rescreen | completed`
- Screening batch: `draft | needs_correction | screening_complete | ready_to_handoff | handed_off`
- Handoff: `not_ready | ready | marked_forwarded`
- Risiko Verifikator: `low | medium | high`
- Status antrean Verifikator: `pending_verification | in_review | needs_investigation | completed`
- Status relasi jaringan: `Informational | Requires Review`

## 2. Konvensi API yang Diusulkan

Semua endpoint di bawah **belum diimplementasikan**.

- Base URL frontend: `VITE_API_BASE_URL`
- Format waktu: ISO 8601 dengan offset, misalnya `2026-10-26T10:30:00+07:00`
- Format tanggal layanan: `YYYY-MM-DD`
- Nilai uang: integer Rupiah, tanpa simbol atau pemisah ribuan
- Identifier adalah string stabil dan tidak boleh berubah antarhalaman
- Autentikasi yang diusulkan: `Authorization: Bearer <access-token>`
- Envelope sukses yang diusulkan:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

- Envelope error yang diusulkan:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data belum lengkap.",
    "fields": {
      "sepNumber": "Nomor SEP wajib diisi."
    },
    "requestId": "req_123"
  }
}
```

Status error minimum: `400`, `401`, `403`, `404`, `409`, `422`, `429`, dan `500/503`. Frontend tidak boleh diam-diam kembali ke mock ketika request API nyata gagal.

## 3. Inventaris Fitur Frontend

### Faskes

| Fitur | Route | Komponen utama | Service/data source sekarang | Status | Kebutuhan backend | Potensi masalah integrasi |
|---|---|---|---|---|---|---|
| Dashboard | `/faskes/dashboard` | `FaskesDashboardPage` | `useFaskesDashboard` → `faskesService`; mock batch/localStorage | Fungsional dalam mock | Ringkasan batch, klaim koreksi, distribusi, aktivitas | Bentuk summary lama dan baru berbeda; periode harus scoped ke Faskes login |
| Batch upload | `/faskes/claims/new` | `FaskesBatchSubmissionPage` | `faskesBatchService` localStorage | Demo lokal | Import file, validasi, job/status parsing | File TXT saat ini tidak benar-benar diparsing |
| Batch preview | route sama, step 2 | `PreviewStep` | Klaim sintetis dari batch | Fungsional mock | Detail hasil import dan validation issues | Pagination saat ini lokal; format E-Claim resmi belum diketahui |
| Pre-screening | route sama, step 3 | `ScreeningResultStep` | `runBatchPrescreening` | Deterministik mock | Menjalankan screening dan menyimpan findings | Aturan produksi belum tersedia; jangan klaim AI resmi |
| Screening results | route sama | `BatchClaimsTable` | Batch localStorage | Fungsional mock | Query hasil/filter/pagination | Status dan finding harus machine-readable |
| Claim correction | `/faskes/claims/:claimId/correction` | `FaskesClaimCorrectionPage` | `submitFaskesClaimCorrection` | Tersimpan lokal | Simpan field/dokumen/catatan koreksi | Form koreksi masih lebih statis daripada finding yang dinamis |
| Re-screening | route correction | `FaskesClaimCorrectionPage` | `rescreenCorrectedClaim` | Fungsional mock | Jalankan ulang screening versi terbaru | Harus idempotent dan mencatat versi/riwayat hasil |
| Batch finalization | `/faskes/claims/new?batch=...` | `FinalizationStep` | `finalizeBatchScreening` | Fungsional mock | Validasi semua klaim dan finalisasi atomik | UI dapat mencoba finalisasi sebelum koreksi selesai; service mock menolak |
| VClaim handoff tracking | route sama | `FinalizationStep` | `markBatchForwarded` | Catatan manual mock | Catat siapa/kapan handoff dilakukan | Tidak boleh direpresentasikan sebagai API BPJS/VClaim |
| Batch history | `/faskes/submissions` | `FaskesSubmissionHistoryPage` | `getClaimBatches` | Fungsional mock | List batch dan status | Belum ada server pagination; status harus dipisah screening vs handoff |
| Claims list | `/faskes/claims` | `FaskesClaimsPage` | `useFaskesClaims` → `faskesService` | Sebagian fungsional | Filter batch/status/finding/periode | Hook masih meneruskan filter lama sehingga filter batch/status/finding tidak efektif |
| Claim details | `/faskes/claims/:claimId` | `FaskesClaimDetailPage` | `getFaskesClaimById` | Fungsional mock | Detail klaim, dokumen, hasil screening | Dokumen masih preview sintetis; detail harus facility-scoped |

### Verifikator

| Fitur | Route | Komponen utama | Service/data source sekarang | Status | Kebutuhan backend | Potensi masalah integrasi |
|---|---|---|---|---|---|---|
| Dashboard | `/verificator/dashboard` | `DashboardPage` | `verificatorService` | Fungsional mock | KPI, prioritas, distribusi, hasil screening | KPI mock tidak konsisten dengan jumlah antrean mock |
| Claims queue | `/verificator/claims` | `ClaimsPage` | `claimsService` | Fungsional mock | Search/filter/pagination server | Service belum mengirim query/filter/pagination |
| Claim details | `/verifier/claims/:claimId` | `ClaimDetailPage` | `claimDetailService` | Fungsional mock | Administrasi, diagnosis, prosedur, dokumen, findings | Namespace route berbeda (`verifier` vs `verificator`); detail mock diperkaya di client |
| Verification decisions | route detail | `AIReviewPanel` | localStorage langsung | Mock lokal saja | Draft, notes, decision, audit trail | Tidak melalui service; nama “AI” dan risk score belum ditopang model nyata |
| Fraud analysis | `/verificator/fraud-analysis` | `FraudAnalysisPage` | antrean klaim + tren hardcoded | Fungsional mock | Agregat temuan, daftar klaim per kategori, tren | Tren tidak berasal dari service; kategori tidak semuanya ada dalam dataset antrean |
| Anomaly network | `/verificator/anomaly-network` | `AnomalyNetworkPage` | `anomalyNetworkService` | Fungsional synthetic | Graph nodes/edges, filter, detail relasi | Posisi graph client-specific; backend cukup mengirim data relasi, bukan koordinat wajib |

## 4. Operasi API yang Diusulkan

### 4.1 Autentikasi

#### `POST /api/auth/login` — PROPOSED, NOT IMPLEMENTED

- Fitur: login Faskes/Verifikator
- Body wajib: `email`, `password`, `role`
- Respons:

```json
{
  "data": {
    "accessToken": "opaque-or-jwt-token",
    "user": {
      "id": "user-001",
      "email": "user@example.test",
      "role": "faskes",
      "displayName": "Tim Casemix",
      "organization": "RS Sintetis",
      "facilityId": "facility-001",
      "facilityName": "RS Sintetis"
    }
  }
}
```

- Opsional: `facilityId`, `facilityName` untuk Verifikator
- Error: kredensial salah `401`, role tidak sesuai `403`, akun nonaktif `403`
- Permission: publik

#### `GET /api/auth/session` — PROPOSED, NOT IMPLEMENTED

- Respons: objek `user` seperti di atas
- Error: `401`
- Permission: pengguna terautentikasi

#### `POST /api/auth/logout` — PROPOSED, NOT IMPLEMENTED

- Respons: `204 No Content`
- Permission: pengguna terautentikasi

#### `POST /api/auth/faskes/register` — PROPOSED, NOT IMPLEMENTED

- Body: `name`, `email`, `organization`, `password`
- Respons: `{ "data": { "registrationId": "reg-001", "status": "pending" } }`
- Error: duplikat email `409`, validasi `422`
- Permission: publik jika pendaftaran Faskes disetujui; pendaftaran Verifikator tidak tersedia

### 4.2 Dashboard Faskes

#### `GET /api/faskes/dashboard?period=YYYY-MM` — PROPOSED, NOT IMPLEMENTED

- Query wajib: `period`
- Permission: role `faskes`, dibatasi ke `facilityId` dari session
- Respons:

```json
{
  "data": {
    "summary": {
      "activeBatches": 1,
      "totalClaims": 14,
      "screeningPassed": 10,
      "needsCorrection": 4
    },
    "actionRequiredClaims": [],
    "statusDistribution": [
      { "status": "passed", "label": "Lolos Screening Awal", "value": 10, "color": "#166534" }
    ],
    "recentActivities": []
  }
}
```

- Required: seluruh field summary, claim `id`, `claimId`, `screeningStatus`, `screeningFindings`
- Optional: warna/label dapat dinormalisasi frontend
- Error: periode invalid `400`, unauthorized facility `403`

### 4.3 Batch Faskes

#### `POST /api/faskes/batches/import` — PROPOSED, NOT IMPLEMENTED

- Content type: `multipart/form-data`
- Body: `period`, `name`, `file`
- Respons `202`:

```json
{
  "data": {
    "batchId": "batch-001",
    "status": "processing",
    "source": "eclaim_txt",
    "file": { "name": "klaim-2026-10.txt", "size": 12345 }
  }
}
```

- Error: format invalid `422`, batch periode duplikat `409`, terlalu besar `413`
- Permission: `faskes`

#### `GET /api/faskes/batches/:batchId` — PROPOSED, NOT IMPLEMENTED

- Respons wajib: `id`, `name`, `period`, `periodLabel`, `source`, `screeningStatus`, `handoffStatus`, timestamps, `claims[]`
- Setiap claim wajib memiliki: `id`, `claimId`, `batchId`, `facilityId`, `sepNumber`, `serviceType`, `careType`, `serviceDate`, `primaryDiagnosis`, `claimAmount`, `screeningStatus`, `screeningFindings`, `correctionStatus`
- Error: `404`, `403`

#### `GET /api/faskes/batches` — PROPOSED, NOT IMPLEMENTED

- Query: `period`, `screeningStatus`, `handoffStatus`, `page`, `pageSize`
- Respons: `{ "data": { "items": [], "page": 1, "pageSize": 20, "total": 0 } }`
- Permission: `faskes`, facility-scoped

#### `POST /api/faskes/batches/:batchId/pre-screen` — PROPOSED, NOT IMPLEMENTED

- Body opsional: `{ "ruleSetVersion": "2026-10-demo" }`
- Respons: batch dengan hasil setiap claim dan `screeningRunId`
- Error: batch sedang diproses `409`, data belum siap `422`
- Permission: `faskes`

#### `POST /api/faskes/batches/:batchId/finalize` — PROPOSED, NOT IMPLEMENTED

- Body: `{ "expectedVersion": 3 }`
- Respons: `{ "data": { "batchId": "batch-001", "screeningStatus": "ready_to_handoff", "finalizedAt": "..." } }`
- Error: koreksi belum selesai `409`, stale version `409`
- Permission: `faskes`

#### `POST /api/faskes/batches/:batchId/handoff-confirmations` — PROPOSED, NOT IMPLEMENTED

- Body: `{ "channel": "vclaim_manual", "note": "Diteruskan oleh petugas melalui aplikasi resmi." }`
- Respons: `{ "data": { "handoffStatus": "marked_forwarded", "forwardedAt": "...", "recordedBy": "user-001" } }`
- Error: batch belum final `409`
- Permission: `faskes`
- Catatan: hanya pencatatan internal; bukan integrasi VClaim/BPJS

### 4.4 Klaim Faskes dan Koreksi

#### `GET /api/faskes/claims` — PROPOSED, NOT IMPLEMENTED

- Query: `period`, `batchId`, `serviceType`, `screeningStatus`, `finding`, `query`, `page`, `pageSize`
- Respons: paginated `items[]`; shape claim mengikuti bagian batch
- Error: filter invalid `400`, `403`
- Permission: `faskes`, facility-scoped

#### `GET /api/faskes/claims/:claimId` — PROPOSED, NOT IMPLEMENTED

- Required tambahan: `submittedInaCbgCode`, `documents[]`, `screeningFindings[]`, timestamps
- Optional: prosedur, diagnosis sekunder, metadata dokumen
- Error: `404`, `403`

#### `PATCH /api/faskes/claims/:claimId/correction` — PROPOSED, NOT IMPLEMENTED

- Body:

```json
{
  "updates": {
    "sepNumber": "SEP-SYN-001",
    "documentMetadata": []
  },
  "note": "Data telah dicocokkan dengan sumber internal.",
  "findingIds": ["finding-001"]
}
```

- Respons: claim dengan `correctionStatus: "ready_for_rescreen"`
- Error: field invalid `422`, claim terkunci `409`
- Permission: `faskes`

#### `POST /api/faskes/claims/:claimId/re-screen` — PROPOSED, NOT IMPLEMENTED

- Body: `{ "expectedCorrectionVersion": 2 }`
- Respons: claim, findings terbaru, `rescreenedAt`, `screeningRunId`
- Error: koreksi belum siap `409`
- Permission: `faskes`

### 4.5 Dashboard dan Antrean Verifikator

#### `GET /api/verificator/dashboard/summary` — PROPOSED, NOT IMPLEMENTED

```json
{
  "data": {
    "pendingVerification": 86,
    "highRisk": 12,
    "inReview": 23,
    "completed": 1248,
    "asOf": "2026-10-26T10:00:00+07:00"
  }
}
```

- Permission: `verificator`
- Angka harus berasal dari scope/filter yang dijelaskan, agar `highRisk` tidak melampaui total antrean tanpa konteks.

#### Dashboard lainnya — PROPOSED, NOT IMPLEMENTED

- `GET /api/verificator/dashboard/priority-claims?limit=5`
- `GET /api/verificator/dashboard/anomaly-distribution?from=&to=`
- `GET /api/verificator/dashboard/screening-results?from=&to=`
- Respons list menerima array langsung atau `{ data: { items: [] } }`; adapter frontend sebaiknya distandardisasi pada envelope kedua.
- Permission: `verificator`

#### `GET /api/verificator/claims` — PROPOSED, NOT IMPLEMENTED

- Query: `query`, `riskLevel`, `status`, `anomalyType`, `page`, `pageSize`, `sort`
- Respons paginated
- Required item: `id`, `sepNumber`, `facilityId`, `facilityName`, `careType`, `serviceDate`, `primaryDiagnosis`, `claimAmount`, `anomalyTypes`, `riskLevel`, `status`
- Error: query invalid `400`
- Permission: `verificator`

#### `GET /api/verificator/claims/:claimId` — PROPOSED, NOT IMPLEMENTED

- Required tambahan: admission/discharge dates, INA-CBG data, documents, findings, risk assessment provenance
- Optional: diagnosis sekunder, procedures, document preview URLs
- Error: `404`, `403`
- Permission: `verificator`

#### `PUT /api/verificator/claims/:claimId/review-draft` — PROPOSED, NOT IMPLEMENTED

- Body: `decision`, `notes`, `expectedVersion`
- Respons: draft, `savedAt`, `savedBy`, `version`
- Error: conflict `409`, validation `422`
- Permission: `verificator`

#### `POST /api/verificator/claims/:claimId/reviews` — PROPOSED, NOT IMPLEMENTED

- Body:

```json
{
  "decision": "continue",
  "notes": "Bukti klinis telah ditinjau.",
  "findingIds": ["TM-01"]
}
```

- Decision: `continue | correction | investigation`
- Respons: review tersimpan dan status klaim baru
- Error: notes wajib untuk investigation `422`, concurrent review `409`
- Permission: `verificator`
- Catatan internal tidak boleh muncul pada endpoint Faskes. Instruksi koreksi Faskes harus field terpisah.

### 4.6 Fraud Analysis — PROPOSED, NOT IMPLEMENTED

- `GET /api/verificator/fraud-analysis/summary?from=&to=`
- `GET /api/verificator/fraud-analysis/findings?type=&page=&pageSize=`
- `GET /api/verificator/fraud-analysis/trends?from=&to=&interval=month`
- Required finding: `id`, `claimId`, `type`, `severity`, `description`, `evidenceReferences[]`, `reviewStatus`
- Error: date range invalid `400`
- Permission: `verificator`
- Tidak boleh mengembalikan klaim “fraud confirmed” tanpa proses/otoritas yang memang dimodelkan.

### 4.7 Anomaly Network — PROPOSED, NOT IMPLEMENTED

#### `GET /api/verificator/anomaly-network`

- Query: `period`, repeated `relationshipType`
- Respons:

```json
{
  "data": {
    "generatedAt": "2026-10-26T10:00:00+07:00",
    "disclaimer": "Relasi bukan kesimpulan fraud.",
    "nodes": [
      {
        "id": "claim-001",
        "shortId": "CLM-001",
        "patientId": "PSN-SYN-001",
        "serviceStart": "2026-10-01",
        "serviceEnd": "2026-10-03",
        "primaryDiagnosis": { "code": "I63.9", "description": "Stroke iskemik" }
      }
    ],
    "edges": [
      {
        "id": "edge-001",
        "source": "claim-001",
        "target": "claim-002",
        "relationshipType": "overlapping_episode",
        "explanation": "...",
        "supportingEvidence": {},
        "reviewStatus": "Requires Review",
        "reviewReason": "..."
      }
    ]
  }
}
```

- Semua edge wajib merujuk node valid dan mempunyai bukti pendukung.
- Permission: `verificator`
- Endpoint detail opsional: `GET /api/verificator/anomaly-network/claims/:claimId` dan `/relationships`

## 5. Audit Konsistensi Data Saat Ini

Audit ini hanya mencatat; mock tidak diubah.

### Temuan terkonfirmasi

1. Tidak ada duplicate ID atau SEP di `mockVerificatorClaims` (86 record).
2. Tidak ada duplicate ID atau SEP di `mockFaskesClaims` (38 record).
3. Tidak ada duplicate node/edge atau referensi hilang pada anomaly network (15 node, 6 edge); semua edge memiliki supporting evidence.
4. `mockVerificatorDashboard.summary.highRisk = 124`, sedangkan seluruh antrean mock hanya 86. Tanpa definisi scope waktu berbeda, KPI ini inkonsisten.
5. `priorityClaims` dashboard memakai ID yang sama dengan antrean tetapi datanya tidak selalu sama:
   - `claim-002` mempunyai SEP berbeda.
   - `claim-005` dan `claim-006` mengacu pada fasilitas, diagnosis, jumlah, risiko, dan status yang berbeda dari record antrean dengan ID sama.
   - `claim-004` memiliki variasi deskripsi diagnosis.
6. Mock Faskes lama mempunyai agregat 980/1.200/1.080 klaim, tetapi record yang tersedia hanya 14/14/10. Agregat tersebut cocok secara aritmetika internal, tetapi tidak dapat direkonsiliasi dengan tabel record.
7. Batch workflow baru menggunakan record 14/14/10 dan summary turunannya konsisten dengan claim yang benar-benar ada.
8. Dataset Faskes dan Verifikator tidak berbagi claim ID. Ini mencegah demo handoff lintas-role dan juga mencegah klaim otomatis muncul—sesuai batas aman saat belum ada workflow backend.
9. `useFaskesClaims` masih meneruskan filter lama (`vclaimStatus`, `verificationStatus`), sedangkan halaman dan service baru memakai `batchId`, `screeningStatus`, `finding`. Filter baru belum end-to-end.
10. Review Verifikator disimpan langsung ke localStorage dan tidak mengubah status record antrean/dashboard.
11. Dashboard priority, queue, detail, fraud, dan anomaly network berasal dari beberapa dataset terpisah; kesamaan ID harus dijaga oleh backend sebagai satu source of truth.

## 6. Audit Alur Bisnis dan Label

- Halaman batch sudah menyatakan RISKORA berada sebelum VClaim dan prototipe tidak mengirim ke BPJS.
- “Lolos Screening Awal” umumnya sudah dibedakan dari persetujuan BPJS.
- Handoff diberi konfirmasi manual; ini tepat selama backend belum punya integrasi resmi.
- Klaim Faskes tidak otomatis muncul di workspace Verifikator; ini aman dan harus dipertahankan sampai backend memodelkan handoff.
- Anomaly network sudah menyatakan relasi bukan kesimpulan fraud dan tidak memakai skor fraud arbitrer.
- Risiko wording yang masih perlu ditinjau kemudian:
  - `AIReviewPanel` menyebut “Analisis AI”, “OCR”, dan “Dokumen Terverifikasi” walau tidak ada implementasi model/OCR/backend nyata.
  - Risk score detail klaim dibuat di client berdasarkan level risiko, bukan keluaran model nyata.
  - Sejumlah file Faskes lama masih menggunakan istilah VClaim/BAV dan agregat simulasi yang tidak dipakai oleh workflow batch baru; backend harus mengikuti alur baru, bukan kontrak lama.

## 7. Pemetaan ke Service Frontend

| Service | Operasi yang perlu dipetakan |
|---|---|
| `apiClient.js` | Bearer token, GET/POST/PATCH/PUT, multipart, structured errors, 401 handling |
| `authService.js` | login/session/logout/register Faskes |
| `verificatorService.js` | empat endpoint dashboard |
| `claimsService.js` | queue dengan server filters dan pagination |
| `claimDetailService.js` | detail klaim tanpa enrichment fiktif di client |
| `faskesService.js` | dashboard, claims list/detail, correction adapter |
| `faskesBatchService.js` | batch import/list/detail/screen/finalize/handoff/rescreen |
| `anomalyNetworkService.js` | graph normalization dan detail relasi |

Integrasi berikutnya sebaiknya dilakukan per fitur dengan status eksplisit `mock`, `live_local`, atau `unavailable`, bukan satu flag global yang memaksa semua fitur berpindah sekaligus.
