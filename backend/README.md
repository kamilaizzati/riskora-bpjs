# Riskora Backend Foundation

> **Healthcare Insurance Claim Risk Screening Platform**  
> Designed to assist BPJS Kesehatan claim verifiers in prioritizing claims that require further clinical or administrative investigation.

---

## 1. Project Purpose & Scope

Riskora is a hackathon MVP providing an intelligent triage backend for healthcare claims. It evaluates claims against deterministic rules (e.g. duplicate billing, document completeness, field consistency, tariff thresholds, and length-of-stay bounds) to calculate a priority score from 0 to 100 and flag actionable risk indicators.

### Current Implementation Phase
- **Backend-First**: Fully functional Express.js REST API testable independently using Postman or automated test suites.
- **Zero External AI / Offline Execution**: Runs 100% locally with a deterministic rule engine. No external AI APIs (e.g. Gemini) are called during this phase.
- **Lightweight Local JSON Persistence**: Uses structured JSON files with atomic writes and write-serialization for local hackathon demo purposes without requiring MongoDB or PostgreSQL installation.
- **Demo Data Integrity**: Preserves and standardizes the 20 synthetic demo claims and relationship graph data.

---

## 2. Prerequisites

- **Node.js**: `v20.x` or higher (Tested on `v24.17.0`)
- **npm**: `v10.x` or higher (Tested on `11.13.0`)
- **Postman**, `curl`, or any standard HTTP client

---

## 3. Installation & Setup

1. **Clone or Navigate to the Repository**:
   ```bash
   cd d:/RISKORA
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   Default `.env` configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000,http://localhost:5173
   DATA_DIR=./src/data
   ```

---

## 4. Running the Server & Tests

### Start the Server (Production mode)
```bash
npm start
```

### Start the Server (Development auto-reload mode)
```bash
npm run dev
```
The server will start at `http://localhost:5000`.

### Run Automated Tests
```bash
npm test
```
Executes 48 automated unit and integration tests using Node's native test runner (`node --test`). All tests run in isolated sandboxes to guarantee development seed data is never corrupted.

---

## 5. Backend Architecture & Project Structure

```text
d:/RISKORA/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── docs/
│   ├── data-model.md           # Schema definitions and data relationships
│   ├── api-documentation.md    # Full REST endpoint reference
│   └── risk-scoring.md         # Deterministic rule engine details and safeguards
├── src/
│   ├── server.js               # HTTP server entrypoint
│   ├── app.js                  # Express app factory with middleware & route mounting
│   ├── config/
│   │   └── risk-rules.config.js # Centralized rule weights, score bands & thresholds
│   ├── controllers/            # Route controllers for all resource entities
│   │   ├── health.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── claim.controller.js
│   │   ├── facility.controller.js
│   │   ├── document.controller.js
│   │   ├── finding.controller.js
│   │   ├── review.controller.js
│   │   ├── batch.controller.js
│   │   ├── verification-result.controller.js
│   │   └── graph.controller.js
│   ├── routes/                 # Express route definitions
│   │   ├── health.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── claims.routes.js
│   │   ├── facilities.routes.js
│   │   ├── documents.routes.js
│   │   ├── findings.routes.js
│   │   ├── reviews.routes.js
│   │   ├── batches.routes.js
│   │   ├── verification-results.routes.js
│   │   └── graph.routes.js
│   ├── services/               # Business logic & repository orchestration
│   │   ├── claim.service.js
│   │   ├── dashboard.service.js
│   │   ├── facility.service.js
│   │   ├── document.service.js
│   │   ├── risk-engine.service.js # Deterministic rule engine
│   │   ├── review.service.js
│   │   └── graph.service.js
│   ├── repositories/
│   │   └── json.repository.js  # Safe atomic JSON repository with write serialization
│   ├── validators/             # Request payload and query parameter validators
│   │   ├── query.validator.js
│   │   ├── claim.validator.js
│   │   ├── review.validator.js
│   │   └── document.validator.js
│   ├── middleware/
│   │   ├── error-handler.js    # Centralized error responses
│   │   └── not-found.js        # 404 handler
│   ├── utils/
│   │   ├── http-error.js       # Custom HttpError class
│   │   └── id-generator.js     # Prefixed crypto UUID generator
│   └── data/                   # Standardized JSON data store
│       ├── claims.json
│       ├── facilities.json
│       ├── claim-documents.json
│       ├── analysis-runs.json
│       ├── fraud-findings.json
│       ├── claim-reviews.json
│       ├── submission-batches.json
│       ├── verification-results.json
│       ├── graph.json
│       └── audit-logs.json
└── tests/                      # Automated test suite
    ├── helpers/test-env.js     # Sandbox fixture isolation helper
    ├── health.test.js
    ├── claims.test.js
    ├── endpoints.test.js
    ├── risk-engine.test.js
    ├── reviews.test.js
    └── json-repository.test.js
```

---

## 6. Available API Endpoints

