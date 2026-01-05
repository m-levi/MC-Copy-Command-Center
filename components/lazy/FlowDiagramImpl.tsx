/**
 * Flow Diagram Implementation
 *
 * React Flow wrapper for email flow visualization
 */

'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface FlowStep {
  id: string;
  type: 'email' | 'delay' | 'condition' | 'action';
  title: string;
  description?: string;
  delay?: string;
  condition?: string;
}

interface FlowDiagramProps {
  steps: FlowStep[];
  onStepClick?: (step: FlowStep) => void;
  className?: string;
  interactive?: boolean;
}

// Custom node types
function EmailNode({ data }: { data: { label: string; description?: string } }) {
  return (
    <div className="px-4 py-3 bg-primary/10 border-2 border-primary rounded-lg min-w-[200px]">
      <div className="flex items-center gap-2">
        <span className="text-primary">📧</span>
        <span className="font-medium">{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
      )}
    </div>
  );
}

function DelayNode({ data }: { data: { label: string; delay?: string } }) {
  return (
    <div className="px-4 py-3 bg-amber-500/10 border-2 border-amber-500 rounded-lg min-w-[150px]">
      <div className="flex items-center gap-2">
        <span>⏱️</span>
        <span className="font-medium">{data.label}</span>
      </div>
      {data.delay && (
        <p className="text-xs text-muted-foreground mt-1">{data.delay}</p>
      )}
    </div>
  );
}

function ConditionNode({ data }: { data: { label: string; condition?: string } }) {
  return (
    <div className="px-4 py-3 bg-purple-500/10 border-2 border-purple-500 rounded-lg min-w-[180px]">
      <div className="flex items-center gap-2">
        <span>🔀</span>
        <span className="font-medium">{data.label}</span>
      </div>
      {data.condition && (
        <p className="text-xs text-muted-foreground mt-1">{data.condition}</p>
      )}
    </div>
  );
}

const nodeTypes = {
  email: EmailNode,
  delay: DelayNode,
  condition: ConditionNode,
};

export default function FlowDiagramImpl({
  steps,
  onStepClick,
  className,
  interactive = true,
}: FlowDiagramProps) {
  // Convert steps to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = steps.map((step, index) => ({
      id: step.id,
      type: step.type === 'action' ? 'email' : step.type,
      position: { x: 250, y: index * 150 },
      data: {
        label: step.title,
        description: step.description,
        delay: step.delay,
        condition: step.condition,
      },
    }));

    const edges: Edge[] = steps.slice(0, -1).map((step, index) => ({
      id: `e${step.id}-${steps[index + 1].id}`,
      source: step.id,
      target: steps[index + 1].id,
      type: 'smoothstep',
      animated: true,
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const step = steps.find((s) => s.id === node.id);
      if (step && onStepClick) {
        onStepClick(step);
      }
    },
    [steps, onStepClick]
  );

  return (
    <div className={`w-full h-[500px] ${className || ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={interactive ? onNodesChange : undefined}
        onEdgesChange={interactive ? onEdgesChange : undefined}
        onConnect={interactive ? onConnect : undefined}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
