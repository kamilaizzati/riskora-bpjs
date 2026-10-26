import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ClaimNetworkGraph from '../../components/anomaly-network/ClaimNetworkGraph';
import NetworkDetailPanel from '../../components/anomaly-network/NetworkDetailPanel';
import NetworkFilterPanel from '../../components/anomaly-network/NetworkFilterPanel';
import NetworkSummaryCards from '../../components/anomaly-network/NetworkSummaryCards';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import useAnomalyNetwork from '../../hooks/useAnomalyNetwork';
import { relationshipTypes } from '../../mocks/anomalyNetwork';

const allRelationshipTypes = Object.keys(relationshipTypes);
const initialFilters = { query: '', relationshipTypes: allRelationshipTypes, period: 'all' };

const periodFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function AnomalyNetworkPage() {
  const { nodes, edges, disclaimer, loading, error, retry } = useAnomalyNetwork();
  const [filters, setFilters] = useState(initialFilters);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const periods = useMemo(() => [...new Set(nodes.map((node) => node.period).filter(Boolean))].sort().map((period) => ({ value: period, label: periodFormatter.format(new Date(`${period}-01T00:00:00Z`)) })), [nodes]);

  const filtered = useMemo(() => {
    const periodNodes = nodes.filter((node) => filters.period === 'all' || node.period === filters.period);
    const periodNodeIds = new Set(periodNodes.map((node) => node.id));
    const filteredEdges = edges.filter((edge) => filters.relationshipTypes.includes(edge.type) && periodNodeIds.has(edge.source) && periodNodeIds.has(edge.target));
    const relationshipIsNarrowed = filters.relationshipTypes.length < allRelationshipTypes.length;
    const connectedIds = new Set(filteredEdges.flatMap((edge) => [edge.source, edge.target]));
    const visibleNodes = filters.relationshipTypes.length === 0
      ? []
      : periodNodes.filter((node) => !relationshipIsNarrowed || connectedIds.has(node.id));
    const needle = filters.query.trim().toLocaleLowerCase('id-ID');
    const matchedNodes = needle ? visibleNodes.filter((node) => [node.shortId, node.id, node.sepNumber].some((value) => value?.toLocaleLowerCase('id-ID').includes(needle))) : [];
    return { nodes: needle && !matchedNodes.length ? [] : visibleNodes, edges: needle && !matchedNodes.length ? [] : filteredEdges, focusNodeId: matchedNodes[0]?.id || null };
  }, [edges, filters, nodes]);

  useEffect(() => {
    if (selectedNodeId && !filtered.nodes.some((node) => node.id === selectedNodeId)) setSelectedNodeId(null);
    if (selectedEdgeId && !filtered.edges.some((edge) => edge.id === selectedEdgeId)) setSelectedEdgeId(null);
  }, [filtered.edges, filtered.nodes, selectedEdgeId, selectedNodeId]);

  const summary = useMemo(() => ({
    claims: filtered.nodes.length,
    relationships: filtered.edges.length,
    clusters: new Set(filtered.nodes.map((node) => node.clusterId).filter(Boolean)).size,
  }), [filtered.edges.length, filtered.nodes]);

  const selectedNode = filtered.nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedEdge = filtered.edges.find((edge) => edge.id === selectedEdgeId) || null;

  const selectNode = (nodeId) => { setSelectedNodeId(nodeId); setSelectedEdgeId(null); };
  const selectEdge = (edgeId) => { setSelectedEdgeId(edgeId); setSelectedNodeId(null); };
  const clearSelection = () => { setSelectedNodeId(null); setSelectedEdgeId(null); };
  const resetFilters = () => { setFilters(initialFilters); clearSelection(); setResetKey((key) => key + 1); };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div className="mx-auto max-w-[1700px] space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="font-heading text-2xl font-semibold tracking-tight text-riskora-950 sm:text-[28px]">Jaringan Anomali</h1><span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Data Simulasi</span></div><p className="mt-1 max-w-3xl text-sm text-muted">Jelajahi hubungan antar-klaim untuk mengidentifikasi pola yang memerlukan pemeriksaan lebih lanjut.</p></div>
        <button type="button" onClick={() => { clearSelection(); setResetKey((key) => key + 1); }} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3.5 text-xs font-semibold text-riskora-700 hover:border-riskora-700 hover:bg-riskora-50"><RotateCcw size={15} /> Reset Tampilan</button>
      </header>

      <NetworkSummaryCards summary={summary} />
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-900">{disclaimer || 'Relasi menampilkan kesamaan atribut yang memerlukan pemeriksaan lebih lanjut dan bukan kesimpulan fraud.'}</div>

      <section className="grid items-start gap-4 2xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <NetworkFilterPanel filters={filters} periods={periods} onChange={setFilters} onReset={resetFilters} />
        <ClaimNetworkGraph
          nodes={filtered.nodes}
          edges={filtered.edges}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          focusNodeId={filtered.focusNodeId}
          resetKey={resetKey}
          onSelectNode={selectNode}
          onSelectEdge={selectEdge}
          onClearSelection={clearSelection}
        />
        <NetworkDetailPanel selectedNode={selectedNode} selectedEdge={selectedEdge} nodes={filtered.nodes} edges={filtered.edges} onSelectNode={selectNode} />
      </section>
    </div>
  );
}
