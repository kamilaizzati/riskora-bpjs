# RISKORA Backend Integration Plan

## Scope and audit basis

This plan is based on the current React source in `src/`, not on the Stitch exports. It prepares an Express + MongoDB integration for the Verifikator experience only. It does not implement a backend, AI model, GNN, BPJS integration, or an INA-CBG grouper.

All current records are fictional prototype data. Codes, amounts, clinical text, anomaly scores, and INA-CBG examples must not be treated as clinically or commercially validated.

## 1. Current frontend architecture

### Runtime and integration seam

- React 18 + Vite, JavaScript/JSX, React Router, Tailwind CSS, Lucide React, and Recharts.
- `VITE_USE_MOCK_API` selects mock adapters inside the existing service modules.
- `VITE_API_BASE_URL` is read by `src/services/apiClient.js`.
- `apiClient.js` currently supports GET only, sends no access token, has no request body support, and returns `response.json()` directly.
- Hooks own loading/error/retry state and call the service modules. This service/hook seam is the correct place to swap mock and HTTP adapters while leaving page modules unchanged.

### Routes found in `src/app/router.jsx`

| Route | Current module | State |
| --- | --- | --- |
| `/login` | `LoginPage` | Implemented, mock authentication |
| `/register` | `RegisterPage` | Implemented, mock Faskes registration |
| `/verificator/dashboard` | `DashboardPage` | Implemented |
| `/verificator/claims` | `ClaimsPage` | Implemented |
| `/verificator/fraud-analysis` | `FraudAnalysisPage` | Implemented |
| `/verificator/anomaly-network` | `PlaceholderPage` | **Not implemented** |
| `/verificator/settings` | `PlaceholderPage` | Not implemented |
| `/verificator/help` | `PlaceholderPage` | Not implemented |
| `/verifier/claims/:claimId` | `ClaimDetailPage` | Implemented; note the `/verifier` namespace differs from `/verificator` |
| `/faskes/dashboard` | `FaskesDashboardPage` | Minimal placeholder |

Verifikator routes are protected in the browser by `ProtectedRoute(role="verificator")`. This is not a security control; the backend must enforce authorization independently.

### Shared layout

- `AppLayout`: sidebar, fixed topbar, outlet, and standard disclaimer.
- `Sidebar`: navigation and local logout.
- `Topbar`: mobile menu and a global-search field that only changes local state; it performs no search.
- `navigation.js`: shared navigation configuration.

### Dashboard modules

- Page: `DashboardPage`.
- Data hook: `useVerificatorDashboard`.
- Adapter: `verificatorService.getVerificatorDashboard`.
- Mock: `mockVerificatorDashboard`.
- Presentation modules: `StatCard`, `DataTable`, `FilterTabs`, `SearchInput`, `AnomalyDistributionChart`, `ScreeningResultsChart`.
- Search and quick filters run in memory over the priority-claim array.

### Antrean Klaim modules

- Page: `ClaimsPage`.
- Data hook: `useClaimsQueue`.
- Adapter: `claimsService.getClaimsQueue`.
- Mock: `mockVerificatorClaims` (10 reference records + 76 generated records).
- Presentation modules: `AdvancedClaimFilters`, `ClaimsQueueTable`, `ClaimsPagination`, `FilterTabs`, `SearchInput`, and `StatusBadge`.
- Search, quick filters, advanced filters, and pagination currently run in the browser after fetching the full list.
- The `anomaly` query parameter is read from the URL; other filters and pagination are not URL-backed.
- Copying a SEP number uses the browser clipboard and requires no backend.

### Detail Verifikasi modules

- Page: `ClaimDetailPage`.
- Data hook: `useClaimDetail`.
- Adapter: `claimDetailService.getClaimDetail`.
- Presentation modules: `ClaimSummary`, `DocumentViewer`, and `AIReviewPanel`.
- `claimDetailService` enriches a queue record in mock mode with stay dates, INA-CBG example, risk score, document metadata, and two findings.
- The document content itself is mostly hardcoded JSX. The current document metadata array does not contain a download/preview URL.
- Document tabs, zoom, page selector, fullscreen, and finding-to-evidence navigation are local UI state.
- Review decision and verifier notes are stored under `riskora-review-{claimId}` in `localStorage`; no server persistence exists.

