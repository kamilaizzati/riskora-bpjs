const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');
const { generateId } = require('../utils/id-generator');

function getFindingsRepo(req) {
  return new JsonRepository('fraud-findings.json', req.app.get('dataDir'));
}
function getAuditRepo(req) {
  return new JsonRepository('audit-logs.json', req.app.get('dataDir'));
}

function getFindings(req, res, next) {
  try {
    const repo = getFindingsRepo(req);
    const { claimId, findingType, severity, status } = req.query;

    let findings = repo.findAll();

    if (claimId) {
      findings = findings.filter((f) => String(f.claimId) === String(claimId));
    }
    if (findingType) {
      findings = findings.filter((f) => f.findingType === findingType.toUpperCase());
    }
    if (severity) {
      findings = findings.filter((f) => f.severity === severity.toUpperCase());
    }
    if (status) {
      findings = findings.filter((f) => f.status === status.toUpperCase());
    }

    return res.status(200).json({ success: true, data: findings });
  } catch (err) {
    next(err);
  }
}

function getFindingById(req, res, next) {
  try {
    const repo = getFindingsRepo(req);
    const finding = repo.findById(req.params.id);
    if (!finding) {
      throw HttpError.notFound(`Finding with ID '${req.params.id}' not found`);
    }
    return res.status(200).json({ success: true, data: finding });
  } catch (err) {
    next(err);
  }
}

async function updateFinding(req, res, next) {
  try {
    const repo = getFindingsRepo(req);
    const audit = getAuditRepo(req);
    const existing = repo.findById(req.params.id);
    if (!existing) {
      throw HttpError.notFound(`Finding with ID '${req.params.id}' not found`);
    }

    const allowedStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
    const updates = {};

    if (req.body.status) {
      const st = req.body.status.toUpperCase();
      if (!allowedStatuses.includes(st)) {
        throw HttpError.badRequest(`Invalid status '${req.body.status}'. Allowed: ${allowedStatuses.join(', ')}`);
      }
      updates.status = st;
    }
    if (req.body.recommendedAction) {
      updates.recommendedAction = String(req.body.recommendedAction).trim();
    }

    const updated = await repo.update(req.params.id, updates);

    await audit.create({
      id: generateId('AUD'),
      entityType: 'finding',
      entityId: req.params.id,
      action: 'FINDING_STATUS_UPDATED',
      details: { updates },
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFindings,
  getFindingById,
  updateFinding
};
