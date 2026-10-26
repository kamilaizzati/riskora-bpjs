const fs = require('fs');
const path = require('path');
const HttpError = require('../utils/http-error');
const JsonRepository = require('../repositories/json.repository');

const defaultClusters = [
  {
    id: 'duplicate',
    title: 'Duplikasi & Pengulangan Tagihan',
    description: 'Dua atau lebih klaim terdeteksi memiliki nomor kartu/RM dan interval pelayanan berulang dalam periode berdekatan.',
    reviewStatus: 'Requires Review',
    keyRelationship: 'Potensi penagihan berulang (repeat billing)',
    supportingEvidence: [
      'Nomor rekam medis / kartu identik',
      'Interval tanggal pelayanan beririsan atau berulang pendek',
      'Diagnosis dan kelompok tarif INA-CBG serupa'
    ],
    whyReview: 'Perlu memastikan tidak ada klaim ganda yang ditagihkan untuk episode perawatan yang sama.',
    legitimateExplanations: [
      'Pasien kontrol rutin atau terapi terencana',
      'Koreksi administratif pengajuan ulang klaim'
    ],
    questions: [
      'Apakah nomor SEP dan tanggal pelayanan benar-benar terpisah?',
      'Apakah terdapat tindakan medis berulang yang sah pada rekam medis?'
    ]
  },
  {
    id: 'coding-change',
    title: 'Indikasi Upcoding & Lonjakan Severity',
    description: 'Klaim mengalami peningkatan severity level atau diagnosis sekunder yang tidak sebanding dengan tindakan klinis.',
    reviewStatus: 'Requires Review',
    keyRelationship: 'Lonjakan kode diagnosis / severity level',
    supportingEvidence: [
      'Severity level INA-CBG level III',
      'Komplikasi sekunder berat tanpa terapi intensif pada resume',
      'Nominal klaim signifikan lebih tinggi dibanding rata-rata'
    ],
    whyReview: 'Kesesuaian koding diagnosis dengan resume medis dokter perlu ditelaah.',
    legitimateExplanations: [
      'Kondisi komorbiditas pasien memang kompleks',
      'Perburukan klinis selama masa rawat inap'
    ],
    questions: [
      'Apakah hasil laboratorium dan rekam medis membuktikan diagnosis komplikasi?',
      'Apakah terapi yang diberikan sesuai dengan diagnosis severity tinggi?'
    ]
  },
  {
    id: 'split-stay',
    title: 'Indikasi Unbundling & Fragmentasi Layanan',
    description: 'Pemisahan komponen pemeriksaan penunjang atau prosedur yang seharusnya termasuk dalam satu episode paket INA-CBG.',
    reviewStatus: 'Requires Review',
    keyRelationship: 'Fragmentasi tindakan / unbundling',
    supportingEvidence: [
      'Tindakan penunjang ditagihkan terpisah dari rawat inap',
      'Interval waktu pengajuan berdekatan untuk satu episode',
      'Kode prosedur masuk dalam inklusi paket INA-CBG'
    ],
    whyReview: 'Mencegah pemecahan tagihan menjadi beberapa klaim terpisah untuk menaikkan total reimbursement.',
    legitimateExplanations: [
      'Pemeriksaan rujukan eksternal di luar fasilitas',
      'Episode rawat jalan lanjutan yang terpisah secara administratif'
    ],
    questions: [
      'Apakah tindakan penunjang dilakukan selama periode rawat inap?',
      'Apakah terdapat alasan klinis pemisahan episode tagihan?'
    ]
  },
  {
    id: 'missing-document',
    title: 'Kelengkapan Dokumen Medis Belum Terpenuhi',
    description: 'Klaim memerlukan kelengkapan berkas penunjang (laporan operasi, resume medis, atau hasil lab) sebelum disetujui.',
    reviewStatus: 'Requires Review',
    keyRelationship: 'Dokumen verifikasi esensial belum lengkap',
    supportingEvidence: [
      'Klaim mencatat prosedur invasif/bedah',
      'Laporan tindakan operasi atau penunjang belum terlampir',
      'Hasil pemeriksaan patologi/lab belum terhubung'
    ],
    whyReview: 'Dokumen verifikasi wajib harus lengkap sesuai regulasi BPJS sebelum pencairan klaim.',
    legitimateExplanations: [
      'Berkas masih dalam proses digitalisasi oleh faskes',
      'Lampiran tersimpan pada format rekam medis eksternal'
    ],
    questions: [
      'Apakah laporan operasi dan resume medis telah diunggah lengkap?',
      'Apakah nomor SEP pada dokumen penunjang sesuai dengan berkas klaim?'
    ]
  },
  {
    id: 'comparable',
    title: 'Ketidaksesuaian Tarif Regional & Pembanding',
    description: 'Tarif klaim yang diajukan melampaui rentang rata-rata tarif INA-CBG regional untuk kelas faskes sebanding.',
    reviewStatus: 'Informational',
    keyRelationship: 'Deviasi tarif terhadap kelompok pembanding',
    supportingEvidence: [
      'Total pengajuan berada di persentil atas regional',
      'Kelompok CBG sama dengan kasus pembanding',
      'Tipe dan kelas rumah sakit sebanding'
    ],
    whyReview: 'Analisis pembanding membantu monitoring efisiensi biaya, bukan bukti kecurangan.',
    legitimateExplanations: [
      'Penggunaan alat kesehatan khusus berstandar tinggi',
      'Durasi hari rawat inap yang lebih lama karena pemulihan'
    ],
    questions: [
      'Apakah rincian tagihan komponen farmasi dan akomodasi wajar?',
      'Apakah terdapat penambahan hari rawat yang terdokumentasi?'
    ]
  },
  {
    id: 'early-readmission',
    title: 'Inkonsistensi Administratif / Lapangan',
    description: 'Terdeteksi klaim layanan khusus tanpa verifikasi fisik dokumentasi atau readmisi dini tidak terencana.',
    reviewStatus: 'Requires Review',
    keyRelationship: 'Inkonsistensi catatan administratif dan pelayanan',
    supportingEvidence: [
      'Layanan kamar isolasi/ICU tanpa bukti lembar observasi',
      'Readmisi dalam interval waktu kurang dari 7 hari pascarawat',
      'Catatan administratif tidak sinkron dengan sistem rujukan'
    ],
    whyReview: 'Perlu konfirmasi fisik pelaksanaan layanan di fasilitas pelayanan kesehatan.',
    legitimateExplanations: [
      'Kondisi gawat darurat pascapulang',
      'Kesalahan input kode kamar atau ruang perawatan'
    ],
    questions: [
      'Apakah terdapat lembar pemantauan intensif di ruang rawat?',
      'Apa indikasi medis admisi ulang pasien dalam waktu singkat?'
    ]
  },
  {
    id: 'normal',
    title: 'Klaim Terverifikasi Sesuai Ketentuan',
    description: 'Klaim telah memenuhi seluruh aturan koding, kelengkapan berkas, dan kaidah verifikasi BPJS Kesehatan.',
    reviewStatus: 'Informational',
    keyRelationship: 'Klaim administratif valid dan lengkap',
    supportingEvidence: [
      'Kesesuaian diagnosis utama dan sekunder terverifikasi',
      'Dokumen resume medis dan penunjang lengkap',
      'Tarif pengajuan sesuai tarif standar INA-CBG'
    ],
    whyReview: 'Klaim berisiko rendah yang dapat diproses langsung.',
    legitimateExplanations: [
      'Prosedur standar pelayanan kesehatan berjalan tertib'
    ],
    questions: [
      'Apakah verifikasi administratif akhir telah dikonfirmasi?'
    ]
  },
  {
    id: 'hemodialysis',
    title: 'Pelayanan Rutin Terjadwal',
    description: 'Pelayanan rutin terjadwal pasien kronis dengan interval teratur sesuai protokol terapi.',
    reviewStatus: 'Informational',
    keyRelationship: 'Terapi rutin berkala',
    supportingEvidence: [
      'Pasien dan tindakan hemodialisis berulang terjadwal',
      'Episode rawat jalan berkala sesuai indikasi nefrologi'
    ],
    whyReview: 'Layanan berulang rutin tidak memerlukan eskalasi investigasi.',
    legitimateExplanations: [
      'Jadwal cuci darah 2–3 kali seminggu'
    ],
    questions: [
      'Apakah surat rujukan dan protokol hemodialisis masih berlaku?'
    ]
  }
];

