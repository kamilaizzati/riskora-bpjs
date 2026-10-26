# Riskora — Revised Data Schema (MVP)

## 1. Prinsip desain

- Gunakan **synthetic/demo data** saja untuk demo; jangan masukkan data pasien nyata.
- Pisahkan **hasil analisis Riskora** dari **hasil verifikasi resmi BPJS**.
- Skor risiko adalah prioritas pemeriksaan, bukan bukti atau keputusan bahwa fraud terjadi.
- Simpan riwayat analisis dan verifikasi sebagai record tersendiri agar perubahan bisa dilacak.
- Karena MVP memakai seed JSON, struktur di bawah dapat disimpan sebagai beberapa file JSON. Relasi menggunakan ID string.

## 2. Relasi inti

```text
users
  ├── claim_reviews
  └── audit_logs

facilities ──< claims >── submission_batches
                  ├──< claim_documents
                  ├──< analysis_runs ──< fraud_findings
                  ├──< claim_reviews
                  └──< verification_results

submission_batches ──< virtual_claim_validations
jkn_drive_batches ──< claim_documents (opsional: jknDriveBatchId)
```

`claims` adalah data inti klaim. Dokumen, batch pengajuan, validasi Virtual Claim, hasil verifikasi, analisis, temuan, dan review dipisahkan supaya statusnya tidak tercampur.

## 3. Entitas dan field

### A. `users.json` — akun aplikasi

```json
{
  "id": "USR-001",
  "name": "Demo Verifier",
  "email": "verifier@example.test",
  "role": "verifier",
  "isActive": true,
  "createdAt": "2026-10-20T08:00:00.000Z",
  "updatedAt": "2026-10-20T08:00:00.000Z"
}
```

Enum `role`: `admin`, `verifier`, `reviewer`.
Untuk demo frontend statis, data user boleh mock; jangan simpan password plaintext. Jika autentikasi nyata ditambahkan, simpan hash password dan gunakan mekanisme autentikasi backend.

### B. `facilities.json` — fasilitas kesehatan

```json
{
  "id": "FASKES-001",
  "name": "RS Demo Utama",
  "facilityCode": "DEMO-001",
  "facilityType": "rumah_sakit",
  "isActive": true
}
```

`facilityCode` boleh `null` bila belum ada di dataset. Jangan mengarang kode fasilitas resmi.

### C. `claims.json` — klaim inti

```json
{
  "id": "CLM-20261023-001",
  "batchId": "BATCH-20261023-DAILY",
  "noSep": "DEMO-SEP-0001",
  "noRm": "DEMO-RM-0001",
  "facilityId": "FASKES-001",
  "serviceType": "rawat_inap",
  "serviceClass": "kelas_1",
  "serviceDate": "2026-10-23",
  "admissionDate": "2026-10-20",
  "dischargeDate": "2026-10-23",
  "losDays": 3,
  "primaryDiagnosis": {
    "code": "I63.9",
    "description": "Contoh diagnosis sintetis"
  },
  "secondaryDiagnoses": [
    { "code": "I10", "description": "Contoh diagnosis sekunder" }
  ],
  "procedures": [
    { "code": "88.56", "description": "Contoh prosedur sintetis" }
  ],
  "inacbg": {
    "grouperCode": "DEMO-GROUPER-001",
    "claimAmount": 18450000,
    "currency": "IDR"
  },
  "claimStatus": "submitted",
  "isSynthetic": true,
  "createdAt": "2026-10-23T09:00:00.000Z",
  "updatedAt": "2026-10-23T09:00:00.000Z"
}
```

Enum `serviceType`: `rawat_inap`, `rawat_jalan`.
Enum `claimStatus`: `draft`, `submitted`, `returned_for_correction`, `resubmitted`, `under_verification`, `completed`.
`serviceClass` boleh `null`; gunakan nilai terkendali seperti `kelas_1`, `kelas_2`, `kelas_3`, `vip`, `icu`, `isolasi`, `lainnya`.
**Pemetaan dari data lama:** `_id` → `id`; `faskesNama` → `facilityName` atau cocokkan ke `facilityId`; `jenisPelayanan` → `serviceType` + `serviceClass`; `tglPelayanan` → `serviceDate`; `primaryIcd10` dan `primaryDiagnosisTeks` → `primaryDiagnosis`; `secondaryIcd10` → `secondaryDiagnoses`; `procedureIcd9` → `procedures`; `kodeGrouperInacbg` → `inacbg.grouperCode`; `nilaiKlaim` → `inacbg.claimAmount`.
`noSEP` dan `noRM` pada demo harus tetap ID sintetis. Hindari nama, NIK, tanggal lahir, atau data identitas pasien nyata.

