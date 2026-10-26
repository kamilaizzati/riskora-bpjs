const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');
const { generateId } = require('../utils/id-generator');

class ReviewService {
  constructor(customDataDir = null) {
    this.reviewsRepo = new JsonRepository('claim-reviews.json', customDataDir);
    this.claimsRepo = new JsonRepository('claims.json', customDataDir);
    this.findingsRepo = new JsonRepository('fraud-findings.json', customDataDir);
    this.auditRepo = new JsonRepository('audit-logs.json', customDataDir);
  }

  getClaimReviews(claimId) {
    const claim = this.claimsRepo.findById(claimId);
    if (!claim || claim.isDeleted) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found`);
    }

    const reviews = this.reviewsRepo.findAll((r) => String(r.claimId) === String(claimId));
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return reviews;
  }

  async createClaimReview(claimId, payload) {
    const claim = this.claimsRepo.findById(claimId);
    if (!claim || claim.isDeleted) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found`);
    }

    const reviewId = generateId('REV');
    const now = new Date().toISOString();

    const review = {
      id: reviewId,
      claimId,
      findingId: payload.findingId || null,
      reviewerId: payload.reviewerId || 'USR-VERIFIER-01',
      decision: payload.decision,
      notes: payload.notes,
      createdAt: now
    };

    const saved = await this.reviewsRepo.create(review);

    // Update claim workflowStatus according to review decision if appropriate
    let newWorkflowStatus = claim.workflowStatus;
    if (payload.decision === 'NEEDS_INVESTIGATION' || payload.decision === 'ESCALATE') {
      newWorkflowStatus = 'INVESTIGATION';
    } else if (payload.decision === 'REQUEST_DOCUMENTS') {
      newWorkflowStatus = 'UNDER_REVIEW';
    } else if (payload.decision === 'NO_ISSUE_FOUND') {
      newWorkflowStatus = 'COMPLETED';
    }

    if (newWorkflowStatus !== claim.workflowStatus) {
      await this.claimsRepo.update(claimId, { workflowStatus: newWorkflowStatus });
    }

    // Record audit event
    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'review',
      entityId: reviewId,
      action: 'CLAIM_REVIEW_SUBMITTED',
      details: { claimId, decision: payload.decision, reviewerId: review.reviewerId },
      createdAt: now
    });

    return saved;
  }

  async reviewFinding(findingId, payload) {
    const finding = this.findingsRepo.findById(findingId);
    if (!finding) {
      throw HttpError.notFound(`Finding with ID '${findingId}' not found`);
    }

    const reviewId = generateId('REV');
    const now = new Date().toISOString();

    const review = {
      id: reviewId,
      claimId: finding.claimId,
      findingId,
      reviewerId: payload.reviewerId || 'USR-VERIFIER-01',
      decision: payload.decision,
      notes: payload.notes,
      createdAt: now
    };

    const saved = await this.reviewsRepo.create(review);

    // Update finding status based on decision
    let findingStatus = 'UNDER_REVIEW';
    if (payload.decision === 'NO_ISSUE_FOUND') {
      findingStatus = 'DISMISSED';
    } else if (payload.decision === 'NEEDS_INVESTIGATION' || payload.decision === 'ESCALATE') {
      findingStatus = 'UNDER_REVIEW';
    }

    await this.findingsRepo.update(findingId, {
      status: findingStatus,
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'finding',
      entityId: findingId,
      action: 'FINDING_REVIEWED',
      details: { findingId, decision: payload.decision, findingStatus },
      createdAt: now
    });

    return {
      review: saved,
      findingStatus
    };
  }
}

module.exports = ReviewService;
