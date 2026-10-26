const fs = require('fs');
const path = require('path');
const HttpError = require('../utils/http-error');
const JsonRepository = require('../repositories/json.repository');

class GraphService {
  constructor(customDataDir = null) {
    this.dataDir = customDataDir || process.env.DATA_DIR || path.join(__dirname, '../data');
    this.claimsRepo = new JsonRepository('claims.json', customDataDir);
  }

  _loadGraph() {
    const filePath = path.resolve(this.dataDir, 'graph.json');
    if (!fs.existsSync(filePath)) {
      throw HttpError.internal('Graph data file not found', 'GRAPH_DATA_MISSING');
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      throw HttpError.internal('Failed to parse graph data file', 'GRAPH_PARSE_ERROR');
    }
  }

  /**
   * GET /api/graph
   * Returns entire demo relationship graph
   */
  getGraph() {
    return this._loadGraph();
  }

  /**
   * GET /api/claims/:id/relationships
   * Returns the localized sub-graph centered around the specified claim
   */
  getClaimRelationships(claimId) {
    const claim = this.claimsRepo.findById(claimId);
    if (!claim || claim.isDeleted) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found`);
    }

    const fullGraph = this._loadGraph();
    const claimNodeId = `claim:${claimId}`;

    // Find direct claim node
    const claimNode = fullGraph.nodes.find(
      (n) => n.id === claimNodeId || n.claimId === claimId || (n.type === 'claim' && n.noSep === claim.noSep)
    );

    if (!claimNode) {
      // Return synthetic ego network constructed directly from claim record
      return this._buildClaimEgoNetwork(claim);
    }

    // Direct edges
    const directEdges = fullGraph.edges.filter(
      (e) => e.source === claimNode.id || e.target === claimNode.id
    );

    // Target node IDs directly connected to this claim
    const connectedNodeIds = new Set([claimNode.id]);
    for (const edge of directEdges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    // Secondary edges (e.g. other claims sharing the same patient or facility or diagnosis)
    const secondaryEdges = fullGraph.edges.filter(
      (e) =>
        (connectedNodeIds.has(e.source) || connectedNodeIds.has(e.target)) &&
        !directEdges.some((d) => d.id === e.id)
    );

    // Include secondary connected nodes (capped for clean visualization)
    const allNodeIds = new Set(connectedNodeIds);
    for (const edge of secondaryEdges.slice(0, 20)) {
      allNodeIds.add(edge.source);
      allNodeIds.add(edge.target);
    }

    const subNodes = fullGraph.nodes.filter((n) => allNodeIds.has(n.id));
    const allEdges = [...directEdges, ...secondaryEdges.slice(0, 20)];

    return {
      claimId,
      meta: {
        centerNodeId: claimNode.id,
        nodeCount: subNodes.length,
        edgeCount: allEdges.length,
        note: 'Relasi graph murni merepresentasikan kesamaan entitas (faskes, diagnosis, prosedur, nomor RM), bukan vonis kecurangan.'
      },
      nodes: subNodes,
      edges: allEdges
    };
  }

  _buildClaimEgoNetwork(claim) {
    const nodes = [
      { id: `claim:${claim.id}`, type: 'claim', label: claim.noSep, claimId: claim.id },
      { id: `facility:${claim.facilityName || claim.facilityId}`, type: 'facility', label: claim.facilityName || claim.facilityId },
      { id: `patient:${claim.noRm}`, type: 'patient', label: claim.noRm }
    ];
    const edges = [
      { id: `e_${claim.id}_fac`, source: `claim:${claim.id}`, target: `facility:${claim.facilityName || claim.facilityId}`, relation: 'SUBMITTED_TO' },
      { id: `e_${claim.id}_pt`, source: `claim:${claim.id}`, target: `patient:${claim.noRm}`, relation: 'ASSOCIATED_WITH_PATIENT' }
    ];

    if (claim.primaryDiagnosis?.code) {
      nodes.push({ id: `diag:${claim.primaryDiagnosis.code}`, type: 'diagnosis', label: `${claim.primaryDiagnosis.code} - ${claim.primaryDiagnosis.description || ''}` });
      edges.push({ id: `e_${claim.id}_diag`, source: `claim:${claim.id}`, target: `diag:${claim.primaryDiagnosis.code}`, relation: 'PRIMARY_DIAGNOSIS' });
    }

    return {
      claimId: claim.id,
      meta: {
        centerNodeId: `claim:${claim.id}`,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        note: 'Relasi graph sintetis dibentuk dari data klaim.'
      },
      nodes,
      edges
    };
  }
}

module.exports = GraphService;