### D. `claim_documents.json` — daftar dokumen per klaim

```json
{
  "id": "DOC-001",
  "claimId": "CLM-20261023-001",
  "documentType": "discharge_summary",
  "displayName": "Resume medis",
  "required": true,
  "condition": null,
  "source": "jkn_drive",
  "fileName": "demo-resume-001.pdf",
  "mimeType": "application/pdf",
  "fileStatus": "available",
  "reviewStatus": "not_reviewed",
  "extractedText": null,
  "uploadedAt": "2026-10-23T09:05:00.000Z",
  "uploadedBy": "USR-001",
  "jknDriveBatchId": "JKNB-001",
  "notes": "Dokumen contoh; tidak berisi data pasien nyata"
}
```

Enum `documentType` yang disarankan:
- Umum: `patient_identity_summary`, `inacbg_output`, `sep`, `supporting_test_result`, `hospital_bill`
- Rawat inap: `discharge_summary`, `operation_report`, `admission_request`, `death_certificate`, `birth_certificate`
- Rawat jalan: `consultation_response`, `control_letter`
- Fleksibel: `other`

Enum `source`: `e_claim`, `jkn_drive`, `manual_upload`, `mock`.
Enum `fileStatus`: `expected`, `available`, `missing`, `unreadable`, `unsupported`.
Enum `reviewStatus`: `not_reviewed`, `matched`, `mismatch`, `needs_clarification`, `not_applicable`.

Catatan: daftar dokumen wajib harus bergantung pada `serviceType` dan kondisi kasus. Contoh `operation_report` hanya wajib bila ada tindakan operasi; `death_certificate` hanya untuk kasus meninggal; `birth_certificate` hanya bila relevan dengan kasus persalinan. `condition` dapat diisi teks/kode kondisi sederhana untuk MVP.

### E. `submission_batches.json` — batch TXT E-Claim / pengajuan periode

```json
{
  "id": "BATCH-20261023-DAILY",
  "period": "2026-10",
  "sourceSystem": "e_claim",
  "fileName": "demo-2026-10.txt",
  "claimIds": ["CLM-20261023-001"],
  "submissionStatus": "validated",
  "attemptNumber": 1,
  "maxAttempts": 2,
  "exportedAt": "2026-10-23T09:00:00.000Z",
  "uploadedAt": "2026-10-23T09:10:00.000Z",
  "createdBy": "USR-001"
}
```

Enum `submissionStatus`: `draft`, `exported`, `uploaded`, `validating`, `validated`, `partially_rejected`, `rejected`, `resubmitted`.
Simpan metadata saja untuk demo; jangan menyatakan file benar-benar sudah terkirim ke sistem resmi bila hanya mock.

### F. `virtual_claim_validations.json` — respons validasi Virtual Claim

```json
{
  "id": "VCV-001",
  "batchId": "BATCH-20261023-DAILY",
  "validationStatus": "partially_compliant",
  "attemptNumber": 1,
  "totalClaims": 20,
  "compliantCount": 16,
  "nonCompliantCount": 4,
  "issues": [
    {
      "claimId": "CLM-20261023-001",
      "issueCode": "ROOM_CLASS_MISMATCH",
      "message": "Contoh: kelas perawatan perlu diperiksa",
      "resolutionStatus": "open"
    }
  ],
  "checkedAt": "2026-10-23T09:15:00.000Z",
  "isMockResult": true
}
```

Enum `validationStatus`: `pending`, `compliant`, `partially_compliant`, `non_compliant`.
Validasi ini berbeda dari analisis risiko AI dan berbeda pula dari hasil akhir verifikator.

### G. `jkn_drive_batches.json` — batch upload PDF

```json
{
  "id": "JKNB-001",
  "period": "2026-10",
  "fileCount": 20,
  "uploadStatus": "uploaded",
  "uploadedAt": "2026-10-23T09:20:00.000Z",
  "uploadedBy": "USR-001",
  "isMockBatch": true
}
```

Enum `uploadStatus`: `pending`, `uploading`, `uploaded`, `failed`, `partially_uploaded`.
Untuk MVP, cukup simulasikan metadata dan status upload; tidak perlu implementasi penyimpanan PDF sungguhan kecuali memang menjadi fitur demo.