function maskPatientId(noRm) {
  if (!noRm) return 'RM-2026-***-000';
  const parts = String(noRm).split('-');
  if (parts.length >= 3) {
    return `${parts[0]}-${parts[1]}-***-${parts[parts.length - 1]}`;
  }
  return String(noRm).replace(/\d(?=\d{2})/g, '*');
}

function determineClusterId(claim, findings = []) {
  for (const f of findings) {
    const t = ((f.findingType || '') + ' ' + (f.title || '')).toUpperCase();
    if (t.includes('DUPLICATE') || t.includes('REPEAT')) return 'duplicate';
    if (t.includes('UPCODING')) return 'coding-change';
    if (t.includes('UNBUNDLING')) return 'split-stay';
    if (t.includes('DOCUMENT') || t.includes('DOKUMEN')) return 'missing-document';
    if (t.includes('TARIFF') || t.includes('TARIF')) return 'comparable';
    if (t.includes('INCONSISTENCY') || t.includes('PHANTOM')) return 'early-readmission';
  }
  if (claim.riskScore > 75 || (claim.riskLevel || '').toLowerCase() === 'high') {
    return 'coding-change';
  }
  if (claim.riskScore > 50 || (claim.riskLevel || '').toLowerCase() === 'medium') {
    return 'split-stay';
  }
  if (claim.primaryDiagnosis?.code === 'N18.5') {
    return 'hemodialysis';
  }
  return 'normal';
}