### Analisis Fraud modules

- Page: `FraudAnalysisPage`.
- Dialog: `AnomalyClaimsDialog`.
- It reuses `useClaimsQueue`, groups claims in memory by `anomalyTypes`, and derives category counts in the browser.
- The six-month trend is a hardcoded `trendData` constant inside the page.
- The dialog's displayed anomaly percentage is synthetic UI math (`94 - index * 3`, minimum 62), not a stored screening score.
- “Buka di Antrean Klaim” passes an anomaly filter via the URL.

### Jaringan Anomali

There is no graph page, graph module, mock graph dataset, node shape, or edge shape in the current source. Only the route and navigation entry exist. The contracts below are therefore proposed contracts, not migrations of an existing implementation.

### Existing machine values

| Concept | Current values |
| --- | --- |
| Risk level | `low`, `medium`, `high` |
| Claim status | `pending_verification`, `needs_investigation`, `in_review`, `completed` |
| Review decision | `continue`, `correction`, `investigation` |
| Anomaly type | `Upcoding`, `Unbundling`, `Repeat Billing`, `Clinical Mismatch`, `Incomplete Documents`, `Phantom Billing` |
| Document IDs | `medical-summary`, `laboratory`, `billing` |
| Finding severity | `medium`, `high` in current detail mock |
| User roles | `verificator`, `faskes` |

Anomaly values currently mix display labels and machine identifiers. The backend should normalize them to lowercase snake-case identifiers and let the frontend adapter map them to Indonesian labels.

### Browser-only interactions requiring review

| Interaction | Current behavior | Backend needed? |
| --- | --- | --- |
| Login/logout/session | Plain-text demo accounts and session in `localStorage` | Yes |
| Faskes registration | Stores account, including plain-text password, in `localStorage` | Yes; outside first Verifikator milestone |
| Global search | Local input only | Yes, if retained as cross-page search |
| Dashboard table search/filter | In-memory | Optional initially; server query when data grows |
| Claims search/filter/pagination | In-memory over all 86 records | Yes |
| Claim review draft | `localStorage` | Yes |
| Final review submission | `localStorage` | Yes, transactional status update required |
| Viewer zoom/tab/fullscreen | Local UI state | No |
| Finding-to-document jump | Browser custom event | No, but evidence anchors must come from backend metadata |
| Fraud category grouping | In-memory claim grouping | Yes for authoritative counts and scalable listing |
| Fraud trend | Hardcoded constant | Yes |

## 2. Page-to-API mapping

All proposed successful responses use `{ "data": ..., "meta": ... }`. Error responses use `{ "error": { "code": "...", "message": "...", "details": {} } }`. Dates are ISO 8601; money is integer rupiah; IDs are opaque strings.

### Dashboard Verifikator

| Need | Current source | Proposed endpoint | Parameters | Persistence |
| --- | --- | --- | --- | --- |
| KPI summary | `mockVerificatorDashboard.summary` | `GET /api/v1/verificator/dashboard/summary` | `facilityId?`, `from?`, `to?` | Read-only aggregate |
| Priority claims | `mockVerificatorDashboard.priorityClaims` | `GET /api/v1/verificator/dashboard/priority-claims` | `limit=6`, `facilityId?` | Read-only |
| Anomaly distribution | `mockVerificatorDashboard.anomalyDistribution` | `GET /api/v1/verificator/dashboard/anomaly-distribution` | `from?`, `to?`, `facilityId?` | Read-only aggregate |
| Screening results | `mockVerificatorDashboard.screeningResults` | `GET /api/v1/verificator/dashboard/screening-results` | `from?`, `to?`, `facilityId?` | Read-only aggregate |

The existing frontend already calls four similar unversioned endpoints. A later frontend adapter change should add `/v1` and unwrap `data` without changing the page.

Example summary response:

```json
{
  "data": {
    "pendingVerification": 86,
    "highRisk": 124,
    "inReview": 23,
    "completed": 1248
  },
  "meta": { "generatedAt": "2026-10-22T08:00:00.000Z" }
}
```

Example chart response:

```json
{
  "data": [
    { "anomalyType": "upcoding", "label": "Upcoding", "count": 48 },
    { "anomalyType": "unbundling", "label": "Unbundling", "count": 35 }
  ],
  "meta": { "from": "2026-05-01", "to": "2026-10-31" }
}
```

