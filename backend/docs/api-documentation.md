# Riskora — REST API Documentation

Base URL: `http://localhost:5000/api`

## Standard Envelopes

### Success Response Envelope
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Claim with ID '66a1f8b1c200000000001999' not found",
    "details": null
  }
}
```

---

## 1. Health

### `GET /api/health`
Returns system status, service name, version, and server uptime.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "riskora-backend",
    "timestamp": "2026-10-24T21:40:00.000Z",
    "uptimeSeconds": 42,
    "version": "1.0.0",
    "environment": "development"
  }
}
```

---

## 2. Dashboard

### `GET /api/dashboard/summary`
Calculates dynamic counts and aggregate financial figures from active records.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalClaims": 20,
    "totalClaimAmount": 268950000,
    "totalFacilities": 12,
    "highRiskClaims": 6,
    "mediumRiskClaims": 4,
    "lowRiskClaims": 10,
    "totalFindings": 15,
    "openFindings": 10,
    "totalReviews": 9,
    "workflowDistribution": {
      "submitted": 6,
      "underReview": 4,
      "investigation": 6,
      "completed": 4
    }
  }
}
```

### `GET /api/dashboard/risk-distribution`
Returns claim count and financial total grouped by risk category (`HIGH`, `MEDIUM`, `LOW`).

### `GET /api/dashboard/finding-distribution`
Returns findings categorized by `findingType`, `severity`, and `status`.

### `GET /api/dashboard/recent-activity?limit=10`
Returns the most recent system audit log events.

---

## 3. Claims

### `GET /api/claims`
List claims with pagination, sorting, and filtering.

**Query Parameters:**
- `page` (`integer`, default `1`)
- `limit` (`integer`, default `10`, max `100`)
- `sortBy` (`createdAt`, `serviceDate`, `claimAmount`, `riskScore`, default `createdAt`)
- `sortOrder` (`asc`, `desc`, default `desc`)
- `riskCategory` (`HIGH`, `MEDIUM`, `LOW`)
- `workflowStatus` (`SUBMITTED`, `UNDER_REVIEW`, `INVESTIGATION`, `COMPLETED`)
- `serviceType` (`INPATIENT`, `OUTPATIENT`)
- `facilityId` (e.g. `FASKES-001`)
- `search` (Search query across SEP, RM, facility name, diagnosis)
- `dateFrom` (`YYYY-MM-DD`)
- `dateTo` (`YYYY-MM-DD`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "66a1f8b1c200000000001001",
      "batchId": "BATCH-202610-MONTHLY",
      "noSep": "0182R0011026V001",
      "noRm": "RM-2026-889-321",
      "facilityId": "FASKES-001",
      "facilityName": "RSUP Dr. Sardjito",
      "serviceType": "INPATIENT",
      "serviceClass": "Kls 1",
      "serviceDate": "2026-10-23",
      "lengthOfStayDays": 4,
      "primaryDiagnosis": {
        "code": "I63.9",
        "description": "Stroke Iskemik Akut"
      },
      "secondaryDiagnoses": [
        { "code": "I10", "description": "" },
        { "code": "G45.9", "description": "" }
      ],
      "procedures": [
        { "code": "88.56", "description": "" }
      ],
      "inacbgCode": "I-4-10-III",
      "claimAmount": 18450000,
      "workflowStatus": "INVESTIGATION",
      "latestAnalysis": {
        "analysisRunId": "ANL-66a1f8b1c200000000001001",
        "riskScore": 89,
        "riskCategory": "HIGH",
        "scoringMethod": "HISTORICAL_MOCK_BASELINE",
        "isMockResult": true,
        "createdAt": "2026-10-23T08:00:00.000Z"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalRecords": 20,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### `GET /api/claims/:id`
Fetch single claim record by ID.

### `POST /api/claims`
Create a new synthetic claim record.

**Request Body:**
```json
{
  "noSep": "0182R0011026V999",
  "noRm": "RM-2026-999-001",
  "facilityId": "FASKES-001",
  "serviceType": "INPATIENT",
  "serviceDate": "2026-10-24",
  "claimAmount": 15000000,
  "primaryDiagnosis": {
    "code": "I25.1",
    "description": "Atherosclerotic heart disease"
  },
  "lengthOfStayDays": 3
}
```
**Response (201 Created)**

### `PATCH /api/claims/:id`
Update an existing claim's fields.

### `DELETE /api/claims/:id`
Soft-deletes the claim (`isDeleted: true`).

### `GET /api/claims/:id/documents`
List document metadata associated with the specified claim.

### `GET /api/claims/:id/analysis`
List all analysis execution runs for this claim (chronological history).

### `GET /api/claims/:id/findings`
List risk findings generated for this claim.

### `POST /api/claims/:id/analyze`
Executes the local deterministic risk engine pipeline against the claim, persists a new analysis run record in `analysis-runs.json`, generates finding records in `fraud-findings.json`, and records an audit log.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "analysisRun": {
      "id": "ANL-20261024-3f8d",
      "claimId": "66a1f8b1c200000000001001",
      "riskScore": 20,
      "riskCategory": "LOW",
      "scoringMethod": "DETERMINISTIC_RULE_ENGINE",
      "ruleBreakdown": [
        {
          "ruleId": "DUPLICATE_BILLING_CHECK",
          "name": "Pemeriksaan Duplikasi Tagihan (Duplicate Billing)",
          "status": "PASS",
          "scoreContribution": 0,
          "maxWeight": 30,
          "evidence": "Tidak ditemukan duplikasi SEP atau tagihan bertumpuk pada tanggal pelayanan yang sama."
        }
      ],
      "summary": "Klaim berisiko RENDAH (20/100).",
      "limitations": [
        "Evaluasi terbatas pada metadata klaim dan berkas demo yang tersedia."
      ],
      "isMockResult": false,
      "createdAt": "2026-10-24T21:40:00.000Z"
    },
    "findings": []
  }
}
```