class GraphService {
  constructor(customDataDir = null) {
    this.dataDir = customDataDir || process.env.DATA_DIR || path.join(__dirname, '../data');
    this.claimsRepo = new JsonRepository('claims.json', customDataDir);
    this.findingsRepo = new JsonRepository('fraud-findings.json', customDataDir);
    this.analysisRepo = new JsonRepository('analysis-runs.json', customDataDir);
    this.facilitiesRepo = new JsonRepository('facilities.json', customDataDir);
  }

  _loadGraph() {
    const filePath = path.resolve(this.dataDir, 'graph.json');
    if (!fs.existsSync(filePath)) {
      throw HttpError.internal('Graph data file not found', 'GRAPH_DATA_MISSING');
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      throw HttpError.internal('Failed to parse graph data file', 'GRAPH_PARSE_ERROR');
    }
  }

  /**
   * GET /api/graph
   * Returns complete relationship graph
   */
  getGraph() {
    return this._loadGraph();
  }

  /**
   * Builds dynamic anomaly network directly from backend claimsRepo, analysisRepo, and findingsRepo.
   * Ensures 100% data consistency with Verifikator Claims Queue.
   */
  buildDynamicAnomalyNetwork(filters = {}) {
    const claims = this.claimsRepo.findAll((c) => !c.isDeleted);
    const allFindings = this.findingsRepo.findAll();
    const allRuns = this.analysisRepo.readAll();

    const runsByClaim = new Map();
    for (const run of allRuns) {
      const existing = runsByClaim.get(run.claimId);
      if (!existing || new Date(run.createdAt) > new Date(existing.createdAt)) {
        runsByClaim.set(run.claimId, run);
      }
    }

    const findingsByClaim = new Map();
    for (const f of allFindings) {
      if (!findingsByClaim.has(f.claimId)) findingsByClaim.set(f.claimId, []);
      findingsByClaim.get(f.claimId).push(f);
    }

    const enrichedClaims = claims.map((c) => {
      const claimFindings = findingsByClaim.get(c.id) || [];
      const claimRun = runsByClaim.get(c.id);
      const riskCategory = (claimRun?.riskCategory || (c.riskScore > 70 ? 'HIGH' : c.riskScore > 40 ? 'MEDIUM' : 'LOW')).toLowerCase();
      const riskScore = claimRun?.riskScore ?? (c.riskScore || (riskCategory === 'high' ? 89 : riskCategory === 'medium' ? 64 : 28));
      const clusterId = determineClusterId({ ...c, riskScore, riskLevel: riskCategory }, claimFindings);
      return {
        ...c,
        findings: claimFindings,
        riskLevel: riskCategory,
        riskScore,
        clusterId
      };
    });

    // Build dynamic facilities list from claims
    const facilitiesMap = new Map();
    facilitiesMap.set('facility-001', {
      id: 'facility-001',
      name: 'RSUP Dr. Sardjito',
      clusterIds: new Set()
    });

    for (const c of enrichedClaims) {
      const facName = c.facilityName || 'RSUP Dr. Sardjito';
      let facId;
      if (facName.toLowerCase().includes('sardjito')) {
        facId = 'facility-001';
      } else if (c.facilityId) {
        facId = c.facilityId;
      } else {
        facId = `FAS-${facName.slice(0, 3).toUpperCase()}`;
      }

      if (!facilitiesMap.has(facId)) {
        facilitiesMap.set(facId, {
          id: facId,
          name: facName,
          clusterIds: new Set()
        });
      }
      facilitiesMap.get(facId).clusterIds.add(c.clusterId);
    }

    const facilities = Array.from(facilitiesMap.values()).map((f) => ({
      id: f.id,
      name: f.name,
      clusterIds: Array.from(f.clusterIds)
    }));

    // Group claims by cluster
    const claimsByCluster = new Map();
    for (const c of enrichedClaims) {
      if (!claimsByCluster.has(c.clusterId)) claimsByCluster.set(c.clusterId, []);
      claimsByCluster.get(c.clusterId).push(c);
    }

    const nodes = [];
    const edges = [];
    const createdNodeIds = new Set();
    const createdEdgeIds = new Set();

    const addNode = (node) => {
      if (!createdNodeIds.has(node.id)) {
        createdNodeIds.add(node.id);
        nodes.push(node);
      }
    };

    const addEdge = (edge) => {
      if (!createdEdgeIds.has(edge.id) && createdNodeIds.has(edge.source) && createdNodeIds.has(edge.target)) {
        createdEdgeIds.add(edge.id);
        edges.push(edge);
      }
    };

    // Iterate through clusters to generate nodes with deterministic coordinates
    for (const cluster of defaultClusters) {
      const clusterClaims = claimsByCluster.get(cluster.id) || [];

      clusterClaims.forEach((claim, idx) => {
        const yBase = 60 + idx * 160;
        const maskedPatient = maskPatientId(claim.noRm);
        const facName = claim.facilityName || 'RSUP Dr. Sardjito';
        const facId = facName.toLowerCase().includes('sardjito') ? 'facility-001' : (claim.facilityId || `FAS-${facName.slice(0, 3).toUpperCase()}`);
        const diagCode = claim.primaryDiagnosis?.code || 'I63.9';
        const diagDesc = claim.primaryDiagnosis?.description || 'Diagnosis Utama';

        // 1. Patient Node (one per unique masked patient within cluster)
        const patientNodeId = `patient:${cluster.id}:${maskedPatient}`;
        addNode({
          id: patientNodeId,
          entityType: 'patient',
          type: 'patient',
          label: maskedPatient,
          clusterId: cluster.id,
          position: { x: 60, y: yBase + 10 },
          provenance: 'Data pasien terenkripsi/pseudonim',
          attributes: {
            patientId: maskedPatient,
            reviewStatus: 'Informational'
          }
        });

        // 2. Claim Node (1:1 with backend claim)
        const claimNodeId = claim.id;
        addNode({
          id: claimNodeId,
          entityType: 'claim',
          type: 'claim',
          label: claim.noSep || claim.sepNumber || `SEP-${claim.id.slice(-6)}`,
          shortId: claim.noSep || claim.sepNumber || `SEP-${claim.id.slice(-6)}`,
          sepNumber: claim.noSep || claim.sepNumber || `SEP-${claim.id.slice(-6)}`,
          claimId: claim.id,
          clusterId: cluster.id,
          position: { x: 340, y: yBase },
          provenance: 'Data sumber klaim verifikator',
          period: (claim.admissionDate || claim.serviceDate)?.slice(0, 7) || '2026-10',
          attributes: {
            patientId: maskedPatient,
            facilityId: facId,
            facilityName: facName,
            diagnosisCode: diagCode,
            diagnosis: diagDesc,
            claimAmount: claim.claimAmount || 0,
            serviceStart: claim.admissionDate || claim.serviceDate || '2026-10-20',
            serviceEnd: claim.dischargeDate || claim.serviceDate || '2026-10-23',
            reviewStatus: claim.riskScore > 70 ? 'Requires Review' : 'Informational',
            riskLevel: claim.riskLevel,
            riskScore: claim.riskScore,
            status: claim.workflowStatus || 'SUBMITTED',
            inaCbgCode: claim.inacbgCode || claim.submittedInaCbgCode || 'I-4-10-III'
          }
        });

        // 3. Diagnosis Node (one per unique diagnosis code within cluster)
        const diagNodeId = `diagnosis:${cluster.id}:${diagCode}`;
        addNode({
          id: diagNodeId,
          entityType: 'diagnosis',
          type: 'diagnosis',
          label: `${diagCode} · ${diagDesc}`,
          clusterId: cluster.id,
          position: { x: 680, y: yBase - 15 },
          provenance: 'Klasifikasi ICD-10',
          attributes: {
            diagnosisCode: diagCode,
            diagnosis: diagDesc,
            reviewStatus: claim.riskScore > 70 ? 'Requires Review' : 'Informational'
          }
        });

        // 4. Provider / Facility Node
        const facNodeId = `facility:${cluster.id}:${facId}`;
        addNode({
          id: facNodeId,
          entityType: 'facility',
          type: 'facility',
          label: facName,
          clusterId: cluster.id,
          position: { x: 680, y: yBase + 120 },
          provenance: 'Fasilitas Pelayanan Kesehatan',
          attributes: {
            facilityId: facId,
            facilityName: facName,
            reviewStatus: 'Informational'
          }
        });

        // Procedure Node if present
        let procNodeId = null;
        if (Array.isArray(claim.procedures) && claim.procedures.length > 0) {
          const proc = claim.procedures[0];
          const procCode = proc.code || proc;
          procNodeId = `procedure:${cluster.id}:${procCode}`;
          addNode({
            id: procNodeId,
            entityType: 'procedure',
            type: 'procedure',
            label: procCode,
            clusterId: cluster.id,
            position: { x: 680, y: yBase + 240 },
            provenance: 'Klasifikasi ICD-9-CM',
            attributes: {
              procedureCode: procCode,
              reviewStatus: 'Informational'
            }
          });
        }

        // Connect structural edges
        addEdge({
          id: `edge-pat-${claim.id}`,
          source: patientNodeId,
          target: claimNodeId,
          type: 'has_claim',
          relationshipType: 'has_claim',
          label: 'Memiliki Klaim',
          clusterId: cluster.id,
          supportingEvidence: {
            sharedPatientId: maskedPatient,
            noSep: claim.noSep || claim.sepNumber
          },
          explanation: `Pasien tercatat pada pengajuan klaim ${claim.noSep || claim.sepNumber}.`,
          reviewStatus: 'Informational',
          reviewReason: 'Relasi identitas administratif pasien.'
        });

        addEdge({
          id: `edge-diag-${claim.id}`,
          source: claimNodeId,
          target: diagNodeId,
          type: 'has_diagnosis',
          relationshipType: 'has_diagnosis',
          label: 'Diagnosis Utama',
          clusterId: cluster.id,
          supportingEvidence: {
            diagnosisCode: diagCode,
            diagnosis: diagDesc,
            noSep: claim.noSep || claim.sepNumber
          },
          explanation: `Klaim mencatat diagnosis utama ICD-10 ${diagCode} (${diagDesc}).`,
          reviewStatus: claim.riskScore > 70 ? 'Requires Review' : 'Informational',
          reviewReason: claim.riskScore > 70 ? 'Diagnosis terkait temuan review koding dan keparahan.' : 'Relasi penegakan diagnosis pelayanan.'
        });

        addEdge({
          id: `edge-fac-${claim.id}`,
          source: claimNodeId,
          target: facNodeId,
          type: 'occurred_at',
          relationshipType: 'occurred_at',
          label: 'Terjadi di Faskes',
          clusterId: cluster.id,
          supportingEvidence: {
            facilityName: facName,
            noSep: claim.noSep || claim.sepNumber
          },
          explanation: `Pelayanan klaim ${claim.noSep || claim.sepNumber} diselenggarakan di ${facName}.`,
          reviewStatus: 'Informational',
          reviewReason: 'Relasi administratif faskes penyelenggara.'
        });

        if (procNodeId) {
          addEdge({
            id: `edge-proc-${claim.id}`,
            source: claimNodeId,
            target: procNodeId,
            type: 'includes_procedure',
            relationshipType: 'includes_procedure',
            label: 'Memuat Tindakan',
            clusterId: cluster.id,
            supportingEvidence: {
              noSep: claim.noSep || claim.sepNumber
            },
            explanation: `Klaim mencatat tindakan medis pada berkas pelayanan.`,
            reviewStatus: 'Informational',
            reviewReason: 'Relasi tindakan klinis.'
          });
        }
      });

      // Connect inter-claim anomaly edges within cluster
      if (clusterClaims.length >= 2) {
        for (let i = 0; i < clusterClaims.length - 1; i++) {
          const cA = clusterClaims[i];
          const cB = clusterClaims[i + 1];

          let relType = 'informational';
          let relLabel = 'Relasi Kasus';
          let revStatus = cluster.reviewStatus;
          let revReason = 'Klaim berada pada kelompok pola yang sama.';
          let explanation = `Kedua klaim terhubung dalam pola investigasi ${cluster.title}.`;
          let evidence = { clusterId: cluster.id, claims: [cA.noSep, cB.noSep] };

          if (cluster.id === 'duplicate') {
            relType = 'potential_duplicate';
            relLabel = 'Potensi Duplikasi';
            evidence = { repeatPattern: 'Terdeteksi pengulangan penagihan dalam interval pendek', claims: [cA.noSep, cB.noSep] };
            explanation = 'Kedua klaim terindikasi pengulangan penagihan (repeat billing) dalam periode berdekatan.';
            revReason = 'Pastikan klaim bukan penagihan ganda untuk episode yang sama.';
          } else if (cluster.id === 'coding-change') {
            relType = 'coding_version_change';
            relLabel = 'Indikasi Upcoding';
            evidence = { diagnoses: [cA.primaryDiagnosis?.code, cB.primaryDiagnosis?.code], severityLevel: 'Level III' };
            explanation = 'Lonjakan severity level komplikasi sekunder tidak selaras dengan catatan terapi medis.';
            revReason = 'Pastikan komorbiditas berat terbukti secara klinis pada resume medis.';
          } else if (cluster.id === 'split-stay') {
            relType = 'split_care_episode';
            relLabel = 'Indikasi Unbundling';
            evidence = { unbundlingProcedures: true, episodeContinuity: true };
            explanation = 'Pemisahan komponen pemeriksaan penunjang yang seharusnya masuk paket INA-CBG.';
            revReason = 'Pemisahan komponen paket tarif perlu disatukan kembali.';
          } else if (cluster.id === 'missing-document') {
            relType = 'missing_supporting_document';
            relLabel = 'Dokumen Pendukung Belum Ada';
            evidence = { missingTypes: ['Laporan Operasi / Hasil Lab'], pendingUpload: true };
            explanation = 'Berkas penunjang hasil pemeriksaan belum terunggah lengkap.';
            revReason = 'Lengkapi berkas penunjang wajib sebelum persetujuan verifikasi klaim.';
          } else if (cluster.id === 'comparable') {
            relType = 'informational';
            relLabel = 'Kelompok Pembanding Tarif';
            evidence = { regionalDeviation: true, cbgCode: cA.inaCbgCode };
            explanation = 'Tarif klaim berada di luar rentang acuan regional untuk tipe faskes.';
            revReason = 'Deviasi tarif regional merupakan pembanding administratif, bukan kesimpulan kecurangan.';
          } else if (cluster.id === 'early-readmission') {
            relType = 'early_readmission';
            relLabel = 'Inkonsistensi Layanan';
            evidence = { observationalDataMismatch: true };
            explanation = 'Indikasi klaim layanan khusus tanpa kelengkapan dokumentasi ruang rawat.';
            revReason = 'Perlu konfirmasi fisik pelaksanaan layanan di fasilitas.';
          } else if (cluster.id === 'normal') {
            relType = 'informational';
            relLabel = 'Klaim Sesuai Kaidah';
            evidence = { standardCompliance: true };
            explanation = 'Klaim telah tervalidasi memenuhi seluruh kaidah verifikasi BPJS.';
            revReason = 'Klaim berisiko rendah yang dapat diproses langsung.';
          }

          addEdge({
            id: `edge-rev-${cluster.id}-${cA.id.slice(-4)}-${cB.id.slice(-4)}`,
            source: cA.id,
            target: cB.id,
            type: relType,
            relationshipType: relType,
            label: relLabel,
            clusterId: cluster.id,
            supportingEvidence: evidence,
            explanation,
            reviewStatus: revStatus,
            reviewReason: revReason
          });
        }
      }
    }

    return {
      meta: {
        name: 'Riskora Anomaly Network',
        source: 'claims.json',
        claimCount: enrichedClaims.length,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        generatedAt: new Date().toISOString()
      },
      disclaimer: 'Relasi berbasis aturan deterministik pada data klaim membantu penelusuran pola anomali dan verifikasi. Relasi bukan kesimpulan fraud dan tidak menggunakan inferensi model GNN terlatih.',
      clusters: defaultClusters,
      facilities,
      nodes,
      edges
    };
  }