Colors remain presentation concerns and should not be stored in MongoDB or returned by the backend.

### Antrean Klaim

Proposed endpoint:

`GET /api/v1/verificator/claims`

Query parameters:

- `q`: searches SEP number, facility name/code, diagnosis code, and diagnosis description.
- `status`: one or more comma-separated machine values.
- `riskLevel`: one or more of `low,medium,high`.
- `anomalyType`: normalized machine value such as `repeat_billing`.
- `facilityId`: optional facility scope.
- `serviceDateFrom`, `serviceDateTo`: ISO dates.
- `page`: one-based, default 1.
- `pageSize`: default 10, capped (recommended 100).
- `sort`: allowlisted value such as `priority_desc`, `service_date_desc`, or `claim_amount_desc`.

Example response:

```json
{
  "data": {
    "items": [
      {
        "id": "clm_001",
        "sepNumber": "0182R0010924V004812",
        "facility": { "id": "fac_001", "name": "RS Contoh A", "type": "A", "city": "Kota Contoh" },
        "care": { "type": "inpatient", "display": "Rawat Inap", "class": "1" },
        "serviceDate": "2024-09-24",
        "primaryDiagnosis": { "code": "I63.9", "description": "Contoh diagnosis sintetis" },
        "claimAmount": 18450000,
        "anomalyTypes": ["upcoding"],
        "riskLevel": "high",
        "status": "needs_investigation",
        "updatedAt": "2026-10-22T08:00:00.000Z"
      }
    ],
    "facets": {
      "all": 86,
      "highRisk": 42,
      "needsInvestigation": 18,
      "pendingVerification": 26
    }
  },
  "meta": { "page": 1, "pageSize": 10, "total": 86, "pageCount": 9 }
}
```

Search, filtering, sorting, facets, and pagination should move to the server. This prevents downloading every claim and ensures counts describe the full result set, not just the current page.

### Detail Verifikasi Klaim

Recommended reads:

- `GET /api/v1/verificator/claims/:claimId` — administrative, clinical coding, claim amount, current status, and current review summary.
- `GET /api/v1/verificator/claims/:claimId/documents` — document metadata only.
- `GET /api/v1/verificator/claims/:claimId/documents/:documentId/content` — authorized short-lived content URL or streamed file.
- `GET /api/v1/verificator/claims/:claimId/screening-result` — score, findings, and evidence references.
- `GET /api/v1/verificator/claims/:claimId/reviews/current` — verifier-only draft/latest review including internal notes.

The page may initially use a composed endpoint (`GET /claims/:id?include=documents,screening,currentReview`) to reduce round trips. Internally, keep claim, documents, screening, and reviews in separate modules/collections.

Example composed detail response:

```json
{
  "data": {
    "claim": {
      "id": "clm_001",
      "sepNumber": "0182R0010924V004812",
      "facility": { "id": "fac_001", "name": "RS Contoh A", "type": "A", "city": "Kota Contoh" },
      "patient": { "id": "pat_demo_001", "displayId": "RM-2024-***" },
      "care": {
        "type": "inpatient",
        "class": "1",
        "admissionAt": "2024-09-20T03:14:00.000Z",
        "dischargeAt": "2024-09-24T05:30:00.000Z",
        "lengthOfStayDays": 4
      },
      "diagnoses": [
        { "code": "I63.9", "description": "Contoh diagnosis sintetis", "kind": "primary" },
        { "code": "G93.4", "description": "Contoh diagnosis sekunder sintetis", "kind": "secondary" }
      ],
      "procedures": [],
      "inaCbg": { "submittedCode": "DEMO-I-4-10-III", "submittedTariff": 18450000, "source": "seed_unvalidated" },
      "claimAmount": 18450000,
      "riskLevel": "high",
      "status": "needs_investigation",
      "version": 3
    },
    "documents": [
      { "id": "doc_001", "type": "medical_summary", "label": "Resume Medis", "pageCount": 2, "ocrStatus": "completed", "mimeType": "application/pdf" }
    ],
    "screeningResult": {
      "id": "scr_001",
      "riskScore": 89,
      "riskLevel": "high",
      "modelVersion": "prototype-rules-v1",
      "findings": [
        {
          "id": "fnd_001",
          "type": "clinical_mismatch",
          "severity": "high",
          "title": "Ketidaksesuaian klinis",
          "description": "Contoh temuan sintetis untuk pengujian.",
          "evidence": [{ "documentId": "doc_001", "page": 1, "anchor": "evidence-1", "excerpt": "Cuplikan sintetis" }],
          "references": ["SN-CLINICAL-02"]
        }
      ]
    },
    "currentReview": null
  }
}
```