### H. `analysis_runs.json` — satu eksekusi analisis Riskora

```json
{
  "id": "ANL-001",
  "claimId": "CLM-20261023-001",
  "analysisStatus": "completed",
  "riskScore": 72,
  "riskCategory": "high",
  "analysisMethod": ["rules", "gemini_explanation"],
  "modelProvider": "gemini",
  "modelName": "configured-on-backend",
  "promptVersion": "riskora-v1",
  "findingsCount": 2,
  "summary": "Ada beberapa indikator yang perlu diperiksa lebih lanjut.",
  "startedAt": "2026-10-23T09:30:00.000Z",
  "completedAt": "2026-10-23T09:30:05.000Z",
  "errorMessage": null,
  "isMockResult": true
}
```

Enum `analysisStatus`: `queued`, `running`, `completed`, `failed`.
Enum `riskCategory`: `low`, `medium`, `high`.
Gunakan skor rule-based yang konsisten sebagai dasar. Gemini dapat membantu menjelaskan indikator dan merangkum dokumen; jangan biarkan model mengarang bukti atau otomatis memutuskan fraud. `isMockResult` harus `true` untuk seed hasil simulasi.

### I. `fraud_findings.json` — indikator/temuan analisis

```json
{
  "id": "FND-001",
  "analysisRunId": "ANL-001",
  "claimId": "CLM-20261023-001",
  "findingType": "document_inconsistency",
  "title": "Perlu pemeriksaan konsistensi dokumen",
  "description": "Informasi pada dua sumber contoh belum konsisten.",
  "severity": "medium",
  "confidence": 0.72,
  "evidence": [
    {
      "sourceType": "claim_field",
      "field": "serviceClass",
      "observedValue": "kelas_1",
      "expectedValue": "perlu dikonfirmasi",
      "documentId": null,
      "excerpt": null
    }
  ],
  "recommendedAction": "Periksa kembali dokumen sumber dan data klaim.",
  "reviewStatus": "open",
  "createdAt": "2026-10-23T09:30:05.000Z"
}
```

Enum `findingType`: `duplicate_billing_indicator`, `diagnosis_procedure_mismatch`, `coding_or_tariff_anomaly`, `document_missing`, `document_inconsistency`, `length_of_stay_anomaly`, `facility_pattern`, `other`.
Enum `severity`: `low`, `medium`, `high`.
Enum `reviewStatus`: `open`, `confirmed_issue`, `not_an_issue`, `needs_more_information`.
`confidence` adalah tingkat keyakinan sistem terhadap indikator, bukan probabilitas hukum bahwa fraud terjadi. Temuan harus menyertakan evidence yang bisa ditelusuri; jika belum ada evidence, jangan tampilkan sebagai temuan faktual.

### J. `verification_results.json` — hasil resmi/hasil verifikasi simulasi

```json
{
  "id": "VER-001",
  "claimId": "CLM-20261023-001",
  "batchId": "BATCH-20261023-DAILY",
  "result": "pending",
  "reasonCodes": ["SUPPORTING_DOCUMENT_REVIEW"],
  "reasonText": "Contoh hasil simulasi; perlu pemeriksaan dokumen pendukung.",
  "source": "mock_bpjs_feedback",
  "verifiedAt": null,
  "recordedAt": "2026-10-23T10:00:00.000Z",
  "isOfficial": false
}
```

Enum `result`: `passed`, `pending`, `not_eligible`, `not_yet_received`.
Jangan gabungkan `result` dengan `riskCategory`. Klaim berisiko tinggi bisa saja lolos verifikasi setelah dicek; klaim berisiko rendah tetap bisa memiliki masalah dokumen.

### K. `claim_reviews.json` — review manusia

```json
{
  "id": "REV-001",
  "claimId": "CLM-20261023-001",
  "analysisRunId": "ANL-001",
  "reviewerId": "USR-001",
  "decision": "needs_more_information",
  "findingIds": ["FND-001"],
  "notes": "Perlu membandingkan dengan dokumen sumber.",
  "reviewedAt": "2026-10-23T10:10:00.000Z"
}
```

Enum `decision`: `needs_more_information`, `escalate`, `no_issue_found`, `resolved`.
Keputusan ini adalah hasil review pengguna Riskora, bukan keputusan resmi BPJS.

### L. `audit_logs.json` — jejak aktivitas

