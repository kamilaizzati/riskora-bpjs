# RISKORA Frontend End-to-End Test Plan

> Dokumen ini menguji frontend yang ada. Backend belum tersedia; skenario API nyata hanya dapat dijalankan setelah endpoint terverifikasi. Jangan menafsirkan hasil mock sebagai integrasi BPJS.

## 1. Lingkungan dan Data Uji

### Konfigurasi mock

```env
VITE_USE_MOCK_API=true
VITE_API_BASE_URL=
```

### Akun demo

- Faskes: `casemix@sardjito.co.id` / `password123`
- Verifikator: `verifikator@riskora.id` / `password123`

### Aturan umum lulus

- Tidak ada error JavaScript atau broken import.
- Route terlindungi sesuai role.
- Loading, error, dan empty state tidak menyebabkan crash.
- Nomor klaim/batch pada aksi selalu sesuai baris yang dipilih.
- Tidak ada wording bahwa RISKORA mengirim langsung ke BPJS.
- Data mock tidak dianggap statistik atau hasil klinis nyata.

## 2. Scenario A — Batch Faskes sampai Finalisasi

### A1. Membuka upload batch

- Starting page: `/faskes/claims/new`
- Aksi: login sebagai Faskes, buka “Pengajuan Klaim”.
- Expected: step 1 aktif; periode, nama batch, dropzone TXT, dan tombol demo tersedia.
- Pass: halaman tidak mengklaim parsing format resmi; disclaimer mock dan posisi sebelum VClaim terlihat.

### A2. Validasi file

- Aksi: pilih file bukan `.txt`, file kosong, lalu file `.txt` valid di bawah 10 MB.
- Expected: dua file pertama ditolak dengan pesan spesifik; file valid menampilkan nama dan ukuran.
- Pass: file dibaca lokal dan tidak diklaim telah dikirim ke server/BPJS.

### A3. Preview

- Aksi: klik “Jalankan Demo dengan Batch Simulasi”.
- Expected: step 2, identitas batch, total record, kelengkapan dasar, tabel, search, dan pagination muncul.
- Pass: search mengubah baris; tombol halaman tidak melewati batas; setiap detail memakai claim ID barisnya.

### A4. Pre-screening

- Aksi: klik “Jalankan Pre-screening”.
- Expected: step 3 berisi jumlah lolos/perlu koreksi dan finding deterministik.
- Pass: claim tanpa SEP/metadata/kelas rawat mendapat finding yang sesuai; hasil tidak disebut persetujuan BPJS.

### A5. Koreksi

- Aksi: buka klaim “Perlu Koreksi”; lengkapi tindakan yang diminta; simpan.
- Expected: status koreksi menjadi `ready_for_rescreen` dan tersedia aksi pemeriksaan ulang.
- Pass: correction tersimpan lokal pada mock; klaim belum otomatis `passed` sebelum re-screen.

### A6. Re-screening

- Aksi: jalankan pemeriksaan ulang.
- Expected: finding yang telah diselesaikan hilang; klaim menjadi `passed` atau kembali dengan finding terbaru.
- Pass: status batch ikut dihitung ulang dan tidak ada klaim yang dinyatakan lolos hanya karena tombol disimpan.

### A7. Finalisasi

- Aksi: coba finalisasi saat masih ada koreksi, lalu selesaikan seluruh koreksi dan ulangi.
- Expected: percobaan pertama ditolak; percobaan setelah seluruh klaim lolos menghasilkan `ready_to_handoff`.
- Pass: finalisasi tidak mengubah status menjadi persetujuan BPJS.

### A8. Handoff manual

- Aksi: klik “Tandai Sudah Diteruskan ke VClaim” dan konfirmasi.
- Expected: modal menjelaskan ini hanya pencatatan; status menjadi `marked_forwarded`.
- Pass: tidak ada klaim upload API BPJS/VClaim.

## 3. Scenario B — Navigasi dan Data Faskes