Required writes:

- `PUT /api/v1/verificator/claims/:claimId/review-draft`
- `POST /api/v1/verificator/claims/:claimId/reviews`

Draft request:

```json
{
  "decision": "investigation",
  "internalNotes": "Catatan internal verifikator.",
  "correctionInstructions": null,
  "claimVersion": 3
}
```

Final review request:

```json
{
  "decision": "correction",
  "internalNotes": "Catatan internal yang tidak boleh terlihat oleh Faskes.",
  "correctionInstructions": "Unggah ulang resume medis yang telah ditandatangani dan konfirmasi kode diagnosis sekunder.",
  "claimVersion": 3,
  "idempotencyKey": "rev-submit-3a83c6d8"
}
```

`internalNotes` and fraud reasoning must only be returned by Verifikator endpoints. `correctionInstructions` is deliberately separate and is the only review text intended for Faskes visibility.

### Analisis Fraud

Current page requirements:

- Counts and descriptions per anomaly category.
- Claims linked to each category.
- Risk level and claim amount for preview rows.
- Six-month category trend.

Proposed endpoints:

- `GET /api/v1/verificator/fraud/anomaly-summary?from=&to=&facilityId=`
- `GET /api/v1/verificator/fraud/anomalies/:anomalyType/claims?page=&pageSize=&riskLevel=`
- `GET /api/v1/verificator/fraud/anomaly-trends?from=&to=&interval=month&facilityId=`

Example summary:

```json
{
  "data": [
    {
      "anomalyType": "upcoding",
      "code": "ANOM-UPC",
      "label": "Upcoding",
      "description": "Indikasi yang memerlukan tinjauan verifikator.",
      "claimCount": 48,
      "highRiskCount": 21
    }
  ],
  "meta": { "generatedAt": "2026-10-22T08:00:00.000Z" }
}
```

The backend must return stored screening scores if the UI displays a percentage. It must not reproduce the current index-derived percentage. A screening finding is an indication, not a fraud determination.

### Jaringan Anomali (proposed; frontend absent)

Data needed by the requested future page:

- Nodes for facilities, pseudonymous patients, claims, providers (only if authorized and justified), diagnoses, procedures, and anomaly findings.
- Typed edges such as `submitted_by`, `belongs_to_patient`, `has_diagnosis`, `has_procedure`, `shares_patient`, `shares_provider`, `similar_pattern`, and `has_finding`.
- Related-claim summaries and human-readable reasons for every derived edge.
- Filters, time window, minimum confidence, and pagination/expansion controls.

Proposed endpoints:

- `GET /api/v1/verificator/anomaly-network?seedType=claim&seedId=clm_001&depth=1&from=&to=&anomalyType=&minScore=`
- `GET /api/v1/verificator/anomaly-network/nodes/:nodeId/related-claims?page=&pageSize=`

Example graph response:

```json
{
  "data": {
    "nodes": [
      { "id": "claim:clm_001", "type": "claim", "label": "SEP …4812", "riskLevel": "high", "claimId": "clm_001" },
      { "id": "facility:fac_001", "type": "facility", "label": "RS Contoh A", "facilityId": "fac_001" }
    ],
    "edges": [
      {
        "id": "edge:clm_001:fac_001",
        "source": "claim:clm_001",
        "target": "facility:fac_001",
        "type": "submitted_by",
        "score": 1,
        "explanation": "Klaim diajukan oleh fasilitas ini."
      }
    ],
    "relatedClaims": [{ "claimId": "clm_001", "sepNumberMasked": "…4812", "riskLevel": "high", "anomalyTypes": ["upcoding"] }
  },
  "meta": { "truncated": false, "maxNodes": 200 }
}
```

Start with MongoDB aggregation. Derive edges from indexed claim fields and screening findings at request time or materialize them into a bounded `anomaly_relationships` collection only after query latency and use cases are measured. Do not introduce a graph database for the first implementation.

