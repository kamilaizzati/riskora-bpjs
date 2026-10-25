# RISKORA Backend Implementation Checklist

This checklist intentionally stops at planning. No backend code should be created until the plan is approved.

## Phase 0 — Decisions and contract freeze

- [ ] Confirm the backend base path (`/api/v1`).
- [ ] Decide whether `/verifier/claims/:claimId` will be renamed to `/verificator/claims/:claimId`; plan a frontend redirect if renamed.
- [ ] Approve machine enums for role, claim status, review decision, risk level, anomaly type, document type, and screening outcome.
- [ ] Define the business meaning of `completed` and confirm it is not an official BPJS adjudication state.
- [ ] Confirm who may resolve `needs_investigation`.
- [ ] Confirm the Faskes correction/resubmission lifecycle.
- [ ] Confirm which review text is internal and which becomes `correctionInstructions`.
- [ ] Decide session strategy (recommended: secure HTTP-only cookie).
- [ ] Define development data policy: synthetic data only.
- [ ] Mark prototype INA-CBG codes/tariffs as unvalidated seed values.

## Phase 1 — Contract fixtures

- [ ] Create normalized JSON fixtures for one queue page.
- [ ] Create a normalized claim-detail fixture.
- [ ] Create document metadata fixtures without real files or patient data.
- [ ] Create a screening-result fixture with stable finding/evidence IDs.
- [ ] Create draft and submitted review request/response fixtures.
- [ ] Create standard success envelope fixtures (`data`, `meta`).
- [ ] Create standard error envelope fixtures (`error.code`, `error.message`, `error.details`).
- [ ] Define validation errors for invalid filters, invalid transitions, unauthorized access, missing records, and version conflicts.
- [ ] Document maximum `pageSize` and allowed sort keys.

## Phase 2 — Backend foundation

- [ ] Initialize the backend only after approval.
- [ ] Add environment validation for MongoDB URI, cookie/token secrets, allowed origins, and runtime mode.
- [ ] Add structured request logging with sensitive-field redaction.
- [ ] Add centralized error handling and request IDs.
- [ ] Add `/health/live` and `/health/ready` endpoints.
- [ ] Add graceful startup/shutdown and database connection handling.
- [ ] Add unit and integration test setup.
- [ ] Configure CORS and CSRF protection for the selected session strategy.
- [ ] Add rate-limit policy for authentication and sensitive endpoints.

## Phase 3 — MongoDB schemas and indexes

- [ ] Implement `users` schema and unique normalized-email index.
- [ ] Implement `facilities` schema and unique facility-code index.
- [ ] Implement minimal pseudonymous `patients` schema and compound identity index.
- [ ] Implement `claims` schema with diagnoses, procedures, submitted INA-CBG provenance, version, and timestamps.
- [ ] Add claim queue indexes for status, risk, facility, service date, and update time.
- [ ] Implement `claim_documents` metadata schema; keep binary files outside MongoDB.
- [ ] Implement immutable `screening_results` schema and indexes.
- [ ] Implement `verification_reviews` schema and active-draft constraint.
- [ ] Implement immutable `audit_events` before enabling workflow writes.
- [ ] Add schema validation tests for all enums and required fields.

## Phase 4 — Synthetic seed migration

- [ ] Import the 10 deterministic reference claims as acceptance-test records.
- [ ] Import the 76 generated claims for pagination/filter testing.
- [ ] Normalize anomaly labels to machine IDs.
- [ ] Split facility metadata into facility records.
- [ ] Split care display strings into structured fields.
- [ ] Normalize diagnosis fields into `diagnoses[]`.
- [ ] Generate stable synthetic facility IDs.
- [ ] Generate pseudonymous synthetic patient IDs and safe cross-claim relationships.
- [ ] Generate one fully populated detail fixture with document metadata and screening findings.
- [ ] Attach `source: seed_unvalidated` to prototype INA-CBG data.
- [ ] Verify no seed contains real patient data or credentials.
- [ ] Make the seed idempotent and safe to rerun in development.

## Phase 5 — Authentication and authorization

- [ ] Store password hashes only.
- [ ] Implement admin/invitation-only Verifikator account creation.
- [ ] Implement `POST /api/v1/auth/login`.
- [ ] Implement `GET /api/v1/auth/me`.
- [ ] Implement refresh/session renewal if required.
- [ ] Implement logout and session revocation.
- [ ] Enforce `verificator` role on every Verifikator endpoint.
- [ ] Enforce facility ownership on every Faskes endpoint.
- [ ] Add brute-force protection and audit failed logins.
- [ ] Test horizontal and vertical privilege escalation attempts.
- [ ] Ensure no internal notes or fraud analysis appear in Faskes serializers.

## Phase 6 — Smallest first milestone: read-only claims