```json
{
  "id": "AUD-001",
  "actorId": "USR-001",
  "action": "analysis.completed",
  "entityType": "claim",
  "entityId": "CLM-20261023-001",
  "details": { "analysisRunId": "ANL-001" },
  "timestamp": "2026-10-23T09:30:05.000Z"
}
```

Contoh `action`: `claim.viewed`, `document.uploaded`, `analysis.started`, `analysis.completed`, `finding.reviewed`, `claim.reviewed`, `batch.validated`.

## 4. Status harus tetap terpisah

| Area | Field | Contoh nilai |
|---|---|---|
| Status klaim/workflow | `claims.claimStatus` | `under_verification` |
| Status dokumen | `claim_documents.fileStatus` / `reviewStatus` | `available` / `mismatch` |
| Validasi Virtual Claim | `virtual_claim_validations.validationStatus` | `partially_compliant` |
| Analisis Riskora | `analysis_runs.riskCategory` | `high` |
| Hasil verifikasi | `verification_results.result` | `pending` |
| Review manusia | `claim_reviews.decision` | `needs_more_information` |

## 5. Cara memigrasikan 20 seed records yang sudah ada

Jangan buang 20 record lama. Pecah/transformasi menjadi:
1. `claims.json`: data klaim inti, diagnosis, prosedur, grouper, nilai klaim, fasilitas, dan tanggal.
2. `analysis_runs.json`: pindahkan `skorRisiko`, `kategoriRisiko`, `ringkasanEvaluasiAi` ke satu analisis demo dengan `isMockResult: true`.
3. `fraud_findings.json`: buat temuan hanya dari `jenisTemuan` yang sudah ada, tandai sebagai data simulasi dan gunakan deskripsi/evidence yang memang tersedia. Jangan mengarang evidence rinci yang tidak ada di record.
4. `verification_results.json`: mapping `statusVerifikasi` lama hanya jika maknanya jelas. Jika `Menunggu`, `Investigasi`, `Review`, `Selesai` adalah status internal UI dan bukan hasil resmi BPJS, pindahkan ke `claims.claimStatus` atau `claim_reviews`; jangan langsung dipetakan menjadi `passed/pending/not_eligible`.
5. `facilities.json`: deduplikasi `faskesNama` menjadi fasilitas dengan ID stabil; hubungkan lewat `facilityId`.
6. `claim_documents.json`, `submission_batches.json`, `virtual_claim_validations.json`, `jkn_drive_batches.json`: boleh berisi mock records minimal untuk demo alur. Jangan menyatakan file asli sudah diunggah/tervalidasi.

Catatan: pada dataset saat ini, `noSep` dan `noRm` tidak berulang. Jadi data tersebut belum dapat menunjukkan duplicate SEP/patient-record links. Untuk demo deteksi duplikasi, tambahkan beberapa **record sintetis yang secara sengaja** memiliki SEP atau nomor RM berulang dan labeli sebagai skenario uji.

## 6. Prioritas implementasi untuk deadline pendek

**Implementasikan sekarang (MVP):**
- `claims.json`
- `facilities.json`
- `analysis_runs.json`
- `fraud_findings.json`
- `claim_documents.json` (status/jenis dokumen saja, tanpa unggah file sungguhan bila belum siap)
- `claim_reviews.json`
- `audit_logs.json` (minimal)

**Mock bila diperlukan untuk memperlihatkan workflow:**
- `submission_batches.json`
- `virtual_claim_validations.json`
- `jkn_drive_batches.json`
- `verification_results.json`

**Belum perlu untuk MVP:** database relasional/graph database, GNN training, penyimpanan dokumen medis sungguhan, integrasi resmi E-Claim/Virtual Claim/JKN Drive, dan keputusan fraud otomatis.

## 7. Catatan implementasi teknis

- Semua file JSON harus berupa array objek: `[{...}, {...}]`.
- Gunakan ID stabil seperti `CLM-...`, bukan indeks array.
- Simpan timestamp ISO 8601 dan tanggal pelayanan sebagai `YYYY-MM-DD`.
- Validasi `riskScore` pada rentang 0–100 dan `confidence` pada rentang 0–1.
- API key Gemini hanya di backend `.env`; jangan masukkan ke JSON seed atau frontend.
- Jangan kirim NIK/nama/tanggal lahir atau data pasien nyata ke model AI. Untuk demo, gunakan data sintetis dan kirim hanya field yang diperlukan.