## 3. Proposed MongoDB collections

Use MongoDB `_id` internally and a stable public application ID (`userId`, `claimId`, etc.) with a unique index. References below use application IDs so seed data and external contracts remain portable.

### `users`

```js
{
  userId, emailNormalized, passwordHash,
  displayName, role: 'verificator' | 'faskes_admin' | 'faskes_user' | 'system_admin',
  facilityId: null | 'fac_001', status: 'invited' | 'active' | 'disabled',
  permissions: [], lastLoginAt, createdAt, updatedAt
}
```

Unique index on `emailNormalized`; index on `{ role: 1, status: 1 }`. Never store plain-text passwords.

### `facilities`

```js
{
  facilityId, code, name, type, city, province,
  registrationStatus: 'pending' | 'verified' | 'disabled',
  createdAt, updatedAt
}
```

Unique index on `facilityId` and on `code` when available.

### `patients`

```js
{
  patientId, facilityId, sourcePatientKeyHash,
  displayMedicalRecordIdMasked, birthYear, sex,
  createdAt, updatedAt
}
```

Store only the minimum fields required for claim linkage. The seed uses synthetic patients. Never expose `sourcePatientKeyHash` to clients. Unique compound index on `{ facilityId: 1, sourcePatientKeyHash: 1 }`.

### `claims`

```js
{
  claimId, sepNumber, facilityId, patientId,
  care: { type, class, serviceDate, admissionAt, dischargeAt, lengthOfStayDays },
  diagnoses: [{ code, description, kind: 'primary' | 'secondary' }],
  procedures: [{ code, description, system: 'ICD-9-CM' | 'other' }],
  inaCbg: { submittedCode, submittedTariff, source, validationStatus },
  claimAmount,
  status,
  currentRiskLevel,
  currentScreeningResultId,
  assignedVerifierId,
  version,
  submittedAt, createdAt, updatedAt
}
```

Indexes: unique `claimId`, unique/controlled `sepNumber`, `{ status: 1, currentRiskLevel: 1, updatedAt: -1 }`, `{ facilityId: 1, 'care.serviceDate': -1 }`, diagnosis codes, and a text/search strategy appropriate to MongoDB deployment. Do not claim that `inaCbg` was calculated by Riskora; store only the submitted/imported value and its provenance.

### `claim_documents`

```js
{
  documentId, claimId, type, label, mimeType, pageCount,
  storageKey, checksum, sizeBytes,
  uploadStatus, ocrStatus,
  extractedTextRef, evidenceAnchors: [{ anchor, page, boundingBox }],
  uploadedBy, createdAt, updatedAt
}
```

Files belong in object storage, not MongoDB documents. `storageKey` must never be sent directly to unauthorized clients; issue short-lived URLs or stream through an authorized endpoint. Index `{ claimId: 1, type: 1 }`.

### `screening_results`

```js
{
  screeningResultId, claimId, runId, modelVersion, rulesetVersion,
  status: 'pending' | 'completed' | 'failed',
  riskScore, riskLevel,
  outcome: 'passed' | 'needs_correction' | 'needs_review',
  anomalyTypes: [],
  findings: [{
    findingId, type, severity, title, description,
    evidence: [{ documentId, page, anchor, excerpt }],
    references: [], confidence: null | 0.0
  }],
  createdAt, completedAt
}
```

Keep each run immutable. `claims.currentScreeningResultId` points to the result displayed in the queue. Index `{ claimId: 1, createdAt: -1 }`, `anomalyTypes`, and `{ riskLevel: 1, completedAt: -1 }`.

### `verification_reviews`

```js
{
  reviewId, claimId, verifierId,
  state: 'draft' | 'submitted',
  decision: 'continue' | 'correction' | 'investigation',
  internalNotes,
  correctionInstructions,
  basedOnClaimVersion,
  submittedAt, createdAt, updatedAt
}
```

`internalNotes` are Verifikator-only. `correctionInstructions` are intentionally separate and may be exposed to the owning Faskes after submission. Index `{ claimId: 1, state: 1, updatedAt: -1 }`; enforce at most one active draft per verifier and claim through application logic or a partial unique index.

### Optional later collections

