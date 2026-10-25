# Riset Alur Pengajuan Klaim JKN dari Perspektif Tim Casemix

Tanggal riset: 22 Oktober 2026

## Ringkasan keputusan desain

RISKORA sebaiknya memakai pola **hybrid**, bukan upload-only dan bukan form-only:

1. mengambil data terstruktur yang sudah tersedia dari SIMRS/RME, E-Klaim, atau integrasi SATUSEHAT;
2. meminta petugas mengonfirmasi dan melengkapi form klaim yang ringkas;
3. menerima dokumen pendukung (terutama resume medis dan bukti klinis/billing yang relevan);
4. menjalankan parsing sebagai bantuan pra-isi dan pemeriksaan konsistensi;
5. selalu meminta petugas Casemix memvalidasi hasil ekstraksi sebelum klaim dikirim untuk screening.

Alasannya: sumber resmi menunjukkan bahwa pekerjaan koder mencakup analisis kelengkapan rekam medis, kodifikasi diagnosis/tindakan, dan input data ke E-Klaim. Dokumen klinis merupakan sumber bukti, tetapi pengajuan klaim juga mengandung data terstruktur. Karena itu, desain “unggah rekam medis dan selesai” tidak mewakili alur kerja nyata.

## Jawaban langsung atas pertanyaan produk

### Apakah Tim Casemix mengunggah rekam medis?

Mereka menggunakan rekam medis—khususnya resume medis—sebagai dasar pengodean dan kelengkapan klaim. Dokumen pendukung juga dapat disampaikan secara elektronik dalam proses klaim. Namun, istilah “mengunggah seluruh rekam medis” terlalu luas: kebutuhan dokumen dapat berbeda menurut jenis layanan/kasus dan ketentuan klaim. RISKORA sebaiknya meminta **dokumen klaim yang diperlukan**, bukan seluruh berkas rekam medis secara default.