### B1. Dashboard

- Starting page: `/faskes/dashboard`
- Aksi: ganti periode.
- Expected: KPI, klaim tindakan, distribusi, dan aktivitas menyesuaikan batch periode.
- Pass: nama fasilitas berasal dari session; KPI sama dengan underlying batch.

### B2. Claims list

- Starting page: `/faskes/claims`
- Aksi: cari SEP/claim ID; pilih filter periode, batch, status, dan jenis finding.
- Expected: tabel dan pagination mengikuti kombinasi filter.
- Pass: filter benar-benar diteruskan sampai service. **Known issue saat audit:** hook masih memakai parameter filter lama; test diperkirakan gagal untuk batch/status/finding.

### B3. Claim detail

- Aksi: buka detail dari satu baris.
- Expected: ID/SEP/diagnosis/amount/status sama dengan baris dan batch asal.
- Pass: claim milik Faskes lain ditolak ketika backend tersedia; dokumen kosong tidak menyebabkan crash.

### B4. Batch history

- Starting page: `/faskes/submissions`
- Aksi: buka setiap batch.
- Expected: periode, total, passed, correction, screening status, dan handoff status benar.
- Pass: link membuka batch yang dipilih; screening dan handoff tidak dicampur menjadi satu status.

## 4. Scenario C — Verifikator dan Keputusan Review

### C1. Dashboard

- Starting page: `/verificator/dashboard`
- Aksi: gunakan search dan empat quick filters.
- Expected: tabel priority berubah, chart tetap responsif.
- Pass: empty state muncul untuk pencarian tanpa hasil; KPI mempunyai scope yang dapat dijelaskan.
- Known issue: `highRisk=124` melebihi 86 record antrean mock tanpa scope waktu terpisah.

### C2. Claims queue

- Starting page: `/verificator/claims`
- Aksi: search, quick filter, advanced filter, pagination.
- Expected: URL anomaly filter sinkron dan page kembali ke 1 saat filter berubah.
- Pass: baris detail membuka ID yang tepat; kombinasi tanpa hasil menampilkan empty state.

### C3. Claim detail

- Aksi: buka beberapa klaim dari antrean.
- Expected: administrasi, diagnosis, amount, dokumen, findings, dan risk status konsisten.
- Pass: ID tidak dikenal menampilkan not-found; kegagalan request menampilkan error.
- Known issue: claim dashboard dengan ID sama dapat berbeda dari antrean, khususnya `claim-005` dan `claim-006`.

### C4. Draft dan hasil review

- Aksi: pilih masing-masing keputusan, simpan draft, reload, lalu simpan hasil review.
- Expected: draft mock pulih dari localStorage; notes wajib untuk investigation.
- Pass: pesan sukses sesuai mode; hasil tidak diklaim persisted backend.
- Known issue: keputusan tidak mengubah queue/dashboard dan belum mempunyai audit trail server.

## 5. Scenario D — Fraud Analysis dan Anomaly Network

### D1. Fraud analysis

- Starting page: `/verificator/fraud-analysis`
- Aksi: buka “Lihat Klaim” pada setiap kategori.
- Expected: dialog hanya berisi klaim dengan anomaly type yang dipilih.
- Pass: kategori tanpa klaim menghasilkan daftar kosong yang jelas, bukan error.

### D2. Anomaly network

- Starting page: `/verificator/anomaly-network`
- Aksi: zoom, pan, filter jenis relasi/periode, pilih node, pilih edge, reset.
- Expected: graph tetap interaktif; panel edge menampilkan pasien pseudonim, tanggal, konteks, bukti, status, dan alasan review.
- Pass: count summary sesuai graph terfilter; edge selalu mempunyai source/target valid dan supporting evidence.

### D3. Aturan klinis hati-hati