- `audit_events`: immutable security and workflow audit trail.
- `screening_runs`: batch-level metadata if claims are screened in batches.
- `anomaly_relationships`: only if measured graph aggregation latency justifies materialization.

## 4. REST interfaces and write semantics

### Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/faskes/registration-requests` (later; never permits self-selecting `verificator`)

Use secure, HTTP-only, same-site cookies for browser sessions where deployment topology permits. If bearer tokens are required, keep access tokens short-lived and never persist them in localStorage. Add CSRF protection for cookie-authenticated writes.

### Verifikator reads

- Dashboard and claim reads listed above.
- Fraud analysis reads listed above.
- Proposed anomaly-network reads listed above.
- `GET /api/v1/verificator/reference-data/claim-filters` for allowed statuses/anomaly types if these become configurable.

### Verifikator writes

- `PUT /api/v1/verificator/claims/:claimId/review-draft`: upsert current user's draft; does not change claim status.
- `POST /api/v1/verificator/claims/:claimId/reviews`: submit an immutable review and atomically transition claim status.
- Optional `POST /api/v1/verificator/claims/:claimId/assignments/claim`: claim work ownership, if concurrent assignment is introduced.

Use optimistic concurrency (`claimVersion`) and return `409 CLAIM_VERSION_CONFLICT` if the claim changed after the verifier opened it. Final submission should support an idempotency key.

### Faskes isolation

Faskes endpoints must use separate route handlers and response serializers, for example:

- `GET /api/v1/faskes/claims/:claimId`
- `GET /api/v1/faskes/claims/:claimId/correction-request`
- `POST /api/v1/faskes/claims/:claimId/corrections`

They may expose submitted claim data, claim status, and `correctionInstructions`. They must not expose `internalNotes`, raw fraud explanations, other facilities' claims, verifier identity details, screening implementation details, or cross-claim graph data.

## 5. Claim status lifecycle

The current frontend has four statuses. Preserve them for the first backend milestone and add only the status needed for Faskes correction:

```text
pending_verification
        │ open/assign
        ▼
     in_review
      ├── decision=continue ───────► completed
      ├── decision=investigation ──► needs_investigation
      └── decision=correction ─────► correction_requested

needs_investigation ── authorized resolution ─► in_review | completed
correction_requested ── Faskes resubmits ─────► pending_verification
```

Rules:

- Saving a draft does not change status.
- Final review creation and claim transition occur in one transaction.
- Only authorized Verifikator roles can transition to `completed` or `needs_investigation`.
- Only the owning Faskes may resubmit a correction.
- Every transition records actor, timestamp, previous status, next status, and reason in an audit event.
- `completed` means the Riskora review workflow is complete; it must not be presented as an official BPJS payment/adjudication result unless an authorized external source provides that state.

## 6. Authentication and role-based access

Minimum roles:

- `verificator`: view all permitted claims, screening results, fraud analysis, internal notes, and submit reviews.
- `faskes_admin`: manage users for one facility and view/correct only that facility's claims.
- `faskes_user`: view/correct only permitted claims for one facility.
- `system_admin`: invitation and account administration; should not automatically imply clinical review authority.

Requirements:

- Server-side authorization on every request; frontend route guards are convenience only.
- Facility scoping comes from the authenticated principal, never a trusted client-supplied facility ID alone.
- Verifikator registration is invitation/admin-only.
- Password hashing with a modern password KDF, rate limiting, lockout/backoff, secure reset tokens, session revocation, and audit logging.
- Document access uses short-lived authorization and is logged.
- Responses use least privilege and separate serializers for Verifikator and Faskes.

## 7. Mock data migration and seed strategy

### Preserve as seed material

- The 86 records from `mockVerificatorClaims` can seed claims after normalization.
- The first 10 reference rows should be preserved as deterministic acceptance-test fixtures.
- The 76 generated rows can seed pagination, search, and filter testing.
- Dashboard values and chart values can seed expected aggregate fixtures, but should not be stored as independent source-of-truth records once aggregates are computed from claims/screening results.
- Detail enrichment can seed one complete claim fixture (`claim-001`) with documents, findings, and a review draft.
- Demo users and facility names may be reused only as explicitly fictional/non-production seed identities.

### Normalize before import

