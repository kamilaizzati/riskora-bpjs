# Riskora demo seed — RSUP Dr. Sardjito

Paket seed lokal berisi 20 klaim sintetis beserta metadata dokumen, PDF placeholder, batch, analisis demo, temuan, dan review.

## Isi
- `claims.json`: 20 klaim dengan diagnosis, prosedur (bila dicontohkan), kelas layanan, tanggal, kode grouper demo, nilai klaim simulasi dan status.
- `claim_documents.json`: daftar dokumen per klaim dengan status `available`/`missing` dan referensi file.
- `documents/`: PDF placeholder untuk dokumen yang statusnya `available`.
- `facilities.json`, `users.json`, `submission_batches.json`, `jkn_drive_batches.json`.
- `analysis_runs.json`, `fraud_findings.json`, `claim_reviews.json`.

## Penting
SEMUA DATA DAN PDF ADALAH SINTETIS. Nomor SEP menggunakan prefiks `DEMO-SEP`, bukan SEP BPJS valid. Nama pasien, nomor rekam medis, kode grouper dan nilai klaim resmi tidak disediakan. Diagnosis/prosedur adalah contoh untuk pengujian UI dan tidak boleh dianggap rekomendasi coding. Nilai klaim dan hasil screening hanya simulasi. Tidak ada klaim yang benar-benar dikirim ke BPJS.

## Integrasi backend
File mengikuti field yang disarankan dalam `riskora_revised_schema.md`, tetapi perlu dicocokkan dengan repository adapter, validator, enum, dan lokasi `DATA_DIR` di implementasi backend sebelum digunakan. Jangan langsung menimpa data lokal yang sudah ada. Lakukan backup, lalu import/seed dengan script yang menyesuaikan penyimpanan backend.