  /**
   * GET /api/claims/:id/relationships
   * Returns localized sub-graph centered around specified claim
   */
  getClaimRelationships(claimId) {
    const cleanId = typeof claimId === 'string' && claimId.startsWith('claim:') ? claimId.slice(6) : claimId;
    const claim = this.claimsRepo.findById(cleanId) ||
      this.claimsRepo.findAll((c) => !c.isDeleted && (c.id === cleanId || c.claimId === cleanId || c.noSep === cleanId || c.sepNumber === cleanId))[0];

    if (!claim || claim.isDeleted) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found`);
    }

    const fullGraph = this._loadGraph();
    const claimNodeId = `claim:${claim.id}`;

    const claimNode = fullGraph.nodes.find(
      (n) => n.id === claimNodeId || n.id === claim.id || n.claimId === claim.id || (n.type === 'claim' && n.noSep === claim.noSep)
    );

    if (!claimNode) {
      return this._buildClaimEgoNetwork(claim);
    }

    const directEdges = fullGraph.edges.filter(
      (e) => e.source === claimNode.id || e.target === claimNode.id
    );

    const connectedNodeIds = new Set([claimNode.id]);
    for (const edge of directEdges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    const secondaryEdges = fullGraph.edges.filter(
      (e) =>
        (connectedNodeIds.has(e.source) || connectedNodeIds.has(e.target)) &&
        !directEdges.some((d) => d.id === e.id)
    );

    const allNodeIds = new Set(connectedNodeIds);
    for (const edge of secondaryEdges.slice(0, 20)) {
      allNodeIds.add(edge.source);
      allNodeIds.add(edge.target);
    }

    const subNodes = fullGraph.nodes.filter((n) => allNodeIds.has(n.id));
    const allEdges = [...directEdges, ...secondaryEdges.slice(0, 20)];

    return {
      claimId: claim.id,
      meta: {
        centerNodeId: claimNode.id,
        nodeCount: subNodes.length,
        edgeCount: allEdges.length,
        note: 'Relasi graph murni merepresentasikan kesamaan entitas (faskes, diagnosis, prosedur, nomor RM), bukan vonis kecurangan.'
      },
      nodes: subNodes,
      edges: allEdges
    };
  }

  _buildClaimEgoNetwork(claim) {
    const nodes = [
      { id: `claim:${claim.id}`, type: 'claim', label: claim.noSep || claim.sepNumber, claimId: claim.id },
      { id: `facility:${claim.facilityName || claim.facilityId}`, type: 'facility', label: claim.facilityName || claim.facilityId },
      { id: `patient:${maskPatientId(claim.noRm)}`, type: 'patient', label: maskPatientId(claim.noRm) }
    ];
    const edges = [
      { id: `e_${claim.id}_fac`, source: `claim:${claim.id}`, target: `facility:${claim.facilityName || claim.facilityId}`, relation: 'SUBMITTED_TO' },
      { id: `e_${claim.id}_pt`, source: `claim:${claim.id}`, target: `patient:${maskPatientId(claim.noRm)}`, relation: 'ASSOCIATED_WITH_PATIENT' }
    ];

    if (claim.primaryDiagnosis?.code) {
      nodes.push({ id: `diag:${claim.primaryDiagnosis.code}`, type: 'diagnosis', label: `${claim.primaryDiagnosis.code} - ${claim.primaryDiagnosis.description || ''}` });
      edges.push({ id: `e_${claim.id}_diag`, source: `claim:${claim.id}`, target: `diag:${claim.primaryDiagnosis.code}`, relation: 'PRIMARY_DIAGNOSIS' });
    }

    return {
      claimId: claim.id,
      meta: {
        centerNodeId: `claim:${claim.id}`,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        note: 'Relasi graph dibentuk dari data klaim.'
      },
      nodes,
      edges
    };
  }
}

module.exports = GraphService;