- Convert anomaly labels to IDs: `Upcoding -> upcoding`, `Repeat Billing -> repeat_billing`, etc.
- Split `facilityMeta` into city and facility type.
- Split `careType` into care type, class, and specialty where possible.
- Convert date-only strings to a documented date representation and timestamps to UTC.
- Move `diagnosisCode`/`diagnosis` into `diagnoses[]`; remove duplicate legacy fields.
- Add stable `facilityId`, synthetic `patientId`, `screeningResultId`, and document IDs.
- Replace status/risk display labels with machine values only.
- Add provenance to every example INA-CBG value: `source: seed_unvalidated`.
- Remove chart colors from stored data.

### Missing relationships/data to generate synthetically

- Pseudonymous patient-to-claim links.
- Facility master records and stable facility codes.
- Secondary diagnoses and procedure codes for detail testing.
- Claim-to-document records and safe sample PDFs/text fixtures.
- Screening run/result lineage, finding IDs, and evidence anchors.
- Review ownership, timestamps, and audit events.
- Graph relationships with transparent derivation reasons.

Do not use real names, identifiers, medical record numbers, SEP numbers, clinical documents, or patient histories in development seeds. Existing realistic-looking strings should be clearly marked synthetic or replaced with obviously synthetic values before wider distribution.

## 8. Recommended backend implementation order

1. Freeze normalized enums and response envelopes; add contract fixtures from current mocks.
2. Create Express application skeleton, configuration validation, error envelope, health endpoint, and test harness.
3. Implement MongoDB connection plus `users`, `facilities`, `patients`, `claims`, and indexes.
4. Build synthetic seed migration for the 86 claims and deterministic facilities/patients.
5. Implement authentication and Verifikator authorization.
6. Implement server-side paginated `GET /verificator/claims` and `GET /verificator/claims/:id`.
7. Switch only the claim queue/detail frontend adapters to HTTP behind `VITE_USE_MOCK_API=false`; keep mock adapters intact.
8. Add `claim_documents` metadata/content authorization and `screening_results` reads.
9. Add review drafts and transactional final review submission with optimistic concurrency.
10. Add dashboard aggregates.
11. Add fraud summary/category/trend endpoints and remove synthetic percentage math from the UI.
12. Design and implement the Jaringan Anomali frontend against measured MongoDB aggregation results; consider relationship materialization only if needed.

## 9. Risks, assumptions, and unresolved questions

- **Jaringan Anomali is not implemented.** Its UI behavior, node limits, expansion model, and graph library remain decisions.
- The detail route namespace is `/verifier/...` while all other routes use `/verificator/...`; decide whether to migrate with a redirect before backend URLs become public.
- Current dashboard KPI values do not reconcile with the 86-claim queue and must not be seeded as authoritative totals.
- `completed` needs a precise business definition distinct from official BPJS adjudication/payment.
- The owner and approval process for `needs_investigation` is unspecified.
- Correction workflow, resubmission versioning, and which instructions are Faskes-visible need product approval.
- Patient linkage is required for network analysis but increases privacy risk; define retention, lawful basis, masking, and access controls before implementation.
- Document storage provider, malware scanning, OCR source, retention, and deletion policies are unresolved.
- Search technology is unresolved; begin with indexed MongoDB queries and measure before adding another system.
- Clinical code descriptions and INA-CBG values in the prototype are unvalidated. Riskora must not claim to calculate official grouping or tariffs.
- The current mock detail document content is not truly claim-specific. Backend content must come from authorized document metadata/files.
- Fraud/anomaly findings must be described as indications for review, never definitive fraud labels.
- Concurrency is currently absent. Review submission needs version checks to prevent overwriting another verifier's work.
- Decide whether dashboard data requires near-real-time aggregation or can tolerate short-lived caching.

## Smallest first backend milestone

Implement authenticated, read-only Verifikator claim access:

1. `users`, `facilities`, `patients`, and `claims` collections with synthetic seeds.
2. `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and logout.
3. Server-paginated/filterable `GET /api/v1/verificator/claims`.
4. `GET /api/v1/verificator/claims/:claimId` with administrative and coding data only.
5. Frontend adapter changes behind `VITE_USE_MOCK_API=false`, while preserving mock mode.

This milestone validates authentication, RBAC, MongoDB schemas, server filtering, pagination, and the existing service seam before introducing documents, screening results, or workflow-changing writes.