- Aksi: inspeksi skenario synthetic.
- Expected:
  - stroke vs CKD dengan nominal mirip tidak terhubung;
  - pasien berbeda dengan diagnosis sama tidak terhubung;
  - hemodialisis berulang bersifat `Informational`;
  - episode rawat inap overlap pasien sama dapat `Requires Review`;
  - episode pasien sama yang terpisah jelas tidak otomatis terhubung.
- Pass: seluruh assertion pada `npm run test:anomaly-network` berhasil.

## 6. Scenario E — Mock Mode dan Backend Tidak Tersedia

### E1. Mock mode

- Starting state: `VITE_USE_MOCK_API=true`.
- Aksi: jalankan seluruh scenario A–D.
- Expected: aplikasi dapat dipakai tanpa backend.
- Pass: tidak ada request jaringan ke endpoint API yang diperlukan untuk fungsi mock.

### E2. API mode tanpa backend

- Starting state:

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://127.0.0.1:3000
```

- Aksi: buka dashboard/queue/detail saat server tidak aktif.
- Expected: loading selesai menjadi error state; tidak diam-diam menampilkan mock.
- Pass: retry dapat dicoba pada halaman yang sudah mendukungnya; tidak ada crash.
- Known gaps: detail Verifikator tidak memiliki retry; beberapa mutasi batch masih localStorage-only dan tidak mengikuti flag API.

### E3. Empty responses

- Aksi: dengan backend stub/fixture lokal, kembalikan list kosong dan optional field null.
- Expected: tabel/chart menampilkan empty state dan halaman tidak crash.
- Pass: pagination tidak negatif; detail null menjadi not-found; chart tanpa data tidak overlap.

### E4. Authentication/authorization

- Aksi: akses route tanpa session, akses route Faskes sebagai Verifikator, dan sebaliknya.
- Expected: redirect login atau dashboard role yang sesuai.
- Pass: tidak ada flash data role lain; setelah backend tersedia, respons `401/403` harus menghapus/menolak session secara tepat.

## 7. Regression Matrix

| Area | Loading | Error | Empty | Retry | Status audit |
|---|---:|---:|---:|---:|---|
| Verifikator dashboard | Ya | Ya | Tabel/chart sebagian | Ya | Cukup |
| Claims queue | Ya | Ya | Ya | Ya | Cukup |
| Claim detail Verifikator | Ya | Ya custom | Ya custom | Tidak | Gap |
| Fraud analysis | Ya | Ya | Dialog tergantung komponen | Ya | Perlu uji empty kategori |
| Anomaly network | Ya | Ya | Graph/filter perlu inspeksi | Ya | Cukup |
| Faskes dashboard | Ya | Ya | Tabel/chart | Ya | Cukup |
| Faskes claims | Ya | Ya | Ya | Ya | Filter mismatch |
| Faskes claim detail | Ya | Ya | Ya | Ya | Cukup |
| Batch workflow | Busy per aksi | Sebagian | Tabel hasil belum eksplisit | Sebagian | Gap |
| Batch history | Ya | Ya | Belum eksplisit | Ya | Gap |

## 8. Validasi Otomatis

Jalankan:

```bash
npm run lint
npm run build
npm run test
```

Catatan: pada saat audit, `package.json` hanya mendefinisikan `test:anomaly-network`; belum ada script bernama `test`. Karena itu `npm run test` diperkirakan gagal dengan “Missing script”. Jalankan juga:

```bash
npm run test:anomaly-network
```

## 9. Urutan Perbaikan Setelah Audit Disetujui

1. Satukan canonical claim fixture agar dashboard, queue, dan detail tidak menduplikasi record berbeda.
2. Perbaiki forwarding filter `useFaskesClaims` tanpa mengubah UI.
3. Tambahkan service boundary untuk review Verifikator; tetap mock sampai endpoint nyata tersedia.
4. Lengkapi retry/empty/error state pada detail dan workflow batch.
5. Pisahkan source mode per fitur (`mock`, `live_local`, `unavailable`).
6. Baru integrasikan endpoint yang benar-benar tersedia dan teruji dari backend.