- [ ] Implement `GET /api/v1/verificator/claims`.
- [ ] Validate `q`, `status`, `riskLevel`, `anomalyType`, date range, page, pageSize, and sort.
- [ ] Return server-side pagination metadata.
- [ ] Return filter facets for quick-filter counts.
- [ ] Implement `GET /api/v1/verificator/claims/:claimId`.
- [ ] Return `404 CLAIM_NOT_FOUND` without leaking unauthorized record existence.
- [ ] Add integration tests for search and every current frontend filter.
- [ ] Add integration tests for pagination boundaries and empty results.
- [ ] Add authorization tests.
- [ ] Update `apiClient` later to attach credentials and support normalized errors.
- [ ] Update `claimsService` later to serialize filters and unwrap the response envelope.
- [ ] Update `claimDetailService` later to map the normalized detail response.
- [ ] Verify `VITE_USE_MOCK_API=true` remains unchanged and functional.
- [ ] Verify `VITE_USE_MOCK_API=false` uses the backend without page-module rewrites.

## Phase 7 — Documents and screening reads

- [ ] Select object storage and define retention/deletion rules.
- [ ] Add upload malware scanning and MIME validation design.
- [ ] Implement claim-document metadata listing.
- [ ] Implement authorized streaming or short-lived content URLs.
- [ ] Log document access.
- [ ] Implement current screening-result read.
- [ ] Return stable evidence references (`documentId`, page, anchor/bounding box).
- [ ] Replace hardcoded document body only when safe synthetic files are available.
- [ ] Remove index-derived anomaly percentages from the Fraud UI once stored scores exist.
- [ ] Test missing documents, failed OCR, partial screening results, and unauthorized content access.

## Phase 8 — Review persistence and lifecycle

- [ ] Implement review-draft upsert.
- [ ] Keep draft saves from changing claim status.
- [ ] Implement final review submission.
- [ ] Require `correctionInstructions` when decision is `correction`.
- [ ] Require internal notes when decision is `investigation` if product confirms this rule.
- [ ] Perform review creation and claim transition atomically.
- [ ] Enforce allowed status transitions.
- [ ] Add optimistic concurrency using `claimVersion`.
- [ ] Add idempotency for final submissions.
- [ ] Write immutable audit events for every transition.
- [ ] Return updated claim/review state after a successful write.
- [ ] Update `AIReviewPanel` later to use a review adapter instead of localStorage.
- [ ] Preserve unsaved-draft warning behavior during frontend integration.

## Phase 9 — Dashboard aggregates

- [ ] Implement summary KPI aggregation from claims/reviews.
- [ ] Define “priority claim” ordering explicitly.
- [ ] Implement priority-claim endpoint with a bounded limit.
- [ ] Implement anomaly distribution from current screening results.
- [ ] Implement screening outcome distribution.
- [ ] Decide and implement short-lived caching if needed.
- [ ] Add reconciliation tests so KPI totals and queue filters agree.
- [ ] Update `verificatorService` later to unwrap normalized envelopes.

## Phase 10 — Analisis Fraud

- [ ] Implement anomaly summary counts from current screening results.
- [ ] Implement paginated claims-by-anomaly endpoint.
- [ ] Implement monthly trend aggregation.
- [ ] Ensure a finding is labeled as an indication, not confirmed fraud.
- [ ] Return stored/calculated screening scores with provenance; never synthesize percentages from row position.
- [ ] Add date/facility filters after authorization rules are confirmed.
- [ ] Update `FraudAnalysisPage` later to stop grouping the full queue in memory.
- [ ] Test categories with zero claims and missing trend periods.

## Phase 11 — Jaringan Anomali discovery

- [ ] Confirm page UX and graph library; current route is only a placeholder.
- [ ] Define allowed node types and edge types.
- [ ] Define privacy rules for patient/provider nodes and labels.
- [ ] Define graph size, depth, expansion, and truncation limits.
- [ ] Implement explainable MongoDB aggregation for one seed claim.
- [ ] Return a human-readable explanation for every derived edge.
- [ ] Benchmark aggregation with representative synthetic volume.
- [ ] Materialize `anomaly_relationships` only if measurements justify it.
- [ ] Do not introduce a graph database or GNN in the initial implementation.

## Phase 12 — Security, privacy, and operations

- [ ] Perform threat modeling for authentication, documents, notes, and cross-facility access.
- [ ] Redact SEP/patient identifiers in logs.
- [ ] Encrypt transport and production data at rest.
- [ ] Define backup and restore testing.
- [ ] Define retention and deletion policies.
- [ ] Add audit-log review procedures.
- [ ] Add dependency and secret scanning.
- [ ] Add API performance/error metrics without sensitive labels.
- [ ] Add load tests for queue pagination and dashboard aggregates.
- [ ] Add incident response and session revocation procedures.

## Definition of done for the first milestone

- [ ] A Verifikator can authenticate against the backend.
- [ ] Unauthorized and Faskes users cannot access Verifikator endpoints.
- [ ] The claim queue is searched, filtered, sorted, and paginated server-side.
- [ ] Claim detail administrative/coding data loads by stable claim ID.
- [ ] The React page modules remain visually unchanged.
- [ ] Mock mode still works without a backend.
- [ ] No real patient data is present.
- [ ] Prototype INA-CBG values are clearly unvalidated and never represented as Riskora-calculated grouping.
- [ ] Automated tests cover success, empty, validation, authorization, not-found, and database-error paths.
