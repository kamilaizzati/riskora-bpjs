# Riskora — Backend Data Model (MVP)

## 1. Overview & Principles

Riskora uses structured JSON files as a lightweight persistence repository for the hackathon MVP.

- **Synthetic Demo Data**: All claims, facilities, patient record numbers, and documents are synthetic fixtures created for demonstration purposes. No real patient data is stored.
- **Separation of Concerns**: Risk scores and Riskora triage findings are strictly separated from official BPJS verification results. Riskora provides prioritization, not official claims adjudication or legal proof of fraud.
- **History Preservation**: Analysis runs, reviewer decisions, and audit events are stored as historical append records rather than being overwritten.
- **Single-Process Prototype Notice**: Local JSON file storage is built for single-instance, single-process execution with atomic write operations (`.tmp` + atomic rename) and an async write queue. It is not designed for concurrent multi-instance production deployment without migrating to an enterprise database (e.g., PostgreSQL).

---

## 2. Entity Relational Diagram

```text
facilities ──< claims >── submission_batches
                 ├──< claim-documents
                 ├──< analysis-runs ──< fraud-findings
                 ├──< claim-reviews
                 └──< verification-results

audit-logs (Cross-cutting write operations)
graph.json (Relationship network: claims, facilities, patients, diagnoses, procedures, groupers)
```

---

## 3. Entities & Schema Specifications

### A. Claims (`src/data/claims.json`)

The central entity representing a submitted healthcare insurance claim.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g. `66a1f8b1c200000000001001` or `CLM-...`) |
| `batchId` | `string` | Batch identifier linking to submission batches |
| `noSep` | `string` | Synthetic Surat Eligibilitas Peserta (SEP) number |
| `noRm` | `string` | Synthetic Medical Record number |
| `facilityId` | `string` | Foreign key referencing `facilities.id` |
| `facilityName` | `string` | Name of healthcare facility |
| `serviceType` | `string` | `INPATIENT` or `OUTPATIENT` |
| `serviceClass` | `string` | Service class or clinic unit (e.g. `Kls 1`, `ICU`, `Bedah`, `HD`) |
| `serviceDate` | `string` | Date of service (`YYYY-MM-DD`) |
| `admissionDate` | `string\|null` | Admission date for inpatient claims (`YYYY-MM-DD`) |
| `dischargeDate` | `string\|null` | Discharge date for inpatient claims (`YYYY-MM-DD`) |
| `lengthOfStayDays` | `number` | Length of stay in days (`0` for outpatient) |
| `primaryDiagnosis` | `object` | `{ code: string, description: string }` (ICD-10) |
| `secondaryDiagnoses` | `array` | Array of `{ code: string, description: string }` |
| `procedures` | `array` | Array of `{ code: string, description: string }` (ICD-9-CM) |
| `inacbgCode` | `string` | INA-CBG grouper tariff code |
| `claimAmount` | `number` | Claim amount in Indonesian Rupiah (IDR) |
| `requiredDocumentTypes` | `array` | Array of document types required for this case |
| `workflowStatus` | `string` | `SUBMITTED`, `UNDER_REVIEW`, `INVESTIGATION`, `COMPLETED` |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |
| `isDeleted` | `boolean` | Soft-delete flag |

#### Legacy Seed Mapping Reference
- `_id` &rarr; `id`
- `faskesNama` &rarr; `facilityName` & matched to `facilityId`
- `jenisPelayanan` &rarr; `serviceType` (`INPATIENT`/`OUTPATIENT`) + `serviceClass`
- `tglPelayanan` &rarr; `serviceDate`
- `losDays` &rarr; `lengthOfStayDays`
- `primaryIcd10` & `primaryDiagnosisTeks` &rarr; `primaryDiagnosis`
- `secondaryIcd10` &rarr; `secondaryDiagnoses`
- `procedureIcd9` &rarr; `procedures`
- `kodeGrouperInacbg` &rarr; `inacbgCode`
- `nilaiKlaim` &rarr; `claimAmount`

---

### B. Facilities (`src/data/facilities.json`)

Registered healthcare providers (Faskes).

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable facility ID (e.g. `FASKES-001`) |
| `name` | `string` | Hospital or clinic name |
| `facilityCode` | `string` | Synthetic facility code (e.g. `DEMO-001`) |
| `facilityType` | `string` | Facility classification (`hospital`, `clinic`) |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

---

### C. Claim Documents (`src/data/claim-documents.json`)

Metadata tracking for claim documentation.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Document ID (e.g. `DOC-0001`) |
| `claimId` | `string` | Foreign key referencing `claims.id` |
| `documentType` | `string` | `sep`, `patient_identity`, `discharge_summary`, `hospital_bill`, `inacbg_output`, `operation_report`, `control_letter`, `other` |
| `fileName` | `string\|null` | Filename metadata |
| `mimeType` | `string\|null` | MIME type (e.g. `application/pdf`) |
| `filePath` | `string\|null` | Metadata storage path |
| `documentStatus` | `string` | `UPLOADED`, `MISSING`, `PENDING_REVIEW`, `VERIFIED`, `REJECTED` |
| `isRequired` | `boolean` | Whether required for this claim case |
| `uploadedAt` | `string\|null` | ISO 8601 timestamp of upload |
| `reviewedAt` | `string\|null` | ISO 8601 timestamp of review |
| `reviewNotes` | `string\|null` | Verifier notes on document |

