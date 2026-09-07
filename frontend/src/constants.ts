import { ExecutionPhase, LatencyTraceData, ModelOption } from './types';

export const STRICT_3B_MODELS: ModelOption[] = [
  {
    id: 'llama3.2-3b',
    displayName: 'Llama 3.2 3B',
    parameterCount: '3B',
    tier: 'reasoning',
  },
  {
    id: 'qwen2.5-3b',
    displayName: 'Qwen 2.5 3B',
    parameterCount: '3B',
    tier: 'reasoning',
  },
];

export const INITIAL_PHASES_IDLE: ExecutionPhase[] = [
  {
    id: 'phase-1',
    phaseNumber: 1,
    name: 'Phase 1: Query Router',
    latencyOrMetric: 'idle',
    status: 'pending',
    subtitle: 'Awaiting user query input',
  },
  {
    id: 'phase-2',
    phaseNumber: 2,
    name: 'Phase 2: Adaptive Decision',
    latencyOrMetric: 'idle',
    status: 'pending',
    subtitle: 'Evaluates ambiguity & retrieval need',
  },
  {
    id: 'phase-3',
    phaseNumber: 3,
    name: 'Phase 3: Vector Retrieval',
    latencyOrMetric: 'idle',
    status: 'pending',
    subtitle: 'Searches PostgreSQL pgvector collection',
  },
  {
    id: 'phase-4',
    phaseNumber: 4,
    name: 'Phase 4: Context & HyDE',
    latencyOrMetric: 'idle',
    status: 'pending',
    subtitle: 'Ranks & packs prompt context tokens',
  },
  {
    id: 'phase-5',
    phaseNumber: 5,
    name: 'Phase 5: LLM Synthesis',
    latencyOrMetric: 'idle',
    status: 'pending',
    subtitle: 'Synthesizes grounded technical answer',
  },
  {
    id: 'phase-6',
    phaseNumber: 6,
    name: 'Phase 6: Response Delivered',
    latencyOrMetric: 'idle',
    status: 'pending',
    subtitle: 'Target: generated tokens',
  },
];

export const INITIAL_LATENCY_TRACE_IDLE: LatencyTraceData = {
  totalFormatted: '0.00s TOTAL',
  retrievalMs: 0,
  retrievalPct: 0,
  reasoningMs: 0,
  reasoningPct: 0,
  routerMs: 0,
  routerPct: 0,
  traceId: '-',
  httpStatus: 'Ready',
  querySnippet: '',
};
