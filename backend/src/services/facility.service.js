const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');

class FacilityService {
  constructor(customDataDir = null) {
    this.facilitiesRepo = new JsonRepository('facilities.json', customDataDir);
    this.claimsRepo = new JsonRepository('claims.json', customDataDir);
    this.analysisRepo = new JsonRepository('analysis-runs.json', customDataDir);
  }

  getFacilities() {
    return this.facilitiesRepo.findAll();
  }

  getFacilityById(id) {
    const facility = this.facilitiesRepo.findById(id);
    if (!facility) {
      throw HttpError.notFound(`Facility with ID '${id}' not found`);
    }
    return facility;
  }

  getFacilityClaims(facilityId) {
    this.getFacilityById(facilityId); // ensure existence
    return this.claimsRepo.findAll(
      (c) => !c.isDeleted && String(c.facilityId) === String(facilityId)
    );
  }

  getFacilitySummary(facilityId) {
    const facility = this.getFacilityById(facilityId);
    const claims = this.getFacilityClaims(facilityId);

    const totalClaims = claims.length;
    let totalClaimAmount = 0;
    let inpatientCount = 0;
    let outpatientCount = 0;

    for (const c of claims) {
      totalClaimAmount += (c.claimAmount || 0);
      if (c.serviceType === 'INPATIENT') inpatientCount++;
      else outpatientCount++;
    }

    const averageClaimAmount = totalClaims > 0 ? Math.round(totalClaimAmount / totalClaims) : 0;

    return {
      facility,
      statistics: {
        totalClaims,
        totalClaimAmount,
        averageClaimAmount,
        inpatientClaims: inpatientCount,
        outpatientClaims: outpatientCount
      },
      note: 'Statistik dihitung murni secara faktual dari dataset internal demo tanpa klasifikasi anomali sepihak.'
    };
  }
}

module.exports = FacilityService;
