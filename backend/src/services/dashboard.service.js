const JsonRepository = require('../repositories/json.repository');

class DashboardService {
  constructor(customDataDir = null) {
    this.claimsRepo = new JsonRepository('claims.json', customDataDir);
    this.analysisRepo = new JsonRepository('analysis-runs.json', customDataDir);
    this.findingsRepo = new JsonRepository('fraud-findings.json', customDataDir);
    this.reviewsRepo = new JsonRepository('claim-reviews.json', customDataDir);
    this.facilitiesRepo = new JsonRepository('facilities.json', customDataDir);
    this.auditRepo = new JsonRepository('audit-logs.json', customDataDir);
  }

  /**
   * Helper: Get map of latest analysis run per claim
   */
  _getLatestAnalysisMap() {
    const runs = this.analysisRepo.readAll();
    const map = new Map();
    for (const run of runs) {
      const existing = map.get(run.claimId);
      if (!existing || new Date(run.createdAt) > new Date(existing.createdAt)) {
        map.set(run.claimId, run);
      }
    }
    return map;
  }

  /**
   * GET /api/dashboard/summary
   */
  getSummary() {
    const claims = this.claimsRepo.findAll((c) => !c.isDeleted);
    const facilities = this.facilitiesRepo.findAll();
    const findings = this.findingsRepo.findAll();
    const reviews = this.reviewsRepo.findAll();
    const latestAnalysisMap = this._getLatestAnalysisMap();

    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let totalClaimAmount = 0;

    for (const claim of claims) {
      totalClaimAmount += (claim.claimAmount || 0);
      const analysis = latestAnalysisMap.get(claim.id);
      if (analysis) {
        if (analysis.riskCategory === 'HIGH') highRiskCount++;
        else if (analysis.riskCategory === 'MEDIUM') mediumRiskCount++;
        else lowRiskCount++;
      } else {
        lowRiskCount++;
      }
    }

    return {
      totalClaims: claims.length,
      totalClaimAmount,
      totalFacilities: facilities.length,
      highRiskClaims: highRiskCount,
      mediumRiskClaims: mediumRiskCount,
      lowRiskClaims: lowRiskCount,
      totalFindings: findings.length,
      openFindings: findings.filter((f) => f.status === 'OPEN').length,
      totalReviews: reviews.length,
      workflowDistribution: {
        submitted: claims.filter((c) => c.workflowStatus === 'SUBMITTED').length,
        underReview: claims.filter((c) => c.workflowStatus === 'UNDER_REVIEW').length,
        investigation: claims.filter((c) => c.workflowStatus === 'INVESTIGATION').length,
        completed: claims.filter((c) => c.workflowStatus === 'COMPLETED').length
      }
    };
  }

  /**
   * GET /api/dashboard/risk-distribution
   */
  getRiskDistribution() {
    const claims = this.claimsRepo.findAll((c) => !c.isDeleted);
    const latestAnalysisMap = this._getLatestAnalysisMap();

    const distribution = {
      HIGH: { count: 0, totalAmount: 0, percentage: 0 },
      MEDIUM: { count: 0, totalAmount: 0, percentage: 0 },
      LOW: { count: 0, totalAmount: 0, percentage: 0 }
    };

    let totalClaims = claims.length;

    for (const claim of claims) {
      const analysis = latestAnalysisMap.get(claim.id);
      const category = (analysis && analysis.riskCategory) ? analysis.riskCategory : 'LOW';
      const amount = claim.claimAmount || 0;

      if (distribution[category]) {
        distribution[category].count++;
        distribution[category].totalAmount += amount;
      }
    }

    if (totalClaims > 0) {
      distribution.HIGH.percentage = Math.round((distribution.HIGH.count / totalClaims) * 100);
      distribution.MEDIUM.percentage = Math.round((distribution.MEDIUM.count / totalClaims) * 100);
      distribution.LOW.percentage = Math.round((distribution.LOW.count / totalClaims) * 100);
    }

    return {
      totalClaims,
      categories: distribution
    };
  }

  /**
   * GET /api/dashboard/finding-distribution
   */
  getFindingDistribution() {
    const findings = this.findingsRepo.findAll();

    const byType = {};
    const bySeverity = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    const byStatus = {
      OPEN: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      DISMISSED: 0
    };

    for (const f of findings) {
      const type = f.findingType || 'OTHER';
      byType[type] = (byType[type] || 0) + 1;

      const severity = (f.severity || 'LOW').toUpperCase();
      if (bySeverity[severity] !== undefined) {
        bySeverity[severity]++;
      }

      const status = (f.status || 'OPEN').toUpperCase();
      if (byStatus[status] !== undefined) {
        byStatus[status]++;
      }
    }

    return {
      totalFindings: findings.length,
      byType,
      bySeverity,
      byStatus
    };
  }

  /**
   * GET /api/dashboard/recent-activity
   */
  getRecentActivity(limit = 10) {
    const logs = this.auditRepo.findAll();
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return logs.slice(0, limit);
  }
}

module.exports = DashboardService;