| Category | Method | Path | Description |
|---|---|---|---|
| **Health** | `GET` | `/api/health` | Service uptime and status check |
| **Dashboard** | `GET` | `/api/dashboard/summary` | Aggregate metrics and financial counts |
| | `GET` | `/api/dashboard/risk-distribution` | Claims grouped by risk category |
| | `GET` | `/api/dashboard/finding-distribution` | Findings grouped by type, severity, and status |
| | `GET` | `/api/dashboard/recent-activity` | Chronological audit events |
| **Claims** | `GET` | `/api/claims` | Paginated, filterable claim records |
| | `GET` | `/api/claims/:id` | Claim detail by ID |
| | `POST` | `/api/claims` | Create a new claim record |
| | `PATCH` | `/api/claims/:id` | Update claim record |
| | `DELETE` | `/api/claims/:id` | Soft-delete claim (`isDeleted: true`) |
| | `GET` | `/api/claims/:id/documents` | Claim document checklist |
| | `GET` | `/api/claims/:id/analysis` | Historical analysis runs |
| | `GET` | `/api/claims/:id/findings` | Triage risk findings |
| | `POST` | `/api/claims/:id/analyze` | Run local risk engine & generate findings |
| **Facilities** | `GET` | `/api/facilities` | List all healthcare facilities |
| | `GET` | `/api/facilities/:id` | Facility detail |
| | `GET` | `/api/facilities/:id/claims` | Claims submitted by facility |
| | `GET` | `/api/facilities/:id/summary` | Factual facility statistics |
| **Documents** | `GET` | `/api/documents` | Document metadata (optional `?claimId=...`) |
| | `GET` | `/api/documents/:id` | Single document metadata |
| | `POST` | `/api/claims/:id/documents` | Attach document metadata to claim |
| | `PATCH` | `/api/documents/:id` | Update document review status or notes |
| **Findings** | `GET` | `/api/findings` | List findings (filter by severity/type/status) |
| | `GET` | `/api/findings/:id` | Finding detail |
| | `PATCH` | `/api/findings/:id` | Update finding status |
| **Reviews** | `GET` | `/api/claims/:id/reviews` | Claim triage review history |
| | `POST` | `/api/claims/:id/reviews` | Submit verifier triage decision |
| | `POST` | `/api/findings/:id/review` | Submit review for specific finding |
| **Batches** | `GET` | `/api/batches` | List mock submission batches |
| | `GET` | `/api/batches/:id` | Batch detail and member claims |
| | `POST` | `/api/batches` | Register mock batch |
| **Verification** | `GET` | `/api/verification-results` | Simulated verification outcomes |
| | `GET` | `/api/claims/:id/verification-results` | Simulated feedback for claim |
| **Graph** | `GET` | `/api/graph` | Complete demo relationship graph |
| | `GET` | `/api/claims/:id/relationships` | Localized ego-network for claim |

---

## 7. Example Postman Requests

### 1. List Claims with Filtering & Pagination
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/claims?page=1&limit=5&riskCategory=HIGH&sortBy=claimAmount&sortOrder=desc`
- **Response**: Returns paginated claims with latest risk analysis attached and metadata.

### 2. Run Local Risk Analysis on Claim
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/claims/66a1f8b1c200000000001001/analyze`
- **Headers**: `Content-Type: application/json`
- **Response**:
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
        "ruleBreakdown": [ ... ],
        "summary": "Klaim berprioritas pemeriksaan...",
        "isMockResult": false
      },
      "findings": [ ... ]
    }
  }
  ```

### 3. Submit Verifier Triage Review
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/claims/66a1f8b1c200000000001001/reviews`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "decision": "NEEDS_INVESTIGATION",
    "notes": "Medical resume indicates procedure was performed, but anesthesia notes are missing.",
    "reviewerId": "USR-VERIFIER-01"
  }
  ```

---

## 8. Data Storage Limitations & Production Considerations

- **Single-Process Prototype**: Storage uses local JSON files managed by `JsonRepository`. Writes are serialized via an in-memory queue and written atomically to prevent partial corruptions.
- **Concurrency Warning**: Not designed for multi-instance horizontal scaling (e.g. multi-container Kubernetes deployments) because file locks are process-local.
- **Production Migration**: In a production environment, this layer should be replaced with an ACID relational database (e.g., PostgreSQL with pgvector) or document store.

---

## 9. Synthetic Data Disclaimer

All claims, patient IDs, medical record numbers (`noRm`), SEP numbers (`noSep`), and hospital details in this repository are **strictly synthetic demonstration data**. No Protected Health Information (PHI) or real BPJS participant data is contained within this repository.

---

## 10. Roadmap: Future Gemini API Integration

The backend is architected to cleanly receive the Gemini API in the subsequent development stage:
1. **Explainability Layer**: Integrate Gemini 1.5/2.0 to provide natural-language summaries of why a deterministic rule triggered, without letting the LLM invent raw scores.
2. **Medical Document Summarization**: Connect Gemini Multimodal Vision to extract diagnostic summaries from uploaded PDF medical resumes and compare them against ICD codes.
3. **Data Sanitization**: Implement a PII redactor pipeline before sending any payload to external AI endpoints.