---

### D. Analysis Runs (`src/data/analysis-runs.json`)

Immutable record of each risk screening execution.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique run ID (e.g. `ANL-20261024-a1b2c3d4`) |
| `claimId` | `string` | Foreign key referencing `claims.id` |
| `riskScore` | `number` | Deterministic score (0–100) |
| `riskCategory` | `string` | `LOW` (0–29), `MEDIUM` (30–59), `HIGH` (60–100) |
| `scoringMethod` | `string` | `DETERMINISTIC_RULE_ENGINE` or `HISTORICAL_MOCK_BASELINE` |
| `ruleBreakdown` | `array` | Individual rule outcomes, score contributions, and evidence |
| `summary` | `string` | Executive triage summary |
| `limitations` | `array` | Known evaluation boundaries or missing reference datasets |
| `isMockResult` | `boolean` | `true` for initial seed baseline; `false` for fresh rule engine runs |
| `createdAt` | `string` | ISO 8601 timestamp |

---

### E. Fraud Findings (`src/data/fraud-findings.json`)

Risk indicators generated during analysis requiring manual verification.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Finding ID (e.g. `FND-20261024-e5f6g7h8`) |
| `claimId` | `string` | Foreign key referencing `claims.id` |
| `analysisRunId` | `string` | Foreign key referencing `analysis-runs.id` |
| `findingType` | `string` | `DUPLICATE_BILLING_INDICATOR`, `MISSING_REQUIRED_DOCUMENT`, `FIELD_INCONSISTENCY`, `CODING_REVIEW`, `TARIFF_REVIEW`, `LENGTH_OF_STAY_REVIEW`, `OTHER` |
| `severity` | `string` | `LOW`, `MEDIUM`, `HIGH` |
| `title` | `string` | Short title of indicator |
| `description` | `string` | Detailed finding description |
| `evidence` | `array` | Verifiable structured data points supporting the finding |
| `recommendedAction` | `string` | Suggested verification step for BPJS verifier |
| `status` | `string` | `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED` |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

---

### F. Claim Reviews (`src/data/claim-reviews.json`)

Audited human verifier triage actions.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Review ID (e.g. `REV-20261024-1a2b3c4d`) |
| `claimId` | `string` | Foreign key referencing `claims.id` |
| `findingId` | `string\|null` | Optional reference to specific finding |
| `reviewerId` | `string` | Verifier user identifier |
| `decision` | `string` | `NEEDS_INVESTIGATION`, `NO_ISSUE_FOUND`, `REQUEST_DOCUMENTS`, `ESCALATE` |
| `notes` | `string` | Verifier rationale and observations |
| `createdAt` | `string` | ISO 8601 timestamp |

---

### G. Submission Batches (`src/data/submission-batches.json`)

Mock internal records tracking claim batch ingestion.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Batch ID (e.g. `BATCH-202610-MONTHLY`) |
| `batchName` | `string` | Batch name description |
| `billingPeriod` | `string` | Period format (`YYYY-MM`) |
| `sourceType` | `string` | `MANUAL`, `E_CLAIM_IMPORT`, `VIRTUAL_CLAIM`, `JKN_DRIVE` |
| `claimIds` | `array` | Array of `claims.id` members |
| `status` | `string` | Batch processing status |
| `createdAt` | `string` | ISO 8601 timestamp |

---

### H. Verification Results (`src/data/verification-results.json`)

Mock official verification status tracking.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Verification result ID |
| `claimId` | `string` | Foreign key referencing `claims.id` |
| `source` | `string` | Feedback origin (e.g. `mock_bpjs_feedback`) |
| `resultStatus` | `string` | `PASSED`, `PENDING`, `NOT_YET_RECEIVED` |
| `reason` | `string` | Explanation feedback |
| `recordedAt` | `string` | ISO 8601 timestamp |
| `isMockResult` | `boolean` | Always `true` for demo simulation |

---

### I. Audit Logs (`src/data/audit-logs.json`)

Security and operational audit trail for all data mutations.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Audit log ID (e.g. `AUD-...`) |
| `entityType` | `string` | `claim`, `document`, `finding`, `review`, `batch`, `system` |
| `entityId` | `string` | Target resource identifier |
| `action` | `string` | Action code (e.g. `CLAIM_ANALYSIS_EXECUTED`, `CLAIM_REVIEW_SUBMITTED`) |
| `details` | `object` | Context metadata (no secrets or sensitive PII) |
| `createdAt` | `string` | ISO 8601 timestamp |
