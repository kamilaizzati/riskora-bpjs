import { Background, Controls, ReactFlow, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo } from 'react';
import EmptyState from '../ui/EmptyState';
import { entityTypes, relationshipTypes } from '../../mocks/anomalyNetwork';
import EntityNode from './EntityNode';
import NetworkLegend from './NetworkLegend';

const nodeTypes = { entity: EntityNode };

function ViewController({ focusIds, resetKey }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const timer = window.setTimeout(() => fitView({ nodes: focusIds.map((id) => ({ id })), padding: 0.32, duration: 550, maxZoom: 1.2 }), 40);
    return () => window.clearTimeout(timer);
  }, [fitView, focusIds, resetKey]);
  return null;
}

export default function InvestigationGraph({ nodes, edges, selectedNodeId, selectedEdgeId, selectedClusterId, expandedNodeId, simplified, resetKey, onNode, onEdge, onPane }) {
  const neighborIds = useMemo(() => new Set(edges.flatMap((edge) => edge.source === selectedNodeId ? [edge.target] : edge.target === selectedNodeId ? [edge.source] : [])), [edges, selectedNodeId]);
  const focusIds = useMemo(() => selectedClusterId ? nodes.filter((node) => node.clusterId === selectedClusterId).map((node) => node.id) : nodes.map((node) => node.id), [nodes, selectedClusterId]);
  const flowNodes = useMemo(() => nodes.map((node) => ({ id: node.id, type: 'entity', position: node.position, data: { ...node, entityTypeLabel: entityTypes[node.entityType]?.label, isSelected: node.id === selectedNodeId, isExpanded: node.id === expandedNodeId, isDimmed: Boolean(selectedClusterId && node.clusterId !== selectedClusterId) || Boolean(selectedNodeId && node.id !== selectedNodeId && !neighborIds.has(node.id)) } })), [expandedNodeId, neighborIds, nodes, selectedClusterId, selectedNodeId]);
  const flowEdges = useMemo(() => edges.map((edge) => { const selected = edge.id === selectedEdgeId; const investigationEdge = !['has_claim','references_episode','occurred_at','includes_procedure','references_document'].includes(edge.relationshipType); const dim = (selectedClusterId && edge.clusterId !== selectedClusterId) || (selectedNodeId && edge.source !== selectedNodeId && edge.target !== selectedNodeId); return { ...edge, type:'smoothstep', animated:selected && edge.reviewStatus === 'Requires Review', label:selected || (simplified && investigationEdge) ? edge.label : undefined, style:{ stroke:relationshipTypes[edge.relationshipType]?.color || '#94A3B8', strokeWidth:selected ? 4 : investigationEdge ? 3 : 1, opacity:dim ? .08 : investigationEdge ? .95 : .28 }, labelStyle:{fill:'#172B24',fontSize:10,fontWeight:700}, labelBgPadding:[6,4], labelBgBorderRadius:6, labelBgStyle:{fill:'#fff',fillOpacity:.97} }; }), [edges, selectedClusterId, selectedEdgeId, selectedNodeId, simplified]);
  if (!nodes.length) return <div className="flex h-[650px] items-center justify-center bg-white"><EmptyState title="Tidak ada entitas yang sesuai" description="Ubah pencarian atau filter untuk menampilkan jaringan." /></div>;
  return <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-panel"><div className="h-[650px] w-full" aria-label="Graf investigasi klaim interaktif"><ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} onNodeClick={(_,n)=>onNode(n.id)} onEdgeClick={(_,e)=>onEdge(e.id)} onPaneClick={onPane} nodesDraggable={false} nodesConnectable={false} minZoom={.3} maxZoom={2} proOptions={{hideAttribution:true}}><ViewController focusIds={focusIds} resetKey={resetKey} /><Background color="#DCE6E0" gap={24} size={1}/><Controls showInteractive={false} position="bottom-right"/></ReactFlow></div><NetworkLegend /></div>;
}
