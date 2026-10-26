const ReviewService = require('../services/review.service');
const { validateCreateReview } = require('../validators/review.validator');

function getReviewService(req) {
  return new ReviewService(req.app.get('dataDir'));
}

function getClaimReviews(req, res, next) {
  try {
    const service = getReviewService(req);
    const reviews = service.getClaimReviews(req.params.id);
    return res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

async function createClaimReview(req, res, next) {
  try {
    const validated = validateCreateReview(req.body);
    const service = getReviewService(req);
    const saved = await service.createClaimReview(req.params.id, validated);
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

async function reviewFinding(req, res, next) {
  try {
    const validated = validateCreateReview(req.body);
    const service = getReviewService(req);
    const result = await service.reviewFinding(req.params.id, validated);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getClaimReviews,
  createClaimReview,
  reviewFinding
};
