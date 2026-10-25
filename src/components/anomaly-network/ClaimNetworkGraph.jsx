import { Background, Controls, Handle, Position, ReactFlow, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, FileText } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import EmptyState from '../ui/EmptyState';
import NetworkLegend from './NetworkLegend';
import { relationshipTypes } from '../../mocks/anomalyNetwork';
import { statusLabels } from '../../utils/formatters';

function ClaimNode({ data }) {
  const tone = data.isSelected
    ? 'border-riskora-700 bg-riskora-700 text-white shadow-lg'
    : data.isConnected
      ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
      : data.needsReviewAttention
        ? 'border-amber-400 bg-amber-50 text-amber-950'
        : data.isDimmed ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-45' : 'border-slate-300 bg-white text-riskora-950';

  return (
    <div className={`min-w-[132px] rounded-xl border-2 px-3 py-2 transition ${tone}`} aria-label={`Klaim ${data.shortId}${data.needsReviewAttention ? ', perlu perhatian review' : ''}`}>
      <Handle type="target" position={Position.Left} className="!h-1 !w-1 !border-0 !bg-transparent" />
      <div className="flex items-center gap-2">
        <FileText size={14} className="shrink-0" />
        <div className="min-w-0"><p className="text-[11px] font-bold tabular-nums">{data.shortId}</p><p className={`mt-0.5 truncate text-[9px] ${data.isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>{data.statusLabel}</p></div>
        {data.needsReviewAttention && <AlertTriangle size={13} className={data.isSelected ? 'text-amber-200' : 'ml-auto text-amber-600'} aria-hidden="true" />}
      </div>
      <Handle type="source" position={Position.Right} className="!h-1 !w-1 !border-0 !bg-transparent" />
    </div>
  );
}

const nodeTypes = { claim: ClaimNode };

function ViewController({ resetKey, focusNodeId, nodeIds }) {
  const { fitView, setCenter, getNode } = useReactFlow();
  useEffect(() => {
    const timer = window.setTimeout(() => fitView({ padding: 0.16, duration: 450 }), 30);
    return () => window.clearTimeout(timer);
  }, [fitView, nodeIds, resetKey]);
  useEffect(() => {
    if (!focusNodeId) return;
    const node = getNode(focusNodeId);
    if (node) setCenter(node.position.x + 70, node.position.y + 28, { zoom: 1.35, duration: 500 });
  }, [focusNodeId, getNode, setCenter]);
  return null;
}

export default function ClaimNetworkGraph({ nodes, edges, selectedNodeId, selectedEdgeId, focusNodeId, resetKey, onSelectNode, onSelectEdge, onClearSelection }) {
  const connectedIds = useMemo(() => {
    if (!selectedNodeId) return new Set();
    return new Set(edges.flatMap((edge) => edge.source === selectedNodeId ? [edge.target] : edge.target === selectedNodeId ? [edge.source] : []));
  }, [edges, selectedNodeId]);

  const flowNodes = useMemo(() => nodes.map((node) => ({
    id: node.id,
    type: 'claim',
    position: node.position,
    data: {
      ...node,
      statusLabel: statusLabels[node.status] || node.status?.replaceAll('_', ' ') || 'Status tidak tersedia',
      isSelected: node.id === selectedNodeId,
      isConnected: connectedIds.has(node.id),
      isDimmed: Boolean(selectedNodeId) && node.id !== selectedNodeId && !connectedIds.has(node.id),
    },
  })), [connectedIds, nodes, selectedNodeId]);

  const flowEdges = useMemo(() => edges.map((edge, index) => {
    const isSelected = edge.id === selectedEdgeId;
    const relatedToSelection = !selectedNodeId || edge.source === selectedNodeId || edge.target === selectedNodeId;
    const color = relationshipTypes[edge.type]?.color || '#94A3B8';
    return {
      ...edge,
      type: 'smoothstep',
      pathOptions: { borderRadius: 14, offset: 18 + (index % 3) * 8 },
      style: { stroke: color, strokeWidth: isSelected ? 3 : 1.6, opacity: relatedToSelection ? 0.82 : 0.12 },
      label: isSelected ? edge.label : undefined,
      labelStyle: { fill: '#172B24', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.95 },
    };
  }), [edges, selectedEdgeId, selectedNodeId]);

  if (!nodes.length) return <div className="flex h-[560px] items-center justify-center bg-white"><EmptyState title="Tidak ada klaim yang sesuai" description="Ubah pencarian, jenis relasi, atau periode layanan untuk menampilkan jaringan." /></div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel">
      <div className="h-[560px] w-full sm:h-[620px]" aria-label="Graf interaktif hubungan antar-klaim">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => onSelectNode(node.id)}
          onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
          onPaneClick={onClearSelection}
          minZoom={0.35}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <ViewController resetKey={resetKey} focusNodeId={focusNodeId} nodeIds={flowNodes.map((node) => node.id).join(',')} />
          <Background color="#DCE6E0" gap={22} size={1} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>
      <NetworkLegend />
    </div>
  );
}