Permenkes 26/2021 menyatakan bahwa dokter menuliskan diagnosis utama, diagnosis sekunder, tindakan/prosedur, dan membuat resume medis; koder kemudian mengodekan diagnosis dan tindakan dari rekam medis. Sumber data pengodean INA-CBG berasal dari resume medis dan, bila perlu, berkas rekam medis. Verifikator BPJS memeriksa kelengkapan berkas serta kesesuaian diagnosis dan tindakan pada resume medis dengan kode yang diajukan. [Permenkes 26 Tahun 2021](https://jdih.kemkes.go.id/storage/documents/pdfs/2021permenkes026.pdf)

### Apakah Tim Casemix mengisi form/data klaim?

Ya. Kurikulum resmi Kemenkes untuk koder FKRTL secara eksplisit memasukkan kemampuan melakukan input pengajuan klaim dan troubleshooting pada aplikasi E-Klaim. Latihannya memakai berkas klaim sebagai dasar input data dan grouping pada aplikasi. Jadi input terstruktur tetap merupakan bagian dari pekerjaan petugas, bukan sepenuhnya digantikan unggahan dokumen. [Kurikulum Pelatihan Koding Koder FKRTL](https://siakpel.kemkes.go.id/upload/akreditasi_kurikulum/kurikulum-1-30373931-3534-4239-b139-383037313237.pdf)

Dokumentasi resmi SATUSEHAT juga menggambarkan data klaim sebagai rangkaian resource terstruktur: eligibilitas/SEP, kunjungan, akun pembiayaan, data klinis, billing, invoice, kemudian pengajuan melalui E-Klaim. Data klinis meliputi, antara lain, `Encounter`, `Condition`, `Procedure`, dan resource terkait pelayanan; data pembiayaan meliputi `Account`, `ChargeItem`, dan `Invoice`. [Playbook Klaim BPJS di SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/interoperability/klaim-bpjs/)

### Apakah AI boleh membaca dan parsing dokumen?

Secara teknis, AI dapat dipakai untuk OCR/ekstraksi dan pemeriksaan konsistensi, tetapi hasilnya harus diperlakukan sebagai **saran yang perlu dikonfirmasi**, bukan keputusan klinis atau hasil grouping resmi. Petugas yang berwenang tetap bertanggung jawab atas kelengkapan, pengodean, dan data yang diajukan.

RISKORA dapat secara realistis mengekstrak atau membandingkan:

- nomor SEP dan identitas episode pelayanan;
- tanggal masuk/keluar dan jenis pelayanan;
- diagnosis yang tertulis, kemudian membandingkannya dengan kode yang dimasukkan petugas;
- tindakan/prosedur yang tertulis, kemudian membandingkannya dengan kode yang dimasukkan;
- DPJP, ringkasan terapi, hasil penunjang, dan bukti pendukung;
- nominal billing serta ketidaksesuaian antardokumen;
- keberadaan halaman, tanda tangan, atau elemen wajib yang dapat dideteksi;
- duplikasi dokumen/klaim dan pola anomali administratif.

RISKORA **tidak boleh diposisikan sebagai aplikasi yang menghitung atau menetapkan INA-CBG**. Permenkes 26/2021 menempatkan proses pengelompokan pada aplikasi INA-CBG dan menegaskan pentingnya peran dokter, koder, serta verifikator. RISKORA hanya melakukan pre-screening terhadap data/hasil yang diterima dari sistem resmi.

## Alur kerja yang didukung sumber resmi

1. Pasien menerima pelayanan di FKRTL dan rumah sakit menerbitkan SEP sesuai proses eligibilitas BPJS.
2. Dokter mendokumentasikan diagnosis utama, diagnosis sekunder, tindakan/prosedur, dan resume medis.
3. Tim Casemix/koder menganalisis kelengkapan rekam medis dan mengklarifikasi ketidaksesuaian kepada dokter bila diperlukan.
4. Koder menetapkan kode diagnosis dan tindakan sesuai pedoman yang berlaku dan memasukkan data pengajuan ke E-Klaim.
5. Dokumen pendukung serta data administratif, klinis, dan billing disiapkan untuk pengajuan/verifikasi.
6. Pengajuan diteruskan melalui mekanisme E-Klaim/V-Klaim atau integrasi yang berlaku.
7. BPJS melakukan purifikasi/verifikasi; rumah sakit menindaklanjuti hasil pending, koreksi, atau keputusan lain.

Dasar untuk langkah 2–4 terdapat pada [Permenkes 26/2021](https://jdih.kemkes.go.id/storage/documents/pdfs/2021permenkes026.pdf) dan [Kurikulum Pelatihan Koder FKRTL](https://siakpel.kemkes.go.id/upload/akreditasi_kurikulum/kurikulum-1-30373931-3534-4239-b139-383037313237.pdf). Gambaran integrasi elektronik langkah 1 dan 5–7 terdapat pada [Playbook Klaim BPJS SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/interoperability/klaim-bpjs/).

## Data dan dokumen yang sebaiknya diminta RISKORA

### Data terstruktur minimum

- fasilitas dan unit pelayanan;
- nomor SEP dan ID episode/kunjungan;
- identitas pasien yang diminimalkan sesuai kebutuhan screening;
- jenis pelayanan (rawat jalan, IGD, atau rawat inap);
- tanggal pelayanan/masuk/keluar;
- DPJP;
- diagnosis utama dan sekunder beserta kode yang dipilih petugas;
- tindakan/prosedur beserta kode yang dipilih petugas;
- ringkasan hasil E-Klaim/INA-CBG yang diimpor, bila tersedia;
- nilai billing rumah sakit dan nilai pengajuan;
- status kelengkapan dokumen.

### Dokumen pendukung

- resume medis sebagai dokumen inti;
- SEP atau referensi eligibilitas;
- billing/invoice;
- hasil laboratorium, radiologi, operasi, atau penunjang lain hanya bila relevan;
- resep/administrasi obat atau alat kesehatan bila relevan;
- dokumen khusus kasus sesuai aturan yang berlaku.

Daftar final tidak boleh di-hardcode sebagai satu paket universal. Kebutuhan dokumen harus dikonfigurasi menurut jenis pelayanan, kasus, dan peraturan/BA kesepakatan klaim yang sedang berlaku.

## Rekomendasi UX halaman Pengajuan Klaim Faskes

### Pilihan yang direkomendasikan: hybrid berbasis impor

**Langkah 1 — Pilih sumber data**

- `Ambil dari SIMRS/RME` (sasaran produksi);
- `Impor data E-Klaim` jika kontrak integrasi tersedia;
- `Input manual` sebagai fallback prototype.

**Langkah 2 — Identitas klaim**

- SEP, episode, pasien, unit, jenis pelayanan, tanggal, dan DPJP;
- data yang berasal dari sistem lain ditampilkan read-only atau diberi indikator sumber;
- hindari pengetikan ulang jika data sudah tersedia.

**Langkah 3 — Diagnosis dan tindakan**

- form diagnosis utama/sekunder dan prosedur;
- kode adalah hasil input/konfirmasi petugas Casemix;
- RISKORA boleh menandai ketidaksesuaian antara kode dan isi resume, tetapi tidak menetapkan kode final.

**Langkah 4 — Nilai dan hasil pengelompokan**

- tampilkan kode/hasil/tarif yang **diimpor dari E-Klaim**;
- label eksplisit: “Sumber: E-Klaim”; 
- jangan menyediakan tombol “Hitung INA-CBG oleh Riskora”.

**Langkah 5 — Dokumen pendukung**

- checklist dinamis berdasarkan jenis pelayanan/kasus;
- unggah per kategori dokumen, bukan satu unggahan campuran;
- parsing berjalan setelah unggah dan mengisi kandidat nilai ke panel review.

**Langkah 6 — Review hasil parsing**

- tampilan per field: nilai dokumen, nilai form, tingkat keyakinan, dan sumber halaman;
- aksi `Terima`, `Ubah`, atau `Tandai perlu klarifikasi`;
- simpan siapa yang menyetujui dan kapan.

**Langkah 7 — Screening**

- tombol yang tepat untuk produk ini: `Kirim untuk Pre-screening Riskora`;
- hasilnya bersifat indikatif: kelengkapan, inkonsistensi, dan sinyal risiko;
- pengiriman resmi ke BPJS/E-Klaim harus menjadi integrasi terpisah dan tidak boleh disimulasikan tanpa koneksi resmi.

## Mengapa bukan upload-first murni

- Dokumen scan dapat buram, tidak konsisten, dan memiliki banyak format.
- OCR dapat salah pada nomor SEP, tanggal, nominal, singkatan klinis, kode ICD, atau tulisan tangan.
- Form klaim memiliki data yang lebih aman dan akurat bila diambil langsung dari sumber terstruktur.
- Pengodean tetap memerlukan penilaian koder dan klarifikasi dengan dokter.
- Upload-only berisiko membuat pengguna mengira AI sudah menyusun klaim yang sah dan lengkap.

## Mengapa bukan form-first murni

- Petugas akan mengetik ulang data yang sebenarnya sudah ada di SIMRS/RME/E-Klaim.
- Bukti klinis tetap diperlukan untuk menilai apakah diagnosis, tindakan, dan billing konsisten.
- Pre-screening anomali membutuhkan perbandingan antara data terstruktur dan dokumen sumber.

## Privasi, keamanan, dan tata kelola

Data kesehatan merupakan data pribadi spesifik menurut UU Pelindungan Data Pribadi. Karena itu, desain produksi setidaknya memerlukan dasar pemrosesan yang jelas, pembatasan tujuan, minimisasi data, kontrol akses berbasis peran, enkripsi saat transit dan tersimpan, jejak audit, kebijakan retensi/penghapusan, serta mekanisme respons insiden. [UU 27 Tahun 2022 tentang Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-)

Permenkes 24/2022 mewajibkan fasilitas pelayanan kesehatan menyelenggarakan rekam medis elektronik dan menekankan keamanan, kerahasiaan, keutuhan, serta ketersediaan data rekam medis. [Permenkes 24 Tahun 2022](https://jdih.kemkes.go.id/storage/documents/pdfs/2022permenkes024.pdf)

Implikasi produk:

- jangan gunakan dokumen pasien nyata untuk demo/hackathon;
- jangan mengirim dokumen ke penyedia AI publik tanpa perjanjian, dasar hukum, konfigurasi retensi, dan penilaian keamanan yang memadai;
- jangan menampilkan identitas pasien penuh pada dashboard jika tidak diperlukan;
- akses dokumen harus dibatasi pada fasilitas dan peran yang berwenang;
- hasil ekstraksi harus memiliki provenance (dokumen/halaman sumber) dan audit trail;
- pisahkan hasil screening internal verifikator dari instruksi koreksi yang boleh dilihat Faskes.

## Catatan tentang SATUSEHAT dan status integrasi

Playbook klaim BPJS SATUSEHAT menunjukkan arah interoperabilitas berbasis data terstruktur dan RME, tetapi dokumentasinya menyatakan modul masih berada di environment sandbox. Karena itu, jangan menjadikan ketersediaan API produksi SATUSEHAT untuk klaim sebagai asumsi MVP. Gunakan adapter/integration boundary agar sumber data dapat diganti tanpa mengubah halaman. [Playbook Klaim BPJS SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/interoperability/klaim-bpjs/)

Kemenkes juga menyampaikan arah integrasi RME berbasis NIK dengan SATUSEHAT sebagai dokumen elektronik pendukung pengelolaan klaim JKN. Ini menguatkan keputusan untuk memprioritaskan interoperabilitas data, bukan mengandalkan PDF sebagai satu-satunya sumber. [Ditjen Kesehatan Lanjutan Kemenkes](https://keslan.kemkes.go.id/read/4087/kemenkes-perkuat-tata-kelola-klaim-jkn-melalui-integrasi-rekam-medis-elektronik-dengan-satusehat)

## Rekomendasi implementasi bertahap

### Hackathon/MVP

1. form klaim ringkas dengan data sintetis;
2. unggah dokumen per kategori;
3. simulasi hasil parsing yang selalu meminta konfirmasi;
4. checklist kelengkapan dan deteksi inkonsistensi sederhana;
5. tombol `Kirim untuk Pre-screening`, bukan `Ajukan ke BPJS`;
6. disclaimer bahwa RISKORA tidak melakukan grouping INA-CBG dan tidak menggantikan keputusan petugas.

### Pilot rumah sakit

1. validasi alur dengan minimal satu koder/Casemix, petugas rekam medis, dan verifikator internal rumah sakit;
2. petakan field SIMRS/RME dan output E-Klaim yang benar-benar tersedia;
3. integrasikan data terstruktur lebih dulu, lalu dokumen;
4. ukur akurasi OCR per jenis dokumen;
5. tetapkan human review wajib dan audit trail;
6. lakukan asesmen keamanan dan privasi sebelum memakai data pasien.

## Pertanyaan yang belum terjawab

1. Format dan metode integrasi E-Klaim/V-Klaim apa yang benar-benar tersedia bagi rumah sakit mitra RISKORA (API, file terenkripsi, bridging, atau ekspor lain)?
2. Apakah RISKORA akan diposisikan sebelum data masuk E-Klaim, setelah hasil grouping E-Klaim tersedia, atau keduanya?
3. Dokumen minimum per rawat jalan/rawat inap dan kasus khusus apa yang berlaku pada mitra pilot berdasarkan perjanjian serta panduan klaim terbaru?
4. Apakah rumah sakit pilot sudah memakai RME/SIMRS terstruktur dan terintegrasi SATUSEHAT, atau masih dominan PDF/scan?
5. Siapa pengguna utama halaman pengajuan: koder, petugas administrasi klaim, verifikator internal RS, atau gabungan beberapa peran?
6. Apakah transisi nasional dari INA-CBG menuju iDRG sudah berlaku pada konteks dan periode pilot? Materi pelatihan Kemenkes 2025 menyebut iDRG, tetapi aturan operasional dan tanggal penerapan perlu dikonfirmasi langsung untuk rumah sakit pilot sebelum UI/terminologi diubah. [Kurikulum Koder FPKTL 2025](https://ditmutunakes.kemkes.go.id/index.php/detail-kurikulum-pelatihan/kurikulum-pelatihan-pengkodean-diagnosis-penyakit-dan-tindakan-bagi-tenaga-koder-di-fasilitas-pelayanan-kesehatan-tingkat-lanjut-fpktl-dalam-program-jaminan-kesehatan-nasional/4d7a637a4e544d794d7a59744d7a417a4d6930304d6a4d344c5749774d7a59744d7a417a4e7a4d334d7a557a4d7a4d31)

## Sumber utama

- [Permenkes 26 Tahun 2021 — Pedoman INA-CBG](https://jdih.kemkes.go.id/storage/documents/pdfs/2021permenkes026.pdf)
- [Kurikulum Pelatihan Koding bagi Koder FKRTL — Kemenkes](https://siakpel.kemkes.go.id/upload/akreditasi_kurikulum/kurikulum-1-30373931-3534-4239-b139-383037313237.pdf)
- [SATUSEHAT — Pembiayaan Kesehatan Klaim BPJS](https://satusehat.kemkes.go.id/platform/docs/id/interoperability/klaim-bpjs/)
- [Permenkes 24 Tahun 2022 — Rekam Medis](https://jdih.kemkes.go.id/storage/documents/pdfs/2022permenkes024.pdf)
- [UU 27 Tahun 2022 — Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-)
- [Kemenkes — Penguatan Tata Kelola Klaim melalui Integrasi RME dan SATUSEHAT](https://keslan.kemkes.go.id/read/4087/kemenkes-perkuat-tata-kelola-klaim-jkn-melalui-integrasi-rekam-medis-elektronik-dengan-satusehat)

