const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');

function getVerifRepo(req) {
  return new JsonRepository('verification-results.json', req.app.get('dataDir'));
}
function getClaimsRepo(req) {
  return new JsonRepository('claims.json', req.app.get('dataDir'));
}

function getVerificationResults(req, res, next) {
  try {
    const repo = getVerifRepo(req);
    const results = repo.findAll();
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

function getClaimVerificationResults(req, res, next) {
  try {
    const claimsRepo = getClaimsRepo(req);
    const claim = claimsRepo.findById(req.params.id);
    if (!claim || claim.isDeleted) {
      throw HttpError.notFound(`Claim with ID '${req.params.id}' not found`);
    }

    const repo = getVerifRepo(req);
    const results = repo.findAll((v) => String(v.claimId) === String(req.params.id));
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVerificationResults,
  getClaimVerificationResults
};
