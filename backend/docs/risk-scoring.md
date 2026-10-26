# Riskora — Deterministic Rule Engine & Risk Scoring Methodology

## 1. Core Philosophy

The Riskora risk scoring engine evaluates healthcare insurance claims using a **100% deterministic, transparent, and auditable rule system**.

### What Riskora Is
- An automated triage and prioritization tool to help BPJS claim verifiers focus limited review time on claims exhibiting clinical, administrative, or structural inconsistencies.
- A transparent checklist providing traceable evidence for each triggered indicator.

### What Riskora Is NOT
- **Not legal proof of fraud**: An indicator represents an administrative anomaly or potential coding issue requiring manual human review.
- **Not an automated adjudication engine**: Riskora never rejects a claim automatically. All formal decisions remain with certified human verifiers.
- **Not a black-box AI**: Scoring runs entirely offline without non-deterministic heuristics or hallucinated evidence.

---

## 2. Configurable Prototype Scoring Model

All rule weights, score bands, and thresholds are centralized in `src/config/risk-rules.config.js`.

### Score Bands

| Category | Score Range | Meaning | Suggested Verifier Action |
|---|---|---|---|
| **LOW** | 0 – 29 | Normal administrative profile; no significant anomalies detected | Expedited review / Standard spot-check |
| **MEDIUM** | 30 – 59 | One or more moderate administrative or document discrepancies | Request supporting documents / Clarification |
| **HIGH** | 60 – 100 | Multiple compounding indicators or critical duplicate billing signals | Full clinical & audit investigation |

### Maximum Score Contributions (Total = 100)

| Rule ID | Rule Name | Max Weight | Description |
|---|---|---|---|
| `DUPLICATE_BILLING_CHECK` | Duplicate Billing Indicator | **30 pts** | Duplicate SEP or same-patient same-day overlapping procedure |
| `MISSING_REQUIRED_DOCUMENT_CHECK` | Missing Required Documents | **20 pts** | Mandatory required document explicitly marked MISSING or REJECTED |
| `FIELD_INCONSISTENCY_CHECK` | Field Inconsistency Check | **20 pts** | Contradictions between admission/discharge dates or zero-day inpatient |
| `CODING_TARIFF_CHECK` | Coding & Tariff Anomaly | **15 pts** | Extreme outpatient claim amount without procedural documentation |
| `LENGTH_OF_STAY_CHECK` | Length of Stay (LOS) Anomaly | **10 pts** | LOS exceeding demonstrative ICU/inpatient baseline thresholds |
| `MULTI_INDICATOR_COMPOUNDING` | Multi-Indicator Amplification | **5 pts** | Compounding bonus when &ge; 2 independent indicators trigger |

---

## 3. Critical Safeguards & Ethical Rules

1. **Duplicate Billing Safeguards**:
   - A repeated patient Medical Record number (`noRm`) alone **NEVER** flags duplicate billing. Patients naturally have multiple valid hospital visits across time.
   - Triggers strictly on:
     - Exact match on `noSep` across different active claims; OR
     - Same patient `noRm` + same `serviceDate` + overlapping primary diagnosis or procedure.
2. **Missing Document Safeguards**:
   - Only evaluated when the required document checklist for the claim's `serviceType` is known.
   - If document metadata is absent or unlinked, the rule returns `NOT_EVALUATED`, **NEVER** assuming documents are missing.
   - Conditional requirements apply (e.g. `operation_report` is only required when surgical procedures are present).
3. **Field Inconsistency Comparison**:
   - Compares fields only when both values exist.
   - E.g. checks that `admissionDate` is not later than `dischargeDate`, or that `INPATIENT` does not have 0 days stay without an emergency transfer note.
4. **Tariff and Coding Limits**:
   - Does not invent unofficial ICD coding rules.
   - Returns `NOT_EVALUATED` with explicit reason when regional baseline benchmarks are not loaded.
5. **Score Capping & Explainability**:
   - Score is strictly clamped between `0` and `100`.
   - Every point contributed must map to an individual rule breakdown item with verifiable evidence.
   - Clean claims with zero triggered indicators produce score `0`, category `LOW`, and an empty findings array.

---

## 4. Configuration Guide

To adjust weights or thresholds, edit `src/config/risk-rules.config.js`:

```javascript
module.exports = {
  scoreBands: {
    LOW: { min: 0, max: 29 },
    MEDIUM: { min: 30, max: 59 },
    HIGH: { min: 60, max: 100 }
  },
  weights: {
    duplicateBilling: 30,
    missingRequiredDocument: 20,
    fieldInconsistency: 20,
    codingOrTariffAnomaly: 15,
    lengthOfStayAnomaly: 10,
    multipleIndicatorsBonus: 5
  },
  thresholds: {
    los: {
      outpatientMaxDays: 0,
      inpatientStandardMaxDays: 14,
      inpatientIcuMaxDays: 10
    },
    multipleIndicatorsMinCount: 2
  }
};
```

---

## 5. Gemini API Integration Roadmap (Next Phase)

In the upcoming development phase, Gemini will be connected as an **explainability and summarization assistant**, adhering to these boundaries:
1. Gemini will receive the deterministic rule output and summarize clinical documentation.
2. Gemini will **NOT** generate arbitrary risk scores or override the rule engine.
3. Patient identifiable information (PII) will be sanitized before any AI prompt dispatch.