---

## 4. Facilities

- `GET /api/facilities`: List all registered healthcare facilities.
- `GET /api/facilities/:id`: Get facility details by ID.
- `GET /api/facilities/:id/claims`: List claims submitted by this facility.
- `GET /api/facilities/:id/summary`: Factual metrics (total claims, total value, average claim, inpatient vs outpatient ratio).

---

## 5. Documents

- `GET /api/documents`: List document metadata with optional `?claimId=...`.
- `GET /api/documents/:id`: Document metadata detail.
- `POST /api/claims/:id/documents`: Attach document metadata to a claim.
- `PATCH /api/documents/:id`: Update document metadata (e.g. status `VERIFIED`, `REJECTED`, or `reviewNotes`).

---

## 6. Findings

- `GET /api/findings`: List findings. Filterable by `claimId`, `findingType`, `severity`, `status`.
- `GET /api/findings/:id`: Get finding detail.
- `PATCH /api/findings/:id`: Update finding status (`OPEN`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`).

---

## 7. Reviews

- `GET /api/claims/:id/reviews`: View complete verifier triage review history for a claim.
- `POST /api/claims/:id/reviews`: Submit a triage decision (`NEEDS_INVESTIGATION`, `NO_ISSUE_FOUND`, `REQUEST_DOCUMENTS`, `ESCALATE`) with mandatory `notes`.
- `POST /api/findings/:id/review`: Submit a review action targeting a specific finding.

---

## 8. Submission Batches

- `GET /api/batches`: List mock ingestion batches.
- `GET /api/batches/:id`: Batch details and member claim IDs.
- `POST /api/batches`: Register a mock batch record.

---

## 9. Verification Results

- `GET /api/verification-results`: List simulated official verification outcomes.
- `GET /api/claims/:id/verification-results`: Verification feedback for specific claim.

---

## 10. Graph

- `GET /api/graph`: Returns entire node-edge relationship network (113 nodes, 105 edges).
- `GET /api/claims/:id/relationships`: Returns localized sub-graph centered on the specified claim.
